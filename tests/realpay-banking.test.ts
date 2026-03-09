import { describe, it, expect, vi, beforeEach } from 'vitest';
import { realpayClient } from '../src/lib/realpay-client';

// Mock the global fetch API to strictly simulate Realpay banking servers
global.fetch = vi.fn();

describe('RealPay Banking API Integration Pipeline', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Force the client to use a dummy API key for test environment
        // @ts-ignore - bypassing private for testing
        realpayClient.apiKey = 'test_sk_12345';
        // @ts-ignore
        realpayClient.baseUrl = 'https://api.realpay.com';
    });

    it('1. AVS Check: Successfully verifies a valid bank account number', async () => {
        // Mock the exact response structure of RealPay AVS verification
        const mockRealpayResponse = {
            success: true,
            accountStatus: 'ACTIVE',
            matchConfig: {
                idMatch: true,
                initialsMatch: true,
                nameMatch: true
            }
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockRealpayResponse
        });

        const avsRequest = {
            accountNumber: '62000000000',
            branchCode: '280172',
            idNumber: '90010100000',
            initials: 'JD',
            surname: 'Doe'
        };

        const result = await realpayClient.verifyAccount(avsRequest);

        // Verify the client parsed the banking response correctly
        expect(result.success).toBe(true);
        expect(result.accountStatus).toBe('ACTIVE');
        expect(result.matchConfig.idMatch).toBe(true);

        // Verify the HTTP request sent exactly the right headers and payload to the Banking API
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.realpay.com/api/v1/avs/verify',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'X-API-Key': 'test_sk_12345',
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(avsRequest)
            })
        );
    });

    it('2. Auto-Debit Mandate: Successfully registers a collection mandate', async () => {
        const mockMandateResponse = {
            success: true,
            mandateRef: 'MND-123456',
            status: 'PENDING_AUTHORIZATION'
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockMandateResponse
        });

        const mandateRequest = {
            accountNumber: '62000000000',
            branchCode: '280172',
            accountType: 'Savings' as any,
            amount: 6250, // 25% interest included
            collectionDate: '2025-12-01',
            reference: 'OMARI-LOAN-001',
            customerName: 'John Doe',
            customerPhone: '+264 81 123 4567'
        };

        const result = await realpayClient.createMandate(mandateRequest);

        expect(result.success).toBe(true);
        expect(result.mandateRef).toBe('MND-123456');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.realpay.com/api/v1/mandates',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(mandateRequest)
            })
        );
    });

    it('3. Auto-Debit Payout: Throws correct error when RealPay servers are down', async () => {
        // Simulate a 500 Generic Error from the banking server
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal Bank Error', errorCode: 'BANK_TIMEOUT' })
        });

        const payoutRequest = {
            accountNumber: '62000000000',
            branchCode: '280172',
            amount: 5000,
            reference: 'PAY-123'
        };

        // Assert that the client throws our custom RealpayApiError
        await expect(realpayClient.createPayout(payoutRequest)).rejects.toThrow('Internal Bank Error');
    });

});
