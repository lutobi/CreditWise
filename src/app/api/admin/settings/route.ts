import { createClient } from "@supabase/supabase-js"; // Direct client for Service Role
import { NextResponse } from "next/server";
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    // 2. Data Access via Service Role (Bypasses RLS)
    const adminDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data, error } = await adminDb
            .from('app_settings')
            .select('value')
            .eq('key', 'total_lending_limit')
            .single();

        if (error) {
            console.error("Settings Fetch Error:", error.message);
            // Default if missing
            return NextResponse.json({ totalLimit: 4500000 });
        }

        return NextResponse.json({ totalLimit: Number(data.value) || 4500000 });
    } catch (error) {
        return NextResponse.json({ totalLimit: 4500000 });
    }
}

export async function POST(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { session } = auth;

    try {
        const body = await request.json();
        const { totalLimit } = body;

        if (!totalLimit) return NextResponse.json({ error: 'Missing value' }, { status: 400 });

        // 2. Database Write via Service Role (GOD MODE - Bypasses RLS)
        // This solves the user's issue with "Policies" failing.
        const adminDb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await adminDb
            .from('app_settings')
            .upsert({
                key: 'total_lending_limit',
                value: String(totalLimit),
                updated_by: session.user.id,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Settings Update Sudo Error:", error);

        // Force serialization of Error objects (which default to {})
        const safeError = {
            message: error?.message || "An unknown error occurred",
            code: error?.code || "UNKNOWN",
            details: error?.details || error?.hint || null,
            stack: error?.stack // helpful for local debug
        };

        return NextResponse.json({
            error: safeError.message,
            debug: safeError
        }, { status: 500 });
    }
}
