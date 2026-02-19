
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

// No caching - real time
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    // 1. Service Role Client (Bypass RLS for system stats)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const start = Date.now();

        // Parallel Queries for Speed
        const [
            { count: pendingCount, error: pendingError },
            { count: verifiedCount, error: verifiedError },
            { count: approvedCount, error: approvedError },
            { count: rejectedCount, error: rejectedError },
            { data: dbCheck, error: dbError } // Latency Check
        ] = await Promise.all([
            // 1. Pending (Verification Queue)
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

            // 2. Verified (Approval Queue)
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),

            // 3. Approved (Success)
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'approved'),

            // 4. Rejected (Risk/Security)
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),

            // 5. DB Health Check (Single row fetch)
            supabase.from('app_settings').select('key').limit(1).single()
        ]);

        const latency = Date.now() - start;

        if (dbError && dbError.code !== 'PGRST116') { // Ignore "No rows" error for empty table
            throw dbError;
        }

        const totalProcessed = (approvedCount || 0) + (rejectedCount || 0);
        const rejectionRate = totalProcessed > 0 ? ((rejectedCount || 0) / totalProcessed) * 100 : 0;

        // Workload: Arbitrary "100" as max capacity for visual ring
        const totalPending = (pendingCount || 0) + (verifiedCount || 0);
        const workload = Math.min(100, (totalPending / 50) * 100); // 50 items = 100% load

        return NextResponse.json({
            success: true,
            data: {
                uptime: 100, // Service is responding
                latency,     // Server Load proxy
                workload,    // % of Capacity
                tasks: totalPending, // Raw count
                security: 100 - rejectionRate, // % Clean (non-rejected) OR just Rejection Rate
                securityLabel: `${rejectionRate.toFixed(0)}% Rejected`
            }
        });

    } catch (error: any) {
        console.error("Metrics Error:", error);
        return NextResponse.json({
            success: false,
            data: { uptime: 0, latency: 0, workload: 0, tasks: 0, security: 0 }
        }, { status: 500 });
    }
}
