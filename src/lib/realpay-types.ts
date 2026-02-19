/**
 * TypeScript types for Realpay API integration
 */

// ============================================
// Mandate Types
// ============================================

export type MandateStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'suspended';

export interface RealpayMandate {
    id: string;
    loan_id: string;
    mandate_reference: string;
    contract_reference?: string;
    status: MandateStatus;
    amount: number;
    collection_day: number;
    bank_code?: string;
    account_type?: 'savings' | 'current' | 'transmission';
    retry_count: number;
    last_error?: string;
    approved_at?: string;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMandateRequest {
    loanId: string;
    amount: number;
    collectionDay: number;
    accountDetails: {
        bankCode: string;
        accountNumber: string;
        accountType: 'savings' | 'current' | 'transmission';
        idNumber: string;
        accountHolderName: string;
    };
}

export interface CreateMandateResponse {
    success: boolean;
    mandateReference?: string;
    status?: MandateStatus;
    error?: string;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType = 'collection' | 'payout' | 'refund' | 'reversal';
export type TransactionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'retrying' | 'cancelled';

export interface RealpayTransaction {
    id: string;
    mandate_id?: string;
    loan_id: string;
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    realpay_ref?: string;
    batch_id?: string;
    failure_reason?: string;
    failure_code?: string;
    attempt_count: number;
    max_attempts: number;
    next_retry_at?: string;
    settled_at?: string;
    settlement_ref?: string;
    created_at: string;
    updated_at: string;
}

export interface PayoutRequest {
    loanId: string;
    amount: number;
    accountDetails: {
        bankCode: string;
        accountNumber: string;
        accountHolderName: string;
    };
    reference?: string;
}

export interface PayoutResponse {
    success: boolean;
    transactionRef?: string;
    status?: TransactionStatus;
    estimatedArrival?: string;
    error?: string;
}

// ============================================
// AVS (Account Verification) Types
// ============================================

export type AVSStatus = 'pending' | 'verified' | 'failed' | 'mismatch';

export interface AVSCheckRequest {
    bankCode: string;
    accountNumber: string;
    idNumber: string;
    accountHolderName?: string;
}

export interface AVSCheckResponse {
    success: boolean;
    status: AVSStatus;
    matchScore?: number;
    details?: {
        accountValid: boolean;
        nameMatch: boolean;
        idMatch: boolean;
        accountType?: string;
    };
    error?: string;
    errorCode?: string;
}

// ============================================
// Webhook Types
// ============================================

export type WebhookEventType =
    | 'mandate.created'
    | 'mandate.approved'
    | 'mandate.rejected'
    | 'mandate.cancelled'
    | 'mandate.suspended'
    | 'collection.pending'
    | 'collection.success'
    | 'collection.failed'
    | 'collection.retrying'
    | 'payout.pending'
    | 'payout.success'
    | 'payout.failed';

export interface WebhookEvent {
    id: string;
    type: WebhookEventType;
    created: string;
    data: {
        mandateReference?: string;
        transactionReference?: string;
        amount?: number;
        status?: string;
        failureCode?: string;
        failureReason?: string;
        nextRetryDate?: string;
        [key: string]: unknown;
    };
}

export interface WebhookPayload {
    event: WebhookEvent;
    signature: string;
    timestamp: string;
}

// ============================================
// API Error Types
// ============================================

export interface RealpayError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// ============================================
// Bank Codes (South Africa / Namibia)
// ============================================

export const BANK_CODES = {
    // South Africa
    ABSA: '632005',
    CAPITEC: '470010',
    FNB: '250655',
    NEDBANK: '198765',
    STANDARD_BANK: '051001',

    // Namibia
    FNB_NAMIBIA: '282672',
    BANK_WINDHOEK: '483772',
    NEDBANK_NAMIBIA: '461609',
    STANDARD_BANK_NAMIBIA: '087373',
} as const;

export type BankCode = typeof BANK_CODES[keyof typeof BANK_CODES];
