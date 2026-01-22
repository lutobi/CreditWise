
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
            },
        }
    )

    // 1. Robust Auth Check (Headers + Cookies)
    let user = null;
    let role = '';

    // A. Keep existing cookie check
    const { data: { session: cookieSession } } = await supabase.auth.getSession();

    if (cookieSession) {
        user = cookieSession.user;
        role = user.app_metadata?.role || '';
    }

    // B. Fallback to Header Check
    if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            // We need a client that can verify the token. 
            // The 'supabase' client above is capable if we set the session, 
            // but easier to just getUser(token) using the anon client.
            const { data: { user: headerUser } } = await supabase.auth.getUser(token);
            if (headerUser) {
                user = headerUser;
                role = headerUser.app_metadata?.role || '';
            }
        }
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role !== 'admin' && role !== 'admin_verifier' && role !== 'admin_approver') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Aggregate Data (Use Service Role for Reliability)
    // adminDb prevents RLS issues on aggregate queries
    const { createClient } = await import('@supabase/supabase-js');
    const adminDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );


    try {
        const today = new Date().toISOString().split('T')[0]

        // Total Disbursed (Active 'approved' + Closed 'paid')
        const { data: disbursedData, error: disbursedError } = await adminDb
            .from('loans')
            .select('amount, status, amount_paid, duration_months')
            .in('status', ['approved', 'paid'])

        if (disbursedError) throw disbursedError

        const totalDisbursed = disbursedData.reduce((sum, loan) => sum + loan.amount, 0)
        const countDisbursed = disbursedData.length

        // Calculate Repayment Rate
        const paidLoans = disbursedData.filter(l => {
            if (l.status === 'paid') return true;
            // Calculate if paid off based on 25% interest model
            const totalRepayment = l.amount * (1 + 0.25 * l.duration_months);
            return (l.amount_paid || 0) >= totalRepayment;
        });
        const countPaid = paidLoans.length;
        // Rate = Paid / Total Disbursed (Simple metric: % of loans that have been fully repaid)
        // If countDisbursed is 0, rate is 100% (or 0%? Let's say 0 to be safe)
        const repaymentRate = countDisbursed > 0 ? (countPaid / countDisbursed) * 100 : 0;

        // Total Pending
        const { data: pendingData } = await adminDb
            .from('loans')
            .select('amount')
            .in('status', ['pending', 'under_review'])

        const totalPending = pendingData?.reduce((sum, loan) => sum + loan.amount, 0) || 0
        const countPending = pendingData?.length || 0

        // Today's Disbursement
        const { data: todayData } = await adminDb
            .from('loans')
            .select('amount')
            .eq('status', 'approved')
            .gte('created_at', `${today}T00:00:00`)

        const todayDisbursed = todayData?.reduce((sum, loan) => sum + loan.amount, 0) || 0

        // Fetch Budget Limit
        let totalLimit = 4500000;
        try {
            const { data: limitData } = await adminDb
                .from('app_settings')
                .select('value')
                .eq('key', 'total_lending_limit')
                .single();

            if (limitData) {
                // Handle potential string formatting if user inputs via DB strictly
                // Though input is typically number string.
                totalLimit = Number(limitData.value);
            }
        } catch (e) {
            // Use default
        }


        return NextResponse.json({
            success: true,
            data: {
                totalDisbursed,
                countDisbursed,
                totalPending,
                countPending,
                todayDisbursed,
                projectedInterest: totalDisbursed * 0.25, // Standard 25% for Payday
                totalLimit,
                repaymentRate // Dynamic Rate
            }
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
