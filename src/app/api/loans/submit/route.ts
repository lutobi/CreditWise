import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Auth Check
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Token' }, { status: 401 })
        }

        const formData = await req.json()

        // 2. Capture Metadata (IP & User Agent)
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown;';
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const clientUserAgent = formData.clientUserAgent || 'unknown'; // Optional backup from client

        const submissionMetadata = {
            ip_address: ip.split(',')[0].trim(), // Get first IP if multiple
            user_agent: userAgent,
            client_user_agent: clientUserAgent,
            signed_at: new Date().toISOString(),
            signature_name: formData.signatureName || 'Electronic Signature',
            consent_granted: true
        };

        // 3. Upsert Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            national_id: formData.nationalId,
            phone_number: formData.phone,
            updated_at: new Date().toISOString()
        })
        if (profileError) throw profileError;

        // 4. Upsert Verification
        const { error: verifError } = await supabase.from('verifications').upsert({
            user_id: user.id,
            employment_status: formData.employmentType,
            monthly_income: parseFloat(formData.monthlyIncome),
            employer_name: formData.employerName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        if (verifError) console.error('Verification Upsert Error (Non-blocking):', verifError);

        // 5. Create Loan
        // Ensure loanAmount is a number
        const amount = typeof formData.loanAmount === 'string' ? parseFloat(formData.loanAmount) : formData.loanAmount;

        // Generate Reference ID
        const refId = `OMR-${Math.floor(100000 + Math.random() * 900000)}`;

        // Combine form data with new metadata
        const applicationData = {
            ...formData,
            refId,
            submission_metadata: submissionMetadata
        };

        const { data: loan, error: loanError } = await supabase.from('loans').insert({
            user_id: user.id,
            amount: amount,
            duration_months: formData.repaymentPeriod,
            monthly_payment: amount / formData.repaymentPeriod,
            interest_rate: 5,
            purpose: formData.loanPurpose,
            status: 'pending',
            application_data: applicationData
        }).select().single()

        if (loanError) throw loanError;

        // 6. Notify Admin (Internal call to existing endpoint logic, or direct call)
        // We can just call the notify endpoint logic here or fire-and-forget fetch to it.
        // For simplicity and decoupling, we'll let the client or a separate process handle notification, 
        // BUT since we are server-side, we should ensure notification happens.
        // Let's do a fetch to our own notify endpoint to keep logic centralized.

        try {
            // Self-call to notify endpoint. Ideally this should be a direct function call if possible, 
            // but the notify route might be complex. Let's just replicate the notification logic or use the URL.
            // Using absolute URL requires knowing the host. 
            // Better to just inline the notification logic or import it?
            // "src/app/actions/email.ts" has sendAdminLoanAlert. Let's use that.

            const { sendAdminLoanAlert } = await import('@/app/actions/email');
            const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

            await sendAdminLoanAlert({
                amount: amount,
                duration: formData.repaymentPeriod,
                applicantName: profile?.full_name || 'Applicant',
                applicantEmail: user.email || 'no-email'
            });

        } catch (notifyError) {
            console.error('Notification failed:', notifyError);
            // Don't fail the request, just log
        }

        return NextResponse.json({ success: true, loanId: loan.id, refId });

    } catch (error: any) {
        console.error('Submit API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
