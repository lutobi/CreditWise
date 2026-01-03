
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export async function POST(request: Request) {
    // 1. Verify Admin Session
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
        return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user || user.app_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { url } = await request.json()
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

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
        console.error('Error signing URL:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
