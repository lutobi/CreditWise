import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/safe-logger';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() }
                }
            }
        );

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, details } = await req.json();

        // Only allow specific actions from the client to prevent spam
        if (action !== 'LOGIN_SUCCESS' && action !== 'LOGIN_FAILURE' && action !== 'ADMIN_ACCESS') {
            return NextResponse.json({ error: 'Forbidden action' }, { status: 403 });
        }

        await logAudit('', action, details, session.user.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        logger.error('Auth Audit API Error', { error: error.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
