import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
        }

        // 2. DATA FETCH (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data: loans || [] });

    } catch (error: any) {
        console.error('Borrower History Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
