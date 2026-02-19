'use client';

/**
 * DebiCheck Authorization Modal
 * 
 * Shows during mandate creation flow while waiting for bank authorization.
 */

import { useEffect, useState } from 'react';
import { useDebiCheckMandate } from '@/lib/realpay-hooks';

interface DebiCheckModalProps {
    isOpen: boolean;
    loanId: string;
    onSuccess: () => void;
    onReject: () => void;
    onClose: () => void;
}

export function DebiCheckModal({
    isOpen,
    loanId,
    onSuccess,
    onReject,
    onClose,
}: DebiCheckModalProps) {
    const { pollForApproval, status, polling, error, isApproved, isRejected } = useDebiCheckMandate();
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (isOpen && loanId) {
            pollForApproval(loanId, {
                intervalMs: 3000,
                maxAttempts: 60, // 3 minutes
                onStatusChange: (newStatus) => {
                    if (newStatus.status === 'approved') {
                        onSuccess();
                    } else if (newStatus.status === 'rejected') {
                        setRetryCount((prev) => prev + 1);
                    }
                },
            });
        }
    }, [isOpen, loanId, pollForApproval, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">Bank Authorization</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    {polling && !isRejected && (
                        <div className="text-center">
                            {/* Phone Animation */}
                            <div className="relative mx-auto w-24 h-40 mb-6">
                                <div className="absolute inset-0 bg-gray-800 rounded-2xl shadow-lg">
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-700 rounded-full" />
                                    <div className="absolute inset-2 top-4 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="animate-pulse">
                                            <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                {/* Notification Badge */}
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                                    <span className="text-white text-xs font-bold">1</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Check Your Phone
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Your bank is sending a verification request. Please approve it using your banking app or USSD.
                            </p>

                            {/* Loading indicator */}
                            <div className="flex items-center justify-center gap-2 text-purple-600">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Waiting for authorization...</span>
                            </div>

                            {/* Bank instructions */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-sm">
                                <p className="font-medium text-gray-900 mb-2">How to approve:</p>
                                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                                    <li>Open your banking app or dial USSD</li>
                                    <li>Look for pending DebiCheck request</li>
                                    <li>Review the debit order details</li>
                                    <li>Tap "Approve" or "Accept"</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {isApproved && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Authorization Successful!</h3>
                            <p className="text-gray-600">Your debit order has been set up successfully.</p>
                        </div>
                    )}

                    {isRejected && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Authorization Declined</h3>
                            <p className="text-gray-600 mb-4">
                                {retryCount >= 3
                                    ? 'Maximum retry attempts reached. Please contact support.'
                                    : 'The bank reported the mandate was declined. If this was an error, you can try again.'
                                }
                            </p>
                            {retryCount < 3 && (
                                <button
                                    onClick={onReject}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Retry Authorization
                                </button>
                            )}
                        </div>
                    )}

                    {error && !isRejected && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Issue</h3>
                            <p className="text-gray-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        {isApproved || isRejected ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
