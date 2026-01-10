
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendLoanDecisionEmail } from '@/app/actions/email';

export async function POST(req: NextRequest) {
    try {
        const { loanId, status, reason } = await req.json();

        if (!loanId || !status) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Update Loan Status
        const { data: loan, error: updateError } = await supabase
            .from('loans')
            .update({
                status: status,
                rejection_reason: reason || null, // Ensure column exists? I recall adding it to types.
                // If approved, maybe set approved_at?
                // approved_at: status === 'approved' ? new Date().toISOString() : null
            })
            .eq('id', loanId)
            .select('*, profiles(full_name)') // Join profile to get name? Or fetch separate.
            .single();

        if (updateError) {
            console.error("Update error:", updateError);
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        if (!loan) {
            return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
        }

        // 2. Fetch User Email (from Profiles or Auth)
        // Since we joined profiles(full_name), we have name.
        // We need email. Emails are in 'auth.users' usually, or replicated to profiles.
        // Let's check if 'profiles' has email. schema.sql said: profiles(id, full_name, national_id, phone...).
        // Usually Supabase auth emails aren't in public profiles unless synced.
        // BUT we have 'application_data' JSONB on the loan which definitely has the email!

        const appData = loan.application_data || {};
        // Fallback: Check if we have profile email synced.

        const email = appData.email || 'nomad@example.com';
        const name = appData.firstName || loan.profiles?.full_name || 'Customer';

        // 3. Send Decision Email
        await sendLoanDecisionEmail({
            email,
            name,
            status,
            amount: loan.amount,
            reason
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Status Update Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
