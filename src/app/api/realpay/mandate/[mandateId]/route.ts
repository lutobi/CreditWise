/**
 * Mandate Cancellation API Route
 * 
 * Cancels an active mandate (for early repayment or manual cancellation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';
import { realpayClient } from '@/lib/realpay-client';

export const dynamic = 'force-dynamic';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ mandateId: string }> }
) {
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json(
            { success: false, error: 'Realpay is not enabled' },
            { status: 503 }
        );
    }

    try {
        const { mandateId } = await params;

        // Auth check
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); }
                }
            }
        );

        const { data: { session } } = await authClient.auth.getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get mandate
        const { data: mandate, error: mandateError } = await supabase
            .from('realpay_mandates')
            .select('*, loans:loan_id (user_id)')
            .eq('id', mandateId)
            .single();

        if (mandateError || !mandate) {
            return NextResponse.json(
                { success: false, error: 'Mandate not found' },
                { status: 404 }
            );
        }

        // Check ownership or admin
        const role = session.user.user_metadata?.role;
        const isAdmin = role === 'admin' || role === 'super_admin';
        const isOwner = (mandate.loans as any)?.user_id === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access to mandate' },
                { status: 403 }
            );
        }

        // Check if mandate can be cancelled
        if (mandate.status === 'cancelled') {
            return NextResponse.json(
                { success: false, error: 'Mandate already cancelled' },
                { status: 400 }
            );
        }

        // Cancel with Realpay
        const result = await realpayClient.cancelMandate(mandate.mandate_reference);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: 'Failed to cancel mandate with Realpay' },
                { status: 500 }
            );
        }

        // Update database
        await supabase
            .from('realpay_mandates')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
            })
            .eq('id', mandateId);

        return NextResponse.json({
            success: true,
            status: 'cancelled',
            message: 'Mandate cancelled successfully. No further debits will occur.',
        });

    } catch (error: any) {
        console.error('[Mandate Cancel] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
