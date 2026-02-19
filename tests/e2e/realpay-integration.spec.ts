/**
 * Realpay Integration Tests
 * 
 * Tests the Realpay API endpoints using the mock server.
 * Run with: npm run test:realpay
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const MOCK_API_URL = 'http://localhost:4100';

// Test data
const testBankDetails = {
    bankCode: '282672', // FNB Namibia
    accountNumber: '62123456789',
    idNumber: '1234567890123',
    accountHolderName: 'Test User',
};

test.describe('Realpay Mock Server', () => {
    test.beforeAll(async () => {
        // Verify mock server is running
        try {
            const response = await fetch(`${MOCK_API_URL}/api/v1/_test/reset`, {
                method: 'POST',
                headers: { 'X-API-Key': 'test_key' },
            });
            expect(response.ok).toBe(true);
        } catch (error) {
            console.error('Mock server not running. Start with: npm run mock:realpay');
            throw new Error('Mock Realpay server is not running');
        }
    });

    test('should verify a valid account', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify(testBankDetails),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.status).toBe('verified');
        expect(data.matchScore).toBe(100);
        expect(data.details.accountValid).toBe(true);
        expect(data.details.nameMatch).toBe(true);
        expect(data.details.idMatch).toBe(true);
    });

    test('should fail verification for invalid account (ending in 0000)', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                ...testBankDetails,
                accountNumber: '621234560000', // Ends in 0000 = invalid
            }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data.status).toBe('failed');
        expect(data.matchScore).toBe(0);
        expect(data.details.accountValid).toBe(false);
    });

    test('should create a mandate and return pending status', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-123',
                amount: 1500,
                collectionDay: 15,
                accountDetails: testBankDetails,
            }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.mandateReference).toMatch(/^MND_/);
        expect(data.status).toBe('pending');
    });

    test('should get mandate status', async () => {
        // Create a mandate first
        const createResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-456',
                amount: 2000,
                collectionDay: 20,
                accountDetails: testBankDetails,
            }),
        });
        const createData = await createResponse.json();
        const mandateRef = createData.mandateReference;

        // Get status
        const statusResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates/${mandateRef}`, {
            headers: { 'X-API-Key': 'test_key' },
        });

        expect(statusResponse.ok).toBe(true);
        const statusData = await statusResponse.json();

        expect(statusData.success).toBe(true);
        expect(statusData.mandate.mandateReference).toBe(mandateRef);
        expect(statusData.mandate.status).toBe('pending');
        expect(statusData.mandate.amount).toBe(2000);
    });

    test('should process payout and return processing status', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/payouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-789',
                amount: 5000,
                accountDetails: testBankDetails,
                reference: 'LOAN-test789',
            }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.transactionRef).toMatch(/^TXN_/);
        expect(data.status).toBe('processing');
        expect(data.estimatedArrival).toBeDefined();
    });

    test('should reject mandate for account ending in 9999', async ({ page }) => {
        // Create mandate with account that will be rejected
        const response = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-reject',
                amount: 1000,
                collectionDay: 10,
                accountDetails: {
                    ...testBankDetails,
                    accountNumber: '621234569999', // Ends in 9999 = rejection
                },
            }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.status).toBe('pending');

        // Wait for async rejection (mock server delays 5 seconds)
        await page.waitForTimeout(6000);

        // Check status after rejection
        const statusResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates/${data.mandateReference}`, {
            headers: { 'X-API-Key': 'test_key' },
        });
        const statusData = await statusResponse.json();

        expect(statusData.mandate.status).toBe('rejected');
    });

    test('should cancel a mandate', async () => {
        // Create mandate first
        const createResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-cancel',
                amount: 1500,
                collectionDay: 25,
                accountDetails: testBankDetails,
            }),
        });
        const createData = await createResponse.json();

        // Cancel it
        const cancelResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates/${createData.mandateReference}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': 'test_key' },
        });

        expect(cancelResponse.ok).toBe(true);
        const cancelData = await cancelResponse.json();

        expect(cancelData.success).toBe(true);
        expect(cancelData.status).toBe('cancelled');
    });

    test('should trigger test collection webhook', async () => {
        // Create mandate first
        const createResponse = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-collection',
                amount: 3000,
                collectionDay: 1,
                accountDetails: testBankDetails,
            }),
        });
        const createData = await createResponse.json();

        // Trigger collection (test helper)
        const collectionResponse = await fetch(`${MOCK_API_URL}/api/v1/_test/trigger-collection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                mandateReference: createData.mandateReference,
                success: true,
            }),
        });

        expect(collectionResponse.ok).toBe(true);
        const collectionData = await collectionResponse.json();

        expect(collectionData.success).toBe(true);
        expect(collectionData.transactionRef).toMatch(/^COL_/);
    });

    test('should require API key', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testBankDetails),
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Missing API key');
    });

    test('should reset mock data', async () => {
        const response = await fetch(`${MOCK_API_URL}/api/v1/_test/reset`, {
            method: 'POST',
            headers: { 'X-API-Key': 'test_key' },
        });

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe('Mock data cleared');
    });
});
