import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. AUTH CHECK
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() }
                }
            }
        );

        let { data: { session } } = await authClient.auth.getSession();

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

        // Relaxed Role Check
        const appRole = session?.user?.app_metadata?.role;
        const userRole = session?.user?.user_metadata?.role;
        const role = appRole || userRole;

        if (!session || (role !== 'admin' && role !== 'admin_approver' && role !== 'super_admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

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
            .order('created_at', { ascending: false });

        if (loansError) {
            console.error('Queue Fetch Error:', loansError);
            return NextResponse.json({ success: false, error: loansError.message }, { status: 500 });
        }

        if (!loans || loans.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Fetch Verifications for these users
        const userIds = loans.map(l => l.user_id);
        const { data: verifs, error: verifError } = await supabase
            .from('verifications')
            .select('*')
            .in('user_id', userIds)
            .eq('is_employed', true);

        if (verifError) {
            console.error('Verif Fetch Error:', verifError);
            return NextResponse.json({ success: false, error: verifError.message }, { status: 500 });
        }

        // Merge Logic
        const validVerifs = verifs || [];
        const verifiedLoans = loans.filter(l => validVerifs.some(v => v.user_id === l.user_id));

        const items = verifiedLoans.map(l => {
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
                monthly_income: v?.monthly_income || 0,
                employer_name: v?.employer_name || 'Unknown',
                credit_score: v?.credit_score || 0,
                verification_date: v?.updated_at || v?.created_at || '',
                reference_id: l.application_data?.refId || 'N/A'
            };
        });

        return NextResponse.json({ success: true, data: items });

    } catch (error: any) {
        console.error('Queue API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
