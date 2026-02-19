
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch all approved loans to aggregate in JS (Supabase simpler than raw SQL for group by without RPC)
        const { data: loans, error } = await supabaseAdmin
            .from('loans')
            .select('amount, created_at')
            .eq('status', 'approved')
            .order('created_at', { ascending: true })

        if (error) throw error

        // Aggregate by Month
        const monthlyData: Record<string, { volume: number, revenue: number }> = {}

        loans.forEach(loan => {
            const date = new Date(loan.created_at)
            const monthKey = date.toLocaleString('default', { month: 'short' }); // "Jan", "Feb"

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { volume: 0, revenue: 0 }
            }

            monthlyData[monthKey].volume += loan.amount
            monthlyData[monthKey].revenue += (loan.amount * 0.25) // Est 25% interest
        })

        // Convert to Array
        const chartData = Object.keys(monthlyData).map(month => ({
            name: month,
            volume: monthlyData[month].volume,
            revenue: monthlyData[month].revenue
        }))

        // If no data, return empty array (Frontend can show "No Data" or empty chart)
        return NextResponse.json({ success: true, data: chartData })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
