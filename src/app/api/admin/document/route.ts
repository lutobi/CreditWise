
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/safe-logger';
import { validateCSRF } from '@/lib/csrf';
import { documentRequestSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/require-admin';

// Initialize Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

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

        // Extract path from full URL
        // Expected URL: https://[project].supabase.co/storage/v1/object/public/documents/[user_id]/[file]
        // or just the path if stored relatively? 
        // Based on ApplyPage, we store publicUrl.

        let path = url;
        if (url.startsWith('http')) {
            // Split by 'documents/' and get the rest
            const parts = url.split('/documents/')
            if (parts.length > 1) {
                path = parts[1]
            } else {
                // Try parsing URL to find path relative to bucket
                // This is a bit tricky if format varies. 
                // Let's assume standard Supabase storage URL format.
                return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
            }
        }

        // Generate Signed URL (valid for 1 hour)
        const { data, error } = await supabaseAdmin
            .storage
            .from('documents') // Assuming bucket name
            .createSignedUrl(path, 3600)

        if (error) throw error

        return NextResponse.json({ signedUrl: data.signedUrl })

    } catch (error: any) {
        logger.error('Error signing URL', { error: error.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
