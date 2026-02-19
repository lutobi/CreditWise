'use client';

/**
 * Payment Status Banner
 * 
 * Shows failed payment notifications with retry options.
 */

import { useState, useEffect } from 'react';
import { useRealpayFeatures } from '@/lib/realpay-hooks';

interface FailedPayment {
    id: string;
    loanId: string;
    amount: number;
    failedAt: string;
    failureReason: string;
    nextRetryDate?: string;
    retryCount: number;
}

interface PaymentStatusBannerProps {
    userId: string;
    onDismiss?: () => void;
}

export function PaymentStatusBanner({ userId, onDismiss }: PaymentStatusBannerProps) {
    const { isEnabled } = useRealpayFeatures();
    const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!isEnabled) return;

        async function fetchFailedPayments() {
            try {
                const res = await fetch('/api/user/failed-payments');
                const data = await res.json();
                if (data.success && data.payments?.length > 0) {
                    setFailedPayments(data.payments);
                }
            } catch (err) {
                console.error('Failed to fetch payment status:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchFailedPayments();
    }, [isEnabled]);

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NA', {
            style: 'currency',
            currency: 'NAD',
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
        });
    };

    if (!isEnabled || loading || dismissed || failedPayments.length === 0) {
        return null;
    }

    const latestFailure = failedPayments[0];

    return (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Warning Icon */}
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Message */}
                    <div>
                        <p className="font-medium">
                            Payment of {formatCurrency(latestFailure.amount)} failed
                        </p>
                        <p className="text-sm text-red-100">
                            {latestFailure.failureReason || 'Insufficient funds'}
                            {latestFailure.nextRetryDate && (
                                <> • Next retry: {formatDate(latestFailure.nextRetryDate)}</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Action Button */}
                    <a
                        href="/dashboard?tab=payments"
                        className="px-4 py-1.5 bg-white text-red-600 rounded-lg text-sm font-medium 
                       hover:bg-red-50 transition-colors"
                    >
                        View Details
                    </a>

                    {/* Dismiss Button */}
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-red-400 rounded-lg transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Failed Payment Card
 * 
 * Detailed card showing failed payment info with retry option.
 */
interface FailedPaymentCardProps {
    payment: FailedPayment;
    onRetry?: () => void;
}

export function FailedPaymentCard({ payment, onRetry }: FailedPaymentCardProps) {
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await fetch('/api/user/request-retry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: payment.id }),
            });
            onRetry?.();
        } catch (err) {
            console.error('Retry request failed:', err);
        } finally {
            setRetrying(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NA', {
            style: 'currency',
            currency: 'NAD',
        }).format(amount);
    };

    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-red-900">Payment Failed</p>
                        <p className="text-sm text-red-700 mt-1">
                            {payment.failureReason || 'The payment could not be processed'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-red-600">
                            <span>Amount: {formatCurrency(payment.amount)}</span>
                            <span>Attempts: {payment.retryCount}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                     hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                    {retrying ? 'Requesting...' : 'Request Retry'}
                </button>
            </div>

            {payment.nextRetryDate && (
                <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-600">
                        <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Automatic retry scheduled for {new Date(payment.nextRetryDate).toLocaleDateString()}
                    </p>
                </div>
            )}
        </div>
    );
}
