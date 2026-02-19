import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendLoanDecisionEmail } from '@/app/actions/email';
import { requireAdmin } from '@/lib/require-admin';

// Force dynamic to prevent caching of admin actions
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    try {
        const { loanId, status, reason } = await req.json();

        if (!loanId || !status) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
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
                const emailResult = await sendRejectionEmail(emailUser, reason || 'Did not meet criteria');
                console.log("[StatusUpdate] Rejection Email Result:", emailResult);
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
