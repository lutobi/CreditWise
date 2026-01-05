import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/dashboard'

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        // Also handle code exchange if it's a code flow (older pattern but good to have)
        const code = searchParams.get('code')
        if (code) {
            await supabase.auth.exchangeCodeForSession(code)
        }

        if (!error) {
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // Fallback if no token hash but code exists (Implicit flow vs PKCE)
    // Standard Supabase Auth Helper pattern
    const code = searchParams.get('code')
    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
