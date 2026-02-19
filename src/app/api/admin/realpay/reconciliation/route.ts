/**
 * Realpay Reconciliation API Route
 * 
 * Provides reconciliation data comparing Realpay records with loan records.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FEATURES } from '@/lib/feature-flags';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json(
            { success: false, error: 'Realpay is not enabled' },
            { status: 503 }
        );
    }

    // AUTH CHECK
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get all transactions for the date
        const startOfDay = `${date}T00:00:00.000Z`;
        const endOfDay = `${date}T23:59:59.999Z`;

        const { data: transactions } = await supabase
            .from('realpay_transactions')
            .select(`
        id, 
        loan_id, 
        type, 
        status, 
        amount, 
        realpay_ref,
        settled_at,
        failure_reason,
        created_at
      `)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: true });

        // Get corresponding loan data
        const loanIds = [...new Set(transactions?.map(t => t.loan_id) || [])];
        const { data: loans } = await supabase
            .from('loans')
            .select('id, status, amount')
            .in('id', loanIds);

        const loanMap = new Map(loans?.map(l => [l.id, l]) || []);

        // Get unprocessed webhooks
        const { data: unprocessedWebhooks } = await supabase
            .from('realpay_webhooks')
            .select('id, event_type, payload, created_at')
            .eq('processed', false)
            .order('created_at', { ascending: true });

        // Build reconciliation report
        const reconciliationItems = (transactions || []).map(t => {
            const loan = loanMap.get(t.loan_id);
            const issues: string[] = [];

            // Check for discrepancies
            if (t.type === 'payout' && t.status === 'success' && loan?.status !== 'disbursed') {
                issues.push('Loan not marked as disbursed');
            }

            if (t.type === 'collection' && t.status === 'success') {
                // TODO: Check if repayment was recorded
            }

            if (t.status === 'failed' && !t.failure_reason) {
                issues.push('Missing failure reason');
            }

            return {
                transactionId: t.id,
                loanId: t.loan_id,
                type: t.type,
                status: t.status,
                amount: t.amount,
                realpayRef: t.realpay_ref,
                settledAt: t.settled_at,
                failureReason: t.failure_reason,
                loanStatus: loan?.status,
                loanAmount: loan?.amount,
                issues,
                hasIssues: issues.length > 0,
            };
        });

        // Calculate summary
        const summary = {
            date,
            totalTransactions: transactions?.length || 0,
            successfulCollections: transactions?.filter(t => t.type === 'collection' && t.status === 'success').length || 0,
            failedCollections: transactions?.filter(t => t.type === 'collection' && t.status === 'failed').length || 0,
            successfulPayouts: transactions?.filter(t => t.type === 'payout' && t.status === 'success').length || 0,
            failedPayouts: transactions?.filter(t => t.type === 'payout' && t.status === 'failed').length || 0,
            totalCollected: transactions
                ?.filter(t => t.type === 'collection' && t.status === 'success')
                .reduce((sum, t) => sum + t.amount, 0) || 0,
            totalDisbursed: transactions
                ?.filter(t => t.type === 'payout' && t.status === 'success')
                .reduce((sum, t) => sum + t.amount, 0) || 0,
            itemsWithIssues: reconciliationItems.filter(i => i.hasIssues).length,
            unprocessedWebhooks: unprocessedWebhooks?.length || 0,
        };

        return NextResponse.json({
            success: true,
            reconciliation: {
                summary,
                items: reconciliationItems,
                unprocessedWebhooks: unprocessedWebhooks?.map(w => ({
                    id: w.id,
                    type: w.event_type,
                    createdAt: w.created_at,
                })),
            },
        });

    } catch (error: any) {
        console.error('[Realpay Reconciliation] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
