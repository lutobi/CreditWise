import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const status = searchParams.get('status')

        // 2. DATABASE OPERATION (Service Role - Bypasses RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Build Query
        let query = supabaseAdmin
            .from('loans')
            .select(`
                id,
                amount,
                duration_months,
                interest_rate,
                status,
                created_at,
                application_data,
                profiles:user_id (
                    full_name,
                    national_id
                )
            `)
            .order('created_at', { ascending: false })

        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) {
            // Ensure we cover the entire end day (until 23:59:59)
            // If it's just a date string (YYYY-MM-DD), append time.
            const endQuery = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
            query = query.lte('created_at', endQuery)
        }
        if (status && status !== 'all') query = query.eq('status', status)

        const { data: loans, error } = await query

        if (error) {
            console.error('Loan Book Query Error:', error);
            throw error;
        }

        // 3. Transform to CSV
        const headers = ['Reference ID', 'Date', 'Customer Name', 'National ID', 'Mobile', 'Amount (N$)', 'Term (Months)', 'Status', 'Purpose']
        const rows = loans.map((loan: any) => {
            const refId = loan.application_data?.refId || 'N/A'
            const date = new Date(loan.created_at).toISOString().split('T')[0]

            // Handle profile (could be array or object depending on PostgREST version/setup)
            let profile = loan.profiles;
            if (Array.isArray(profile)) profile = profile[0];

            const name = profile?.full_name || 'Unknown'
            const nid = profile?.national_id || 'N/A'
            const phone = profile?.phone || 'N/A'
            const amount = loan.amount
            const term = loan.duration_months
            const st = loan.status
            const purpose = loan.application_data?.loanPurpose || loan.purpose || 'N/A'

            return [refId, date, `"${name}"`, nid, phone, amount, term, st, `"${purpose}"`].join(',')
        })

        const csvContent = [headers.join(','), ...rows].join('\n')

        // 4. Return CSV Response
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="loan_book_${new Date().toISOString().split('T')[0]}.csv"`
            }
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
