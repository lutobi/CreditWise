
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

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

        // Rejection Stats
        const { data: rejectedData } = await adminDb
            .from('loans')
            .select('application_data')
            .eq('status', 'rejected');

        const countRejected = rejectedData?.length || 0;
        const totalDecided = countDisbursed + countRejected;
        const rejectionRate = totalDecided > 0 ? (countRejected / totalDecided) * 100 : 0;

        // Top Reasons
        const reasonsMap: Record<string, number> = {};
        rejectedData?.forEach((l: any) => {
            const r = l.application_data?.rejection_reason || 'Other';
            reasonsMap[r] = (reasonsMap[r] || 0) + 1;
        });
        const topReasons = Object.entries(reasonsMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason, count]) => ({ reason, count }));

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
                repaymentRate, // Dynamic Rate
                rejectionRate,
                topReasons
            }
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
