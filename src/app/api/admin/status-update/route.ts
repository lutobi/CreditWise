import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendLoanDecisionEmail } from '@/app/actions/email';

// Force dynamic to prevent caching of admin actions
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { loanId, status, reason } = await req.json();

        if (!loanId || !status) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. AUTH CHECK (Security First)
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        // We don't need to set cookies here, just reading session
                    }
                }
            }
        );

        const { data: { session: cookieSession } } = await authClient.auth.getSession();
        let session = cookieSession;

        // FAILOVER: Check Authorization Header if cookie session failed
        if (!session && req.headers.get('Authorization')) {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.split(' ')[1];
            if (token) {
                const { data: { user }, error } = await authClient.auth.getUser(token);
                if (user && !error) {
                    // @ts-ignore - Construct a minimal session object
                    session = { user, access_token: token };
                }
            }
        }

        // Strict Admin Check (Allow app_metadata OR user_metadata)
        const appRole = session?.user?.app_metadata?.role;
        const userRole = session?.user?.user_metadata?.role;
        const role = appRole || userRole;

        if (!session || (role !== 'admin' && role !== 'admin_approver' && role !== 'super_admin')) {
            console.log(`[Auth Failed] User: ${session?.user?.id}, Role: ${role}`);
            return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
        }

        // 2. DATABASE OPERATION (Service Role - Bypasses RLS)
        // We use a separate client with the Service Role Key for the actual data modification
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Get current application_data first to preserve it
        const { data: currentLoans, error: fetchError1 } = await supabase
            .from('loans')
            .select('application_data')
            .eq('id', loanId)
            .limit(1);

        if (fetchError1) throw fetchError1;
        const currentLoan = currentLoans?.[0];
        const appData = currentLoan?.application_data || {};

        // 4. Update Loan Status & Reason in JSONB
        const { data: loans, error: updateError } = await supabase
            .from('loans')
            .update({
                status: status,
                application_data: {
                    ...appData,
                    rejection_reason: reason || null,
                    status_detail: status === 'approved' ? 'approved' : 'rejected',
                    decision_date: new Date().toISOString(),
                    decided_by: session.user.id // Good for audit
                }
            })
            .eq('id', loanId)
            .select('*, profiles(full_name)');

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        const loan = loans?.[0];

        if (!loan) {
            return NextResponse.json({ success: false, error: 'Loan not found or update failed' }, { status: 404 });
        }

        // 5. Fetch User Profile & Email
        const { data: fullLoans, error: fetchError } = await supabase
            .from('loans')
            .select('*, profiles:user_id (*)')
            .eq('id', loanId)
            .limit(1);

        const fullLoan = fullLoans?.[0];

        if (fetchError || !fullLoan) {
            console.error("Fetch full loan error:", fetchError);
            return NextResponse.json({ success: true, warning: "Status updated but failed to fetch details for email" });
        }

        const profile = fullLoan.profiles as any;
        const email = profile?.email || fullLoan.application_data?.email;
        const name = profile?.full_name || 'Valued Client';

        if (email) {
            const emailUser = { email, full_name: name };

            // 6. Send Email
            if (status === 'approved') {
                const { generateLoanAgreement } = await import('@/lib/pdf-generator');
                const { sendApprovalEmail } = await import('@/lib/email');

                // Generate PDF
                const pdfBuffer = await generateLoanAgreement(fullLoan, profile);

                // Send
                await sendApprovalEmail(emailUser, { id: fullLoan.id, amount: fullLoan.amount }, pdfBuffer);
            }
            else if (status === 'rejected') {
                const { sendRejectionEmail } = await import('@/lib/email');
                await sendRejectionEmail(emailUser, reason || 'Did not meet criteria');
            }
        }

        // 7. Audit Log
        const { logAudit } = await import('@/lib/audit');
        const action = status === 'approved' ? 'LOAN_APPROVED' : 'LOAN_REJECTED';
        await logAudit(loanId, action, { reason, amount: loan.amount }, session.user.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Status Update Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
