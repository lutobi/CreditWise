
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminLoanAlert } from '@/app/actions/email';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { loanId } = await req.json();

        if (!loanId) {
            return NextResponse.json({ success: false, error: 'Loan ID required' }, { status: 400 });
        }

        // 1. Fetch Loan Details
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            console.error("Loan fetch error", loanError);
            return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
        }

        // 2. Fetch User Profile for Name/Email
        // Note: 'auth.users' isn't directly queryable by public client usually. 
        // We rely on 'profiles' table having the info.
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', loan.user_id)
            .single();

        if (profileError) {
            console.error("Profile fetch error", profileError);
        }

        // Gather details
        // Note: For email, we might need to get it from the User Auth object if it's not in Profile.
        // Assuming profile has it or we pass it from frontend.
        // Let's assume Profile has it. If not, we might fall back to "User" string.

        // BETTER APPROACH: Use the 'application_data' JSONB column on the loan which has the snapshot!
        const appData = loan.application_data || {};
        const applicantName = `${appData.firstName} ${appData.lastName}` || profile?.full_name || 'Start Applicant';
        const applicantEmail = appData.email || 'nomad@example.com'; // Fallback

        // 3. Send Email
        const emailResult = await sendAdminLoanAlert({
            amount: loan.amount,
            duration: loan.duration_months,
            applicantName,
            applicantEmail
        });

        if (!emailResult.success) {
            console.error("Email send failed:", emailResult.error);
            // Return success anyway to not block the UI, but log it.
            return NextResponse.json({ success: true, warning: 'Email failed', details: emailResult.error });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Notification Route Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
