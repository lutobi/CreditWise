/**
 * Shared Admin Auth Guard
 * 
 * Centralised authentication + authorisation check for all admin API routes.
 * Extracts session from cookies (SSR) with Authorization header failover.
 * Returns { session, role } on success, or a 401 NextResponse on failure.
 * 
 * Usage:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { session, role } = auth;
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_ROLES = ['admin', 'admin_verifier', 'admin_approver', 'super_admin']

type AdminAuth = {
    session: { user: any; access_token: string }
    role: string
}

export async function requireAdmin(
    request?: NextRequest | Request
): Promise<AdminAuth | NextResponse> {
    try {
        let session: any = null;

        // 1. Try cookie-based session (SSR / same-origin navigation)
        try {
            const cookieStore = await cookies()
            const authClient = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() { return cookieStore.getAll() },
                        setAll() { /* read-only */ }
                    }
                }
            )
            const { data: { session: cookieSession } } = await authClient.auth.getSession()
            session = cookieSession
        } catch (e) {
            // cookies() can throw in some edge cases, that's fine — we'll try the header
        }

        // 2. Failover: Authorization header (client-side fetch with Bearer token)
        //    Uses the SERVICE ROLE key so getUser() always works reliably
        if (!session && request) {
            const authHeader = request.headers.get('Authorization')
            const token = authHeader?.split(' ')[1]

            if (token) {
                const serviceClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                )
                const { data: { user }, error } = await serviceClient.auth.getUser(token)
                if (user && !error) {
                    session = { user, access_token: token }
                }
            }
        }

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized — no active session' },
                { status: 401 }
            )
        }

        // 3. Role check (app_metadata takes priority, user_metadata as fallback)
        const appRole = session.user?.app_metadata?.role
        const userRole = session.user?.user_metadata?.role
        const role = appRole || userRole || ''

        if (!ALLOWED_ROLES.includes(role)) {
            console.error(`[Auth] Denied: user ${session.user.id}, role '${role}'`)
            return NextResponse.json(
                { success: false, error: `Unauthorized — role '${role || 'none'}' not permitted` },
                { status: 401 }
            )
        }

        return { session, role }
    } catch (error: any) {
        console.error('[Auth] requireAdmin error:', error)
        return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 401 }
        )
    }
}
