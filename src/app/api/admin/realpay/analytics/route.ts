/**
 * Realpay Admin Analytics API Route
 * 
 * Provides analytics data for the admin dashboard.
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
        const range = searchParams.get('range') || '30'; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(range));

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch mandate stats
        const { data: mandates } = await supabase
            .from('realpay_mandates')
            .select('id, status, amount, created_at')
            .gte('created_at', startDate.toISOString());

        // Fetch transaction stats
        const { data: transactions } = await supabase
            .from('realpay_transactions')
            .select('id, type, status, amount, created_at')
            .gte('created_at', startDate.toISOString());

        // Fetch recent webhooks
        const { data: recentWebhooks } = await supabase
            .from('realpay_webhooks')
            .select('id, event_type, processed, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        // Calculate mandate stats
        const mandateStats = {
            total: mandates?.length || 0,
            pending: mandates?.filter(m => m.status === 'pending').length || 0,
            approved: mandates?.filter(m => m.status === 'approved').length || 0,
            rejected: mandates?.filter(m => m.status === 'rejected').length || 0,
            cancelled: mandates?.filter(m => m.status === 'cancelled').length || 0,
            approvalRate: 0,
            totalValue: mandates?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0,
        };

        if (mandateStats.approved + mandateStats.rejected > 0) {
            mandateStats.approvalRate = Math.round(
                (mandateStats.approved / (mandateStats.approved + mandateStats.rejected)) * 100
            );
        }

        // Calculate transaction stats
        const collections = transactions?.filter(t => t.type === 'collection') || [];
        const payouts = transactions?.filter(t => t.type === 'payout') || [];

        const transactionStats = {
            collections: {
                total: collections.length,
                success: collections.filter(t => t.status === 'success').length,
                failed: collections.filter(t => t.status === 'failed').length,
                pending: collections.filter(t => t.status === 'pending' || t.status === 'processing').length,
                successRate: 0,
                totalAmount: collections.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0),
            },
            payouts: {
                total: payouts.length,
                success: payouts.filter(t => t.status === 'success').length,
                failed: payouts.filter(t => t.status === 'failed').length,
                pending: payouts.filter(t => t.status === 'pending' || t.status === 'processing').length,
                successRate: 0,
                totalAmount: payouts.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0),
            },
        };

        if (transactionStats.collections.success + transactionStats.collections.failed > 0) {
            transactionStats.collections.successRate = Math.round(
                (transactionStats.collections.success /
                    (transactionStats.collections.success + transactionStats.collections.failed)) * 100
            );
        }

        if (transactionStats.payouts.success + transactionStats.payouts.failed > 0) {
            transactionStats.payouts.successRate = Math.round(
                (transactionStats.payouts.success /
                    (transactionStats.payouts.success + transactionStats.payouts.failed)) * 100
            );
        }

        // Daily breakdown for charts
        const dailyStats: Record<string, { date: string; collections: number; payouts: number; mandates: number }> = {};

        for (let i = 0; i < parseInt(range); i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyStats[dateKey] = { date: dateKey, collections: 0, payouts: 0, mandates: 0 };
        }

        transactions?.forEach(t => {
            const dateKey = t.created_at.split('T')[0];
            if (dailyStats[dateKey]) {
                if (t.type === 'collection' && t.status === 'success') {
                    dailyStats[dateKey].collections += t.amount;
                } else if (t.type === 'payout' && t.status === 'success') {
                    dailyStats[dateKey].payouts += t.amount;
                }
            }
        });

        mandates?.forEach(m => {
            const dateKey = m.created_at.split('T')[0];
            if (dailyStats[dateKey]) {
                dailyStats[dateKey].mandates++;
            }
        });

        return NextResponse.json({
            success: true,
            analytics: {
                range: parseInt(range),
                mandates: mandateStats,
                transactions: transactionStats,
                dailyBreakdown: Object.values(dailyStats).reverse(),
                recentWebhooks: recentWebhooks?.map(w => ({
                    id: w.id,
                    type: w.event_type,
                    processed: w.processed,
                    createdAt: w.created_at,
                })),
            },
        });

    } catch (error: any) {
        console.error('[Realpay Analytics] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
