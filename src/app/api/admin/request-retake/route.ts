
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendRetakeEmail } from '@/app/actions/email'
import { requireAdmin } from '@/lib/require-admin'

export async function POST(req: NextRequest) {
    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { loanId, reason, type } = await req.json()

        console.log(`[Retake Request] Processing for LoanID: '${loanId}', Type: ${type}`);

        if (!loanId) return NextResponse.json({ success: false, error: 'Loan ID required' }, { status: 400 })

        // 1. Get Loan Data (No Join needed for profiles if we use Auth API)
        const { data: loan, error: fetchError } = await supabase
            .from('loans')
            .select(`*`) // Select all fields, including user_id
            .eq('id', loanId.trim())
            .single()

        if (fetchError) {
            console.error("[Retake Request] Fetch Error:", fetchError);
        }

        if (fetchError || !loan) {
            return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 })
        }

        // 2. Fetch User Email from Auth Admin API using Service Role
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(loan.user_id);

        if (authError || !user || !user.email) {
            console.error("[Retake Request] Auth Fetch Error:", authError);
            return NextResponse.json({ success: false, error: 'User email not found' }, { status: 404 });
        }

        const userEmail = user.email;
        // User full name might be in metadata or profiles. Let's try metadata first.
        const userName = user.user_metadata?.full_name || "Borrower";

        // 3. Clear Documents based on Type & Save History
        const currentDocs = loan.documents || {};
        const newDocs = { ...currentDocs };

        let previousSelfieUrl = null;

        if (type === 'id') {
            newDocs.id_url = null;
        } else if (type === 'bank_statement') {
            newDocs.payslip_url = null;
        } else if (type === 'payslip') {
            newDocs.payslip_url = null; // Same field as bank_statement for now
        } else if (type === 'selfie') {
            previousSelfieUrl = currentDocs.selfie_url; // Capture before clearing
            newDocs.selfie_url = null;
        } else {
            // Default to selfie if not specified (backward compatibility) or both
            previousSelfieUrl = currentDocs.selfie_url;
            newDocs.selfie_url = null;
        }

        const { error: updateError } = await supabase
            .from('loans')
            .update({
                documents: newDocs,
                status: 'pending', // Valid statuses: pending, approved, rejected, paid
                application_data: {
                    ...(loan.application_data || {}), // PRESERVE EXISTING DATA: HR, Kin, etc.
                    retakeReason: reason || "Document quality issue", // Legacy support
                    retakeType: type || 'selfie', // Legacy support
                    status_detail: 'retake_requested',
                    previous_selfie_url: previousSelfieUrl,
                    // New: Multi-Document Request Tracking
                    requests: {
                        ...(loan.application_data?.requests || {}),
                        [type || 'selfie']: {
                            reason: reason || "Document quality issue",
                            status: 'pending',
                            requested_at: new Date().toISOString()
                        }
                    }
                }
            })
            .eq('id', loanId)
            .select() // Add select to confirm update

        if (updateError) {
            console.error("[Retake Request] Update Error:", updateError);
            throw updateError;
        }

        // 4. Send Email Notification
        await sendRetakeEmail(userEmail, userName, reason || "Document quality issue", type || 'selfie');
        console.log(`[Email Sent] To: ${userEmail} for type: ${type}`);

        // 4. Audit Log
        const { logAudit } = await import('@/lib/audit');
        // We don't have actorId easily here unless we pass it from client or decode token again.
        // For now, logging without actorId or 'system'.
        await logAudit(loanId, 'RETAKE_REQUESTED', { reason }, 'system');

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Retake Request API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
