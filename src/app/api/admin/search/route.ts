
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() }
            }
        }
    )

    // Check Admin Access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !['admin', 'admin_verifier', 'admin_approver'].includes(user.app_metadata?.role || '')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Search Profiles (Name, ID, Phone)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${query}%,national_id.ilike.%${query}%,phone_number.ilike.%${query}%`)
            .limit(10)

        // Search Loans (Reference ID) - Requires join to get name for display
        // Supabase PostgREST doesn't support easy OR across tables, so we do parallel queries.
        // Also check application_data->refId
        // Note: JSONB filtering `application_data->>refId.ilike.%query%`

        const { data: loans, error: loanError } = await supabase
            .from('loans')
            .select(`
                *,
                profiles (full_name, national_id)
            `)
            .or(`id.eq.${query},application_data->>refId.ilike.%${query}%`)
            .limit(10)

        const results = [
            ...(profiles || []).map(p => ({ type: 'profile', data: p })),
            ...(loans || []).map(l => ({ type: 'loan', data: l }))
        ]

        return NextResponse.json({ results })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
