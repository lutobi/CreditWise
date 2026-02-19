/**
 * Early Repayment API Route
 * 
 * Handles early loan repayment requests from users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
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

        const { loanId, amount, cancelMandate } = await req.json();

        if (!loanId || !amount) {
            return NextResponse.json(
                { success: false, error: 'loanId and amount are required' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify loan belongs to user
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('id, user_id, status, amount')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        if (loan.user_id !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        if (loan.status === 'paid_off') {
            return NextResponse.json(
                { success: false, error: 'Loan is already paid off' },
                { status: 400 }
            );
        }

        // Record the early repayment request
        const { data: repaymentRequest, error: insertError } = await supabase
            .from('early_repayment_requests')
            .insert({
                loan_id: loanId,
                user_id: session.user.id,
                amount,
                cancel_mandate: cancelMandate || false,
                status: 'pending',
            })
            .select()
            .single();

        if (insertError) {
            // Table might not exist, try without it
            console.warn('early_repayment_requests table insert failed:', insertError);

            // Update loan status directly
            await supabase
                .from('loans')
                .update({
                    early_repayment_requested: true,
                    early_repayment_amount: amount,
                })
                .eq('id', loanId);
        }

        // TODO: Send notification to admin for manual verification

        return NextResponse.json({
            success: true,
            requestId: repaymentRequest?.id || null,
            message: 'Early repayment request submitted. We will verify receipt of funds and update your account.',
        });

    } catch (error: any) {
        console.error('[Early Repayment] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
