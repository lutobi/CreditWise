/**
 * React Hooks for Realpay Integration
 * 
 * Provides easy-to-use hooks for frontend components.
 */

import { useState, useCallback } from 'react';
import { FEATURES } from './feature-flags';

// ============================================
// Types
// ============================================

interface AVSResult {
    success: boolean;
    verified: boolean;
    status: 'pending' | 'verified' | 'failed' | 'mismatch';
    matchScore?: number;
    details?: {
        accountValid: boolean;
        nameMatch: boolean;
        idMatch: boolean;
    };
    error?: string;
}

interface MandateResult {
    success: boolean;
    mandateId?: string;
    mandateReference?: string;
    status?: string;
    message?: string;
    error?: string;
}

interface MandateStatus {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    amount: number;
    collectionDay: number;
    retryCount: number;
    approvedAt?: string;
    createdAt: string;
}

// ============================================
// useAccountVerification Hook
// ============================================

export function useAccountVerification() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AVSResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const verifyAccount = useCallback(async (details: {
        bankCode: string;
        accountNumber: string;
        idNumber: string;
        accountHolderName?: string;
        loanId?: string;
    }) => {
        if (!FEATURES.REALPAY_AVS) {
            setError('Account verification is not enabled');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/realpay/verify-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(details),
            });

            const data = await response.json();
            setResult(data);

            if (!data.success) {
                setError(data.error || 'Verification failed');
            }

            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return {
        verifyAccount,
        loading,
        result,
        error,
        isVerified: result?.verified === true,
        reset,
    };
}

// ============================================
// useDebiCheckMandate Hook
// ============================================

export function useDebiCheckMandate() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<MandateStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);

    const createMandate = useCallback(async (details: {
        loanId: string;
        amount: number;
        collectionDay: number;
        bankCode: string;
        accountNumber: string;
        accountType?: string;
        idNumber: string;
        accountHolderName?: string;
    }): Promise<MandateResult> => {
        if (!FEATURES.REALPAY_DEBICHECK) {
            return { success: false, error: 'DebiCheck is not enabled' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/realpay/mandate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(details),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to create mandate');
            }

            return data;
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const checkStatus = useCallback(async (loanId: string): Promise<MandateStatus | null> => {
        try {
            const response = await fetch(`/api/realpay/mandate?loanId=${loanId}`);
            const data = await response.json();

            if (data.success && data.mandate) {
                setStatus(data.mandate);
                return data.mandate;
            }

            return null;
        } catch (err: any) {
            console.error('Failed to check mandate status:', err);
            return null;
        }
    }, []);

    const pollForApproval = useCallback(async (
        loanId: string,
        options: {
            intervalMs?: number;
            maxAttempts?: number;
            onStatusChange?: (status: MandateStatus) => void;
        } = {}
    ): Promise<MandateStatus | null> => {
        const { intervalMs = 3000, maxAttempts = 60, onStatusChange } = options;

        setPolling(true);
        let attempts = 0;

        return new Promise((resolve) => {
            const poll = async () => {
                attempts++;
                const currentStatus = await checkStatus(loanId);

                if (currentStatus) {
                    onStatusChange?.(currentStatus);

                    if (currentStatus.status === 'approved' || currentStatus.status === 'rejected') {
                        setPolling(false);
                        resolve(currentStatus);
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    setPolling(false);
                    setError('Timeout waiting for bank authorization');
                    resolve(null);
                    return;
                }

                setTimeout(poll, intervalMs);
            };

            poll();
        });
    }, [checkStatus]);

    const cancelMandate = useCallback(async (mandateId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/realpay/mandate/${mandateId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            return data.success;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    return {
        createMandate,
        checkStatus,
        pollForApproval,
        cancelMandate,
        loading,
        polling,
        status,
        error,
        isApproved: status?.status === 'approved',
        isRejected: status?.status === 'rejected',
        isPending: status?.status === 'pending',
    };
}

// ============================================
// Feature Flag Check Hook
// ============================================

export function useRealpayFeatures() {
    return {
        isEnabled: FEATURES.REALPAY_ENABLED,
        hasAVS: FEATURES.REALPAY_AVS,
        hasDebiCheck: FEATURES.REALPAY_DEBICHECK,
        hasPayout: FEATURES.REALPAY_PAYOUT,
        hasPaymentCalendar: FEATURES.REALPAY_PAYMENT_CALENDAR,
    };
}
