
import { createClient } from '@supabase/supabase-js'

type AuditAction =
    | 'VERIFICATION_PASSED'
    | 'RETAKE_REQUESTED'
    | 'LOAN_APPROVED'
    | 'LOAN_REJECTED'
    | 'PAYMENT_RECEIVED'
    | 'LOAN_PAID'
    | 'SYSTEM_ERROR'
    | 'HR_VERIFICATION_EMAIL_SENT'
    | 'LOAN_SUBMITTED'
    | 'ADMIN_ACCESS'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'DATA_EXPORT'
    | 'MANDATE_CREATED'
    | 'PAYOUT_INITIATED'
    | 'CSRF_FAILURE'
    | 'RATE_LIMIT_EXCEEDED'

export async function logAudit(loanId: string, action: AuditAction, details: any = {}, actorId?: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        console.log(`[AUDIT] ${action} for Loan ${loanId}`, details);

        // Attempt to insert into DB
        const { error } = await supabase.from('audit_logs').insert({
            loan_id: loanId,
            action,
            actor_id: actorId, // Nullable
            details
        });

        if (error) {
            // If table doesn't exist, this will error. code: '42P01' (undefined_table)
            if (error.code === '42P01') {
                console.warn("Audit table missing. Run migration.");
            } else {
                console.error("Audit Log Insert Error:", error);
            }
        }
    } catch (e) {
        // Prevent crashing main flow
        console.error("Audit Log Exception:", e);
    }
}
