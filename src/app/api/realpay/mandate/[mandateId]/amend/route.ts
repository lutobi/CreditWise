/**
 * Mandate Amendment API Route
 * 
 * Allows modification of mandate amount for loan restructuring.
 * Used when a loan's repayment terms are updated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';
import { realpayClient } from '@/lib/realpay-client';

export const dynamic = 'force-dynamic';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ mandateId: string }> }
) {
    const { mandateId } = await params;

    if (!FEATURES.REALPAY_ENABLED || !FEATURES.REALPAY_DEBICHECK) {
        return NextResponse.json(
            { success: false, error: 'DebiCheck is not enabled' },
            { status: 503 }
        );
    }

    try {
        // Auth check - admin only for mandate amendments
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

        const role = session.user.user_metadata?.role;
        if (role !== 'admin' && role !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { newAmount, newCollectionDay, reason } = await req.json();

        if (!newAmount && !newCollectionDay) {
            return NextResponse.json(
                { success: false, error: 'At least one of newAmount or newCollectionDay is required' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get current mandate details
        const { data: mandate, error: fetchError } = await supabase
            .from('realpay_mandates')
            .select('*')
            .eq('id', mandateId)
            .single();

        if (fetchError || !mandate) {
            return NextResponse.json(
                { success: false, error: 'Mandate not found' },
                { status: 404 }
            );
        }

        if (mandate.status !== 'approved') {
            return NextResponse.json(
                { success: false, error: `Cannot amend mandate with status: ${mandate.status}` },
                { status: 400 }
            );
        }

        // Call Realpay to amend the mandate
        let amendResult;
        try {
            amendResult = await realpayClient.amendMandate(
                mandate.mandate_reference,
                {
                    amount: newAmount || mandate.amount,
                    collectionDay: newCollectionDay || mandate.collection_day,
                }
            );
        } catch (err: any) {
            return NextResponse.json(
                { success: false, error: err.message || 'Amendment failed' },
                { status: 400 }
            );
        }

        // Update local record
        const { data: updatedMandate, error: updateError } = await supabase
            .from('realpay_mandates')
            .update({
                amount: newAmount || mandate.amount,
                collection_day: newCollectionDay || mandate.collection_day,
                status: 'pending', // Needs re-approval
                last_amended_at: new Date().toISOString(),
                amendment_reason: reason,
                amended_by: session.user.id,
            })
            .eq('id', mandateId)
            .select()
            .single();

        if (updateError) {
            console.error('[Mandate Amendment] DB update error:', updateError);
        }

        return NextResponse.json({
            success: true,
            mandate: {
                id: updatedMandate?.id,
                status: 'pending',
                newAmount: newAmount || mandate.amount,
                newCollectionDay: newCollectionDay || mandate.collection_day,
                message: 'Amendment submitted. Customer must re-approve via banking app.',
            },
        });

    } catch (error: any) {
        console.error('[Mandate Amendment] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
