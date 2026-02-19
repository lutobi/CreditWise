/**
 * Realpay API Client
 * 
 * Handles all communication with the Realpay API.
 * Automatically uses mock server when REALPAY_API_URL points to localhost.
 */

import { REALPAY_CONFIG, isUsingMockApi } from './feature-flags';
import type {
    CreateMandateRequest,
    CreateMandateResponse,
    PayoutRequest,
    PayoutResponse,
    AVSCheckRequest,
    AVSCheckResponse,
    RealpayMandate,
    MandateStatus,
} from './realpay-types';

class RealpayClient {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = REALPAY_CONFIG.API_URL;
        this.apiKey = REALPAY_CONFIG.API_KEY;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            ...(options.headers || {}),
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new RealpayApiError(
                data.error || 'Unknown error',
                data.errorCode || 'UNKNOWN',
                response.status
            );
        }

        return data as T;
    }

    // ============================================
    // AVS (Account Verification)
    // ============================================

    async verifyAccount(details: AVSCheckRequest): Promise<AVSCheckResponse> {
        return this.request<AVSCheckResponse>('/api/v1/avs/verify', {
            method: 'POST',
            body: JSON.stringify(details),
        });
    }

    // ============================================
    // Mandates
    // ============================================

    async createMandate(data: CreateMandateRequest): Promise<CreateMandateResponse> {
        return this.request<CreateMandateResponse>('/api/v1/mandates', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMandateStatus(reference: string): Promise<{ success: boolean; mandate: RealpayMandate }> {
        return this.request<{ success: boolean; mandate: RealpayMandate }>(
            `/api/v1/mandates/${reference}`
        );
    }

    async cancelMandate(reference: string): Promise<{ success: boolean; status: MandateStatus }> {
        return this.request<{ success: boolean; status: MandateStatus }>(
            `/api/v1/mandates/${reference}`,
            { method: 'DELETE' }
        );
    }

    async amendMandate(
        reference: string,
        updates: { amount?: number; collectionDay?: number }
    ): Promise<{ success: boolean; mandate: RealpayMandate }> {
        return this.request<{ success: boolean; mandate: RealpayMandate }>(
            `/api/v1/mandates/${reference}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updates),
            }
        );
    }

    // ============================================
    // Payouts
    // ============================================

    async createPayout(data: PayoutRequest): Promise<PayoutResponse> {
        return this.request<PayoutResponse>('/api/v1/payouts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ============================================
    // Utility
    // ============================================

    isConfigured(): boolean {
        return this.apiKey.length > 0;
    }

    isMockMode(): boolean {
        return isUsingMockApi();
    }
}

// ============================================
// Error Class
// ============================================

export class RealpayApiError extends Error {
    code: string;
    statusCode: number;

    constructor(message: string, code: string, statusCode: number) {
        super(message);
        this.name = 'RealpayApiError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

// ============================================
// Singleton Export
// ============================================

export const realpayClient = new RealpayClient();
