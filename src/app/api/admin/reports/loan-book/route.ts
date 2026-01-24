import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    // 1. Check Auth (Admin Only)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = session.user.app_metadata?.role
    if (role !== 'admin' && role !== 'admin_verifier' && role !== 'admin_approver') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
                    national_id,
                    email,
                    phone
                )
            `)
            .order('created_at', { ascending: false })

        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
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
