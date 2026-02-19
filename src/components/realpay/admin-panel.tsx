'use client';

/**
 * Realpay Admin Dashboard Panel
 * 
 * Shows real-time analytics, transaction stats, and reconciliation data.
 */

import { useState, useEffect } from 'react';
import { useRealpayFeatures } from '@/lib/realpay-hooks';

interface AnalyticsData {
    range: number;
    mandates: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        cancelled: number;
        approvalRate: number;
        totalValue: number;
    };
    transactions: {
        collections: {
            total: number;
            success: number;
            failed: number;
            pending: number;
            successRate: number;
            totalAmount: number;
        };
        payouts: {
            total: number;
            success: number;
            failed: number;
            pending: number;
            successRate: number;
            totalAmount: number;
        };
    };
    dailyBreakdown: Array<{
        date: string;
        collections: number;
        payouts: number;
        mandates: number;
    }>;
    recentWebhooks: Array<{
        id: string;
        type: string;
        processed: boolean;
        createdAt: string;
    }>;
}

interface RealpayAdminPanelProps {
    className?: string;
}

export function RealpayAdminPanel({ className = '' }: RealpayAdminPanelProps) {
    const { isEnabled } = useRealpayFeatures();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState(30);

    useEffect(() => {
        if (!isEnabled) return;

        async function fetchAnalytics() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/realpay/analytics?range=${range}`);
                const data = await res.json();

                if (data.success) {
                    setAnalytics(data.analytics);
                } else {
                    setError(data.error);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [isEnabled, range]);

    if (!isEnabled) {
        return (
            <div className={`bg-gray-50 rounded-xl p-6 text-center ${className}`}>
                <p className="text-gray-500">Realpay integration is not enabled</p>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NA', {
            style: 'currency',
            currency: 'NAD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const StatCard = ({ title, value, subtitle, color = 'purple' }: {
        title: string;
        value: string | number;
        subtitle?: string;
        color?: 'purple' | 'green' | 'red' | 'blue' | 'yellow';
    }) => {
        const colors = {
            purple: 'bg-purple-50 border-purple-200 text-purple-700',
            green: 'bg-green-50 border-green-200 text-green-700',
            red: 'bg-red-50 border-red-200 text-red-700',
            blue: 'bg-blue-50 border-blue-200 text-blue-700',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        };

        return (
            <div className={`p-4 rounded-lg border ${colors[color]}`}>
                <p className="text-sm font-medium opacity-75">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
                {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
            </div>
        );
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Realpay Dashboard</h2>
                    <p className="text-purple-100 text-sm">Payment processing analytics</p>
                </div>
                <select
                    value={range}
                    onChange={(e) => setRange(parseInt(e.target.value))}
                    className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm border border-white/30"
                >
                    <option value={7} className="text-gray-900">Last 7 days</option>
                    <option value={30} className="text-gray-900">Last 30 days</option>
                    <option value={90} className="text-gray-900">Last 90 days</option>
                </select>
            </div>

            {loading && (
                <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading analytics...</p>
                </div>
            )}

            {error && (
                <div className="p-6 bg-red-50 border-b border-red-100">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {analytics && !loading && (
                <>
                    {/* Mandate Stats */}
                    <div className="p-6 border-b">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            DebiCheck Mandates
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Mandates"
                                value={analytics.mandates.total}
                                color="purple"
                            />
                            <StatCard
                                title="Approved"
                                value={analytics.mandates.approved}
                                subtitle={`${analytics.mandates.approvalRate}% approval rate`}
                                color="green"
                            />
                            <StatCard
                                title="Rejected"
                                value={analytics.mandates.rejected}
                                color="red"
                            />
                            <StatCard
                                title="Pending"
                                value={analytics.mandates.pending}
                                color="yellow"
                            />
                        </div>
                    </div>

                    {/* Transaction Stats */}
                    <div className="p-6 border-b">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            Collections
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Collected"
                                value={formatCurrency(analytics.transactions.collections.totalAmount)}
                                color="green"
                            />
                            <StatCard
                                title="Successful"
                                value={analytics.transactions.collections.success}
                                subtitle={`${analytics.transactions.collections.successRate}% success rate`}
                                color="green"
                            />
                            <StatCard
                                title="Failed"
                                value={analytics.transactions.collections.failed}
                                color="red"
                            />
                            <StatCard
                                title="Processing"
                                value={analytics.transactions.collections.pending}
                                color="blue"
                            />
                        </div>
                    </div>

                    {/* Payout Stats */}
                    <div className="p-6 border-b">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            Disbursements
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                title="Total Disbursed"
                                value={formatCurrency(analytics.transactions.payouts.totalAmount)}
                                color="blue"
                            />
                            <StatCard
                                title="Successful"
                                value={analytics.transactions.payouts.success}
                                subtitle={`${analytics.transactions.payouts.successRate}% success rate`}
                                color="green"
                            />
                            <StatCard
                                title="Failed"
                                value={analytics.transactions.payouts.failed}
                                color="red"
                            />
                            <StatCard
                                title="Processing"
                                value={analytics.transactions.payouts.pending}
                                color="yellow"
                            />
                        </div>
                    </div>

                    {/* Recent Webhooks */}
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            Recent Events
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {analytics.recentWebhooks?.length ? (
                                analytics.recentWebhooks.map((webhook) => (
                                    <div
                                        key={webhook.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${webhook.processed ? 'bg-green-500' : 'bg-yellow-500'
                                                }`} />
                                            <span className="font-mono text-sm">{webhook.type}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(webhook.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No recent events</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
