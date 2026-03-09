import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const tab = searchParams.get('tab') || 'queue';
        const statusFilter = tab === 'queue' ? 'pending' : 'approved';

        // 2. FETCH DATA (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch Loans with Profiles
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*, profiles:user_id (full_name, national_id)')
            .eq('status', statusFilter)
            .eq('status', statusFilter)
            // .neq('payment_status', 'paid') // REMOVED: Filters out NULLs which are new loans
            .order('created_at', { ascending: false });

        if (loansError) {
            console.error('Queue Fetch Error:', loansError);
            return NextResponse.json({ success: false, error: loansError.message }, { status: 500 });
        }

        // Filter in memory to safely handle NULL payment_status
        const activeLoans = loans?.filter(l => l.payment_status !== 'paid') || [];

        if (activeLoans.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Fetch Verifications for these users
        const userIds = activeLoans.map(l => l.user_id);
        const { data: verifs, error: verifError } = await supabase
            .from('verifications')
            .select('*')
            .in('user_id', userIds);

        if (verifError) {
            console.error('Verif Fetch Error:', verifError);
            return NextResponse.json({ success: false, error: verifError.message }, { status: 500 });
        }

        // Merge Logic
        const validVerifs = verifs || [];

        // Filter: Keep only loans that are Verified (either via Verification table or Video Status)
        const readyForApproval = activeLoans.filter(l => {
            const v = validVerifs.find(ver => ver.user_id === l.user_id);
            const isEmployed = v?.is_employed === true;
            const isVideoVerified = l.application_data?.status_detail === 'video_verified';
            return isEmployed || isVideoVerified;
        });

        const items = readyForApproval.map(l => {
            const v = validVerifs.find(ver => ver.user_id === l.user_id);
            // @ts-ignore
            const profileName = l.profiles ? (Array.isArray(l.profiles) ? l.profiles[0]?.full_name : l.profiles.full_name) : 'Unknown';
            // @ts-ignore
            const profileId = l.profiles ? (Array.isArray(l.profiles) ? l.profiles[0]?.national_id : l.profiles.national_id) : 'N/A';

            return {
                loan_id: l.id,
                user_id: l.user_id,
                amount: l.amount,
                duration_months: l.duration_months,
                status: l.status,
                created_at: l.created_at,
                full_name: profileName || 'Unknown',
                national_id: profileId || 'N/A',
                // Fallback to application data if verification missing
                monthly_income: v?.monthly_income || l.application_data?.monthlyIncome || 0,
                employer_name: v?.employer_name || l.application_data?.employerName || 'Unknown',
                credit_score: v?.credit_score || 0,
                verification_date: v?.updated_at || v?.created_at || '',
                reference_id: l.application_data?.refId || 'N/A',
                // AI Audit Data
                ai_analysis: l.application_data?.verificationData || null,
                risk_flags: l.application_data?.riskFlags || l.risk_flags || []
            };
        });

        return NextResponse.json({ success: true, data: items });

    } catch (error: any) {
        console.error('Queue API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
