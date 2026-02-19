'use client';

/**
 * Payment Calendar Component
 * 
 * Shows upcoming debit order dates and payment history.
 */

import { useMemo } from 'react';
import { useRealpayFeatures } from '@/lib/realpay-hooks';

interface PaymentEvent {
    id: string;
    date: Date;
    amount: number;
    status: 'upcoming' | 'success' | 'failed' | 'pending';
    type: 'collection' | 'payout';
    description?: string;
}

interface PaymentCalendarProps {
    collectionDay: number;
    amount: number;
    startDate: Date | string;
    endDate: Date | string;
    transactions?: Array<{
        id: string;
        date: string;
        amount: number;
        status: string;
        type: string;
    }>;
}

export function PaymentCalendar({
    collectionDay,
    amount,
    startDate,
    endDate,
    transactions = [],
}: PaymentCalendarProps) {
    const { hasPaymentCalendar } = useRealpayFeatures();

    const events = useMemo(() => {
        const result: PaymentEvent[] = [];

        // Add past transactions
        transactions.forEach((t) => {
            result.push({
                id: t.id,
                date: new Date(t.date),
                amount: t.amount,
                status: t.status as PaymentEvent['status'],
                type: t.type as PaymentEvent['type'],
            });
        });

        // Generate upcoming collection dates
        const today = new Date();
        let current = new Date(today.getFullYear(), today.getMonth(), collectionDay);

        // If collection day already passed this month, start from next month
        if (current <= today) {
            current.setMonth(current.getMonth() + 1);
        }

        while (current <= endDate) {
            // Check if we already have a transaction for this date
            const hasTransaction = result.some(
                (e) => e.date.getMonth() === current.getMonth() &&
                    e.date.getFullYear() === current.getFullYear()
            );

            if (!hasTransaction) {
                result.push({
                    id: `upcoming-${current.toISOString()}`,
                    date: new Date(current),
                    amount,
                    status: 'upcoming',
                    type: 'collection',
                });
            }

            current.setMonth(current.getMonth() + 1);
        }

        // Sort by date
        return result.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [collectionDay, amount, endDate, transactions]);

    if (!hasPaymentCalendar) {
        return null;
    }

    const getStatusColor = (status: PaymentEvent['status']) => {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200';
            case 'failed': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'upcoming': return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusIcon = (status: PaymentEvent['status']) => {
        switch (status) {
            case 'success':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'pending':
                return (
                    <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                );
            case 'upcoming':
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NA', {
            style: 'currency',
            currency: 'NAD',
        }).format(amount);
    };

    // Find next upcoming payment
    const nextPayment = events.find((e) => e.status === 'upcoming');
    const daysUntilNext = nextPayment
        ? Math.ceil((nextPayment.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">Payment Schedule</h3>
                {nextPayment && (
                    <p className="text-purple-100 text-sm mt-1">
                        Next payment: {formatDate(nextPayment.date)} ({daysUntilNext} days)
                    </p>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                        {events.filter((e) => e.status === 'success').length}
                    </p>
                    <p className="text-xs text-gray-500">Paid</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                        {events.filter((e) => e.status === 'upcoming').length}
                    </p>
                    <p className="text-xs text-gray-500">Upcoming</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(amount)}
                    </p>
                    <p className="text-xs text-gray-500">Monthly</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="p-4 max-h-80 overflow-y-auto">
                <div className="space-y-3">
                    {events.map((event, index) => (
                        <div
                            key={event.id}
                            className={`
                flex items-center gap-4 p-3 rounded-lg border
                ${getStatusColor(event.status)}
              `}
                        >
                            <div className="flex-shrink-0">
                                {getStatusIcon(event.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {event.type === 'collection' ? 'Debit Order' : 'Payout'}
                                </p>
                                <p className="text-sm opacity-75">
                                    {formatDate(event.date)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{formatCurrency(event.amount)}</p>
                                <p className="text-xs capitalize">{event.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t text-center">
                <p className="text-xs text-gray-500">
                    Collection day: {collectionDay}th of each month
                </p>
            </div>
        </div>
    );
}
