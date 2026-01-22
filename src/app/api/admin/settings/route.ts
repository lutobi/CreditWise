
import { createClient } from "@supabase/supabase-js"; // Direct client for Service Role
import { createClient as createAuthClient } from "@/lib/supabase/server"; // Auth client for permission check
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createAuthClient();

    // 1. Strict Auth Check (Read-Only is fine with standard client usually, but let's use Service to be safe)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const authClient = await createAuthClient();

    // 1. Strict Authorization Check
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    const role = user?.app_metadata?.role || '';

    // DEBUG: Log Headers to see if cookies exist
    const headersList = Object.fromEntries(request.headers.entries());
    console.log("Budget Update Headers Debug:", {
        cookie: headersList['cookie'] ? 'Present' : 'Missing',
        authHeader: headersList['authorization'] ? 'Present' : 'Missing'
    });

    // Fallback logic follows...

    // Fallback: If cookie auth failed, try Authorization Header
    let finalUser = user;
    let finalRole = role;
    let finalAuthError = authError;

    if (!finalUser) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            console.log("Budget Update: Falling back to Auth Header...");
            const token = authHeader.replace('Bearer ', '');
            const { data: { user: headerUser }, error: headerError } = await authClient.auth.getUser(token);

            if (headerUser) {
                finalUser = headerUser;
                finalRole = headerUser.app_metadata?.role || '';
                finalAuthError = null;
                console.log("Budget Update: Auth Header Success! Role:", finalRole);
            } else {
                console.warn("Budget Update: Auth Header Failed:", headerError?.message);
            }
        }
    }

    console.log("Budget Update Final Auth Debug:", {
        userId: finalUser?.id,
        role: finalRole,
        originalError: authError?.message
    });

    // Check Role
    if (!finalUser || (!finalRole.startsWith('admin') && finalRole !== 'super_admin')) {
        console.warn("Budget Update Unauthorized. Role:", finalRole);

        // RETURN 200 to ensure Client receives the Debug Body
        // Frontend will check 'success' flag
        return NextResponse.json({
            success: false,
            error: `Unauthorized (Server sees role: '${finalRole}')`,
            debug: { role: finalRole, uid: finalUser?.id, authError: finalAuthError?.message, cookies: headersList['cookie'] ? 'Yes' : 'No' }
        }, { status: 200 }); // Intentional 200
    }

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
                updated_by: finalUser.id,
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
