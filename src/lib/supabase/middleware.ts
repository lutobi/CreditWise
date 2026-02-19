import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    const isInsecureTest = process.env.TEST_INSECURE_COOKIES === 'true';
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            secure: isInsecureTest ? false : options.secure,
                        })
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // SESSION BINDING: Protect against session hijacking
    // If user is logged in, bind session to IP and User Agent
    if (user) {
        const ua = request.headers.get('user-agent') || 'unknown';
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            '0.0.0.0';
        const fingerprint = Buffer.from(`${ua}:${ip}`).toString('base64');

        const existingFingerprint = request.cookies.get('__sb_fpt')?.value;

        // Skip strict fingerprinting if mock auth is allowed (for E2E testing stability)
        // BUT never skip in production — treat ALLOW_MOCK_AUTH as no-op in prod
        const isMockAuthAllowed = process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH === 'true'
            && process.env.NODE_ENV !== 'production';

        if (isMockAuthAllowed && process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH === 'true') {
            console.warn('[SECURITY] Mock auth enabled — session fingerprinting relaxed. Do NOT deploy to production with NEXT_PUBLIC_ALLOW_MOCK_AUTH=true');
        }

        if (!existingFingerprint) {
            // First time or session just started - set the fingerprint
            response.cookies.set('__sb_fpt', fingerprint, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24, // 24 hours
            });
        } else if (existingFingerprint !== fingerprint && !isMockAuthAllowed) {
            // Fingerprint mismatch! Potential session hijacking.
            console.warn(`[SECURITY] Session fingerprint mismatch for user ${user.id}. Possible hijacking attempt.`);

            // Log the event (proactively)
            // Note: logAudit is async and we don't await it to avoid blocking middleware
            import('@/lib/audit').then(({ logAudit }) => {
                logAudit('', 'SYSTEM_ERROR', {
                    message: 'Session fingerprint mismatch',
                    userId: user.id,
                    oldFp: existingFingerprint,
                    newFp: fingerprint
                });
            });

            // Sign out the user and clear cookies
            await supabase.auth.signOut();
            const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
            redirectResponse.cookies.delete('__sb_fpt');
            return redirectResponse;
        }
    }

    return response
}
