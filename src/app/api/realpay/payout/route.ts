/**
 * Instant Payout (Disbursement) API Route
 * 
 * Disburses approved loan amount to the borrower's bank account.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';
import { realpayClient } from '@/lib/realpay-client';
import { logger } from '@/lib/safe-logger';
import { validateCSRF } from '@/lib/csrf';
import { realpayPayoutSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 0. CSRF Protection
    const csrf = await validateCSRF(req);
    if (!csrf.valid) {
        return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
    }

    // Check if payouts are enabled
    // Check if payouts are enabled
    if (!FEATURES.REALPAY_PAYOUT) {
        return NextResponse.json(
            { success: false, error: 'Payouts are not enabled' },
            { status: 503 }
        );
    }

    try {
        // Auth check - admin only
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

        // Check admin role
        const role = session.user.user_metadata?.role;
        if (role !== 'admin' && role !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: 'Admin access required' },
                { status: 403 }
            );
        }

        const rawBody = await req.json();
        const validation = realpayPayoutSchema.safeParse(rawBody);

        if (!validation.success) {
            logger.warn('Payout validation failed', { issues: validation.error.issues });
            return NextResponse.json({
                success: false,
                error: 'Invalid request data',
                details: validation.error.issues
            }, { status: 400 });
        }

        const {
            loanId,
            bankCode,
            accountNumber,
            accountHolderName
        } = validation.data;

        // Service role Supabase for database operations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get loan details
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('id, user_id, status, amount, profiles:user_id (full_name, national_id)')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        // Verify loan is approved
        if (loan.status !== 'approved') {
            return NextResponse.json(
                { success: false, error: `Cannot disburse loan with status: ${loan.status}` },
                { status: 400 }
            );
        }

        // Check if already disbursed
        const { data: existingPayout } = await supabase
            .from('realpay_transactions')
            .select('id, status')
            .eq('loan_id', loanId)
            .eq('type', 'payout')
            .in('status', ['processing', 'success'])
            .single();

        if (existingPayout) {
            return NextResponse.json(
                { success: false, error: 'Payout already initiated for this loan', transactionId: existingPayout.id },
                { status: 409 }
            );
        }

        // Get mandate for account details (if no account details provided)
        let payoutAccountDetails = {
            bankCode,
            accountNumber,
            accountHolderName,
        };

        if (!bankCode || !accountNumber) {
            const { data: mandate } = await supabase
                .from('realpay_mandates')
                .select('bank_code')
                .eq('loan_id', loanId)
                .eq('status', 'approved')
                .single();

            if (!mandate) {
                return NextResponse.json(
                    { success: false, error: 'No approved mandate found. Provide bank details manually.' },
                    { status: 400 }
                );
            }

            // Note: In production, you'd fetch full account details from a secure vault
            payoutAccountDetails.bankCode = mandate.bank_code;
        }

        // Create payout with Realpay
        const result = await realpayClient.createPayout({
            loanId,
            amount: loan.amount,
            accountDetails: {
                bankCode: payoutAccountDetails.bankCode || '',
                accountNumber: payoutAccountDetails.accountNumber || '', // Would come from secure storage
                accountHolderName: payoutAccountDetails.accountHolderName || (loan.profiles as any)?.full_name || '',
            },
            reference: `LOAN-${loanId.substring(0, 8)}`,
        });

        if (!result.success || !result.transactionRef) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to create payout' },
                { status: 500 }
            );
        }

        // Store transaction in database
        const { data: transaction, error: insertError } = await supabase
            .from('realpay_transactions')
            .insert({
                loan_id: loanId,
                type: 'payout',
                amount: loan.amount,
                status: 'processing',
                realpay_ref: result.transactionRef,
            })
            .select()
            .single();

        if (insertError) {
            logger.error('[Payout] DB insert error', { error: insertError, loanId });
        }

        // Update loan status to disbursing
        await supabase
            .from('loans')
            .update({ status: 'disbursing' })
            .eq('id', loanId);

        // Log success audit
        await logAudit(loanId, 'PAYOUT_INITIATED', {
            transactionId: transaction?.id,
            amount: loan.amount,
            estimatedArrival: result.estimatedArrival
        }, session.user.id);

        return NextResponse.json({
            success: true,
            transactionId: transaction?.id,
            transactionRef: result.transactionRef,
            status: 'processing',
            estimatedArrival: result.estimatedArrival,
            message: 'Payout initiated. Funds will arrive shortly.',
        });

    } catch (error: any) {
        logger.error('[Payout] Error', { error: error.message });
        return NextResponse.json(
            { success: false, error: 'Failed to initiate payout' },
            { status: 500 }
        );
    }
}

// Get payout status
export async function GET(req: NextRequest) {
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json(
            { success: false, error: 'Realpay is not enabled' },
            { status: 503 }
        );
    }

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

        const { searchParams } = new URL(req.url);
        const loanId = searchParams.get('loanId');

        if (!loanId) {
            return NextResponse.json(
                { success: false, error: 'loanId required' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: transaction, error } = await supabase
            .from('realpay_transactions')
            .select('*')
            .eq('loan_id', loanId)
            .eq('type', 'payout')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !transaction) {
            return NextResponse.json(
                { success: false, error: 'Payout not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            payout: {
                id: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                settledAt: transaction.settled_at,
                failureReason: transaction.failure_reason,
                createdAt: transaction.created_at,
            },
        });

    } catch (error: any) {
        logger.error('[Payout Status] Error', { error: error.message });
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve payout status' },
            { status: 500 }
        );
    }
}
