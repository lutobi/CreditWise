
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/safe-logger';
import { validateCSRF } from '@/lib/csrf';
import { documentRequestSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
    // 0. CSRF Protection
    const csrf = await validateCSRF(request);
    if (!csrf.valid) {
        return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
    }

    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const rawBody = await request.json();
        const validation = documentRequestSchema.safeParse(rawBody);

        if (!validation.success) {
            logger.warn('Document request validation failed', { issues: validation.error.issues });
            return NextResponse.json({
                error: 'Invalid request data',
                details: validation.error.issues
            }, { status: 400 });
        }

        const { url } = validation.data;

        let path = url;
        if (url.startsWith('http')) {
            const parts = url.split('/documents/')
            if (parts.length > 1) {
                path = parts[1]
            } else {
                return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
            }
        }

        // Generate Signed URL (valid for 1 hour)
        const { data, error } = await supabaseAdmin
            .storage
            .from('documents')
            .createSignedUrl(path, 3600)

        if (error) throw error

        return NextResponse.json({ signedUrl: data.signedUrl })

    } catch (error: any) {
        logger.error('Error signing URL', { error: error.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
