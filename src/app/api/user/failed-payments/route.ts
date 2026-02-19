/**
 * User Failed Payments API Route
 * 
 * Returns failed payment notifications for the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json({ success: true, payments: [] });
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

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get user's loans
        const { data: loans } = await supabase
            .from('loans')
            .select('id')
            .eq('user_id', session.user.id);

        if (!loans || loans.length === 0) {
            return NextResponse.json({ success: true, payments: [] });
        }

        const loanIds = loans.map(l => l.id);

        // Get failed transactions from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: failedTransactions } = await supabase
            .from('realpay_transactions')
            .select('id, loan_id, amount, status, failure_code, failure_reason, next_retry_at, created_at')
            .in('loan_id', loanIds)
            .eq('type', 'collection')
            .eq('status', 'failed')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

        // Get retry count for each loan
        const paymentsWithRetryCount = await Promise.all(
            (failedTransactions || []).map(async (t) => {
                const { count } = await supabase
                    .from('realpay_transactions')
                    .select('id', { count: 'exact', head: true })
                    .eq('loan_id', t.loan_id)
                    .eq('type', 'collection')
                    .eq('status', 'failed');

                return {
                    id: t.id,
                    loanId: t.loan_id,
                    amount: t.amount,
                    failedAt: t.created_at,
                    failureReason: t.failure_reason || getFailureMessage(t.failure_code),
                    nextRetryDate: t.next_retry_at,
                    retryCount: count || 1,
                };
            })
        );

        return NextResponse.json({
            success: true,
            payments: paymentsWithRetryCount,
        });

    } catch (error: any) {
        console.error('[Failed Payments] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

function getFailureMessage(code: string | null): string {
    const messages: Record<string, string> = {
        'INSUFFICIENT_FUNDS': 'Insufficient funds in account',
        'ACCOUNT_CLOSED': 'Bank account is closed',
        'INVALID_ACCOUNT': 'Account details are invalid',
        'MANDATE_NOT_ACTIVE': 'Debit order authorization is not active',
        'LIMIT_EXCEEDED': 'Daily transaction limit exceeded',
        'BANK_DECLINED': 'Transaction declined by bank',
        'TECHNICAL_ERROR': 'Technical error during processing',
    };

    return messages[code || ''] || 'Payment could not be processed';
}
