'use client';

/**
 * Early Repayment Component
 * 
 * Allows users to make a manual payment and optionally cancel their mandate
 * when paying off their loan early.
 */

import { useState } from 'react';
import { useRealpayFeatures } from '@/lib/realpay-hooks';

interface EarlyRepaymentProps {
    loanId: string;
    remainingBalance: number;
    mandateId?: string;
    onPaymentComplete?: (success: boolean) => void;
}

type Step = 'confirm' | 'processing' | 'success' | 'error';

export function EarlyRepayment({
    loanId,
    remainingBalance,
    mandateId,
    onPaymentComplete,
}: EarlyRepaymentProps) {
    const { isEnabled } = useRealpayFeatures();
    const [step, setStep] = useState<Step>('confirm');
    const [cancelMandate, setCancelMandate] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NA', {
            style: 'currency',
            currency: 'NAD',
        }).format(amount);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setStep('processing');

        try {
            // Submit early repayment request
            const paymentRes = await fetch('/api/loans/early-repayment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loanId,
                    amount: remainingBalance,
                    cancelMandate,
                }),
            });

            const paymentData = await paymentRes.json();

            if (!paymentData.success) {
                throw new Error(paymentData.error || 'Payment failed');
            }

            // If cancel mandate was requested and we have a mandate ID
            if (cancelMandate && mandateId) {
                const cancelRes = await fetch(`/api/realpay/mandate/${mandateId}`, {
                    method: 'DELETE',
                });

                const cancelData = await cancelRes.json();

                if (!cancelData.success) {
                    console.warn('Mandate cancellation failed:', cancelData.error);
                    // Continue anyway - payment was successful
                }
            }

            setStep('success');
            onPaymentComplete?.(true);

        } catch (err: any) {
            setError(err.message);
            setStep('error');
            onPaymentComplete?.(false);
        } finally {
            setLoading(false);
        }
    };

    if (!isEnabled) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">Early Repayment</h3>
                <p className="text-green-100 text-sm">Pay off your loan early and save on interest</p>
            </div>

            {/* Content */}
            <div className="p-6">
                {step === 'confirm' && (
                    <div className="space-y-6">
                        {/* Amount Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Remaining Balance</span>
                                <span className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                This is the total amount needed to fully pay off your loan.
                            </p>
                        </div>

                        {/* Mandate Cancellation Option */}
                        {mandateId && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cancelMandate}
                                        onChange={(e) => setCancelMandate(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div>
                                        <p className="font-medium text-blue-900">Cancel Debit Order</p>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Automatically cancel your monthly debit order after payment.
                                            Recommended if paying off the full balance.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Payment Instructions */}
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                <strong>Bank Transfer Details:</strong>
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bank:</span>
                                    <span>FNB Namibia</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Account:</span>
                                    <span>62123456789</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Reference:</span>
                                    <span className="text-purple-600">{loanId.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                ⚠️ Please use the reference above to ensure your payment is correctly allocated.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium 
                           hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                Confirm Payment Made
                            </button>
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="text-center py-8">
                        <div className="animate-spin w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full mx-auto"></div>
                        <p className="text-gray-600 mt-4">Processing your request...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mt-4">Request Submitted!</h4>
                        <p className="text-gray-600 mt-2">
                            We've recorded your early repayment. Once we confirm receipt of funds,
                            your loan will be marked as paid off.
                        </p>
                        {cancelMandate && (
                            <p className="text-sm text-green-600 mt-2">
                                ✓ Your debit order cancellation has been initiated.
                            </p>
                        )}
                    </div>
                )}

                {step === 'error' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mt-4">Something went wrong</h4>
                        <p className="text-gray-600 mt-2">{error}</p>
                        <button
                            onClick={() => setStep('confirm')}
                            className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
