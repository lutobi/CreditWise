'use client';

/**
 * Bank Verification Component
 * 
 * Inline bank account verification using Realpay AVS-R.
 * Shows verification status with visual feedback.
 */

import { useState } from 'react';
import { useAccountVerification, useRealpayFeatures } from '@/lib/realpay-hooks';
import { BANK_CODES } from '@/lib/realpay-types';

interface BankVerificationProps {
    bankCode: string;
    accountNumber: string;
    idNumber: string;
    accountHolderName?: string;
    onVerified?: (verified: boolean) => void;
    loanId?: string;
}

export function BankVerification({
    bankCode,
    accountNumber,
    idNumber,
    accountHolderName,
    onVerified,
    loanId,
}: BankVerificationProps) {
    const { hasAVS } = useRealpayFeatures();
    const { verifyAccount, loading, result, error, isVerified, reset } = useAccountVerification();

    const handleVerify = async () => {
        const verificationResult = await verifyAccount({
            bankCode,
            accountNumber,
            idNumber,
            accountHolderName,
            loanId,
        });

        if (verificationResult) {
            onVerified?.(verificationResult.verified);
        }
    };

    // Don't render if AVS is not enabled
    if (!hasAVS) {
        return null;
    }

    // Check if we have enough data to verify
    const canVerify = bankCode && accountNumber && idNumber && accountNumber.length >= 6;

    return (
        <div className="mt-2">
            {!result && (
                <button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || !canVerify}
                    className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            transition-all duration-200
            ${canVerify && !loading
                            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }
          `}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Verifying...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Verify Account
                        </>
                    )}
                </button>
            )}

            {result && (
                <div className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm
          ${isVerified
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }
        `}>
                    {isVerified ? (
                        <>
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Account verified successfully</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>{error || 'Verification failed'}</span>
                            <button
                                type="button"
                                onClick={reset}
                                className="ml-auto text-red-600 hover:text-red-800 underline"
                            >
                                Retry
                            </button>
                        </>
                    )}
                </div>
            )}

            {result && !isVerified && result.details && (
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>Details:</p>
                    <ul className="list-disc list-inside">
                        <li>Account Valid: {result.details.accountValid ? '✓' : '✗'}</li>
                        <li>Name Match: {result.details.nameMatch ? '✓' : '✗'}</li>
                        <li>ID Match: {result.details.idMatch ? '✓' : '✗'}</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

// ============================================
// Bank Select Dropdown
// ============================================

interface BankInfo {
    code: string;
    name: string;
    branchCode: string;
}

interface BankSelectProps {
    value: string;
    onChange: (bank: BankInfo) => void;
    disabled?: boolean;
    country?: 'ZA' | 'NA';
}

export function BankSelect({ value, onChange, disabled, country = 'NA' }: BankSelectProps) {
    const banks: BankInfo[] = country === 'NA'
        ? [
            { code: BANK_CODES.FNB_NAMIBIA, name: 'FNB Namibia', branchCode: '280172' },
            { code: BANK_CODES.BANK_WINDHOEK, name: 'Bank Windhoek', branchCode: '483872' },
            { code: BANK_CODES.NEDBANK_NAMIBIA, name: 'Nedbank Namibia', branchCode: '461609' },
            { code: BANK_CODES.STANDARD_BANK_NAMIBIA, name: 'Standard Bank Namibia', branchCode: '082672' },
        ]
        : [
            { code: BANK_CODES.FNB, name: 'FNB', branchCode: '250655' },
            { code: BANK_CODES.ABSA, name: 'ABSA', branchCode: '632005' },
            { code: BANK_CODES.STANDARD_BANK, name: 'Standard Bank', branchCode: '051001' },
            { code: BANK_CODES.NEDBANK, name: 'Nedbank', branchCode: '198765' },
            { code: BANK_CODES.CAPITEC, name: 'Capitec', branchCode: '470010' },
        ];

    const handleChange = (code: string) => {
        const selectedBank = banks.find(b => b.code === code);
        if (selectedBank) {
            onChange(selectedBank);
        }
    };

    // Find current bank code from name or code
    const currentCode = banks.find(b => b.name === value || b.code === value)?.code || '';

    return (
        <select
            value={currentCode}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 
                 focus:ring-2 focus:ring-purple-500 focus:border-transparent
                 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
            <option value="">Select your bank</option>
            {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                    {bank.name}
                </option>
            ))}
        </select>
    );
}

