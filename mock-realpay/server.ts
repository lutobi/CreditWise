/**
 * Mock Realpay API Server
 * 
 * Run with: npx ts-node mock-realpay/server.ts
 * Or add to package.json: "mock:realpay": "ts-node mock-realpay/server.ts"
 * 
 * Simulates all Realpay endpoints for local development and testing.
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.MOCK_REALPAY_PORT || 4100;
const WEBHOOK_TARGET = process.env.WEBHOOK_TARGET || 'http://localhost:3000/api/realpay/webhooks';

// In-memory storage for mock data
const mandates = new Map<string, any>();
const transactions = new Map<string, any>();

// ============================================
// Helpers
// ============================================

function generateReference(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWebhook(eventType: string, data: any): Promise<void> {
    const event = {
        id: generateReference('evt'),
        type: eventType,
        created: new Date().toISOString(),
        data,
    };

    const signature = crypto
        .createHmac('sha256', 'mock_webhook_secret')
        .update(JSON.stringify(event))
        .digest('hex');

    try {
        await fetch(WEBHOOK_TARGET, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Realpay-Signature': signature,
                'X-Realpay-Timestamp': Date.now().toString(),
            },
            body: JSON.stringify({ event, signature, timestamp: Date.now().toString() }),
        });
        console.log(`[Webhook] Sent ${eventType} to ${WEBHOOK_TARGET}`);
    } catch (error) {
        console.error(`[Webhook] Failed to send ${eventType}:`, error);
    }
}

// ============================================
// Middleware
// ============================================

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        res.status(401).json({ error: 'Missing API key' });
        return;
    }
    // In mock mode, accept any API key
    next();
}

// ============================================
// AVS Endpoints
// ============================================

app.post('/api/v1/avs/verify', authMiddleware, async (req: Request, res: Response) => {
    const { bankCode, accountNumber, idNumber, accountHolderName } = req.body;

    if (!bankCode || !accountNumber || !idNumber) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields',
            errorCode: 'INVALID_REQUEST',
        });
        return;
    }

    // Simulate processing delay
    await delay(500);

    // Mock scenarios based on account number patterns
    if (accountNumber.endsWith('0000')) {
        // Invalid account
        res.json({
            success: true,
            status: 'failed',
            matchScore: 0,
            details: {
                accountValid: false,
                nameMatch: false,
                idMatch: false,
            },
            error: 'Account not found',
            errorCode: 'ACCOUNT_NOT_FOUND',
        });
        return;
    }

    if (accountNumber.endsWith('1111')) {
        // ID mismatch
        res.json({
            success: true,
            status: 'mismatch',
            matchScore: 40,
            details: {
                accountValid: true,
                nameMatch: false,
                idMatch: false,
                accountType: 'savings',
            },
        });
        return;
    }

    // Success case
    res.json({
        success: true,
        status: 'verified',
        matchScore: 100,
        details: {
            accountValid: true,
            nameMatch: true,
            idMatch: true,
            accountType: 'current',
        },
    });
});

// ============================================
// Mandate Endpoints
// ============================================

app.post('/api/v1/mandates', authMiddleware, async (req: Request, res: Response) => {
    const { loanId, amount, collectionDay, accountDetails } = req.body;

    if (!loanId || !amount || !collectionDay || !accountDetails) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields',
        });
        return;
    }

    const mandateReference = generateReference('MND');
    const mandate = {
        mandateReference,
        loanId,
        amount,
        collectionDay,
        accountDetails,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };

    mandates.set(mandateReference, mandate);

    // Simulate DebiCheck approval (async)
    setTimeout(async () => {
        const storedMandate = mandates.get(mandateReference);
        if (!storedMandate) return;

        // Mock scenario: accounts ending in 9999 get rejected
        if (accountDetails.accountNumber.endsWith('9999')) {
            storedMandate.status = 'rejected';
            await sendWebhook('mandate.rejected', {
                mandateReference,
                failureCode: 'USER_DECLINED',
                failureReason: 'Customer rejected the mandate',
            });
        } else {
            storedMandate.status = 'approved';
            storedMandate.approvedAt = new Date().toISOString();
            await sendWebhook('mandate.approved', {
                mandateReference,
                amount,
                collectionDay,
            });
        }
    }, 5000); // 5 second delay to simulate bank processing

    res.json({
        success: true,
        mandateReference,
        status: 'pending',
    });
});

app.get('/api/v1/mandates/:reference', authMiddleware, (req: Request, res: Response) => {
    const reference = req.params.reference as string;
    const mandate = mandates.get(reference);

    if (!mandate) {
        res.status(404).json({
            success: false,
            error: 'Mandate not found',
        });
        return;
    }

    res.json({
        success: true,
        mandate,
    });
});

app.delete('/api/v1/mandates/:reference', authMiddleware, async (req: Request, res: Response) => {
    const reference = req.params.reference as string;
    const mandate = mandates.get(reference);

    if (!mandate) {
        res.status(404).json({
            success: false,
            error: 'Mandate not found',
        });
        return;
    }

    mandate.status = 'cancelled';
    mandate.cancelledAt = new Date().toISOString();

    await sendWebhook('mandate.cancelled', {
        mandateReference: reference,
    });

    res.json({
        success: true,
        status: 'cancelled',
    });
});

// ============================================
// Payout Endpoints
// ============================================

app.post('/api/v1/payouts', authMiddleware, async (req: Request, res: Response) => {
    const { loanId, amount, accountDetails, reference } = req.body;

    if (!loanId || !amount || !accountDetails) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields',
        });
        return;
    }

    const transactionRef = generateReference('TXN');
    const transaction = {
        transactionRef,
        loanId,
        amount,
        accountDetails,
        reference,
        type: 'payout',
        status: 'processing',
        createdAt: new Date().toISOString(),
    };

    transactions.set(transactionRef, transaction);

    // Simulate payout completion
    setTimeout(async () => {
        const storedTxn = transactions.get(transactionRef);
        if (!storedTxn) return;

        // Mock scenario: amounts over 100000 fail
        if (amount > 100000) {
            storedTxn.status = 'failed';
            await sendWebhook('payout.failed', {
                transactionReference: transactionRef,
                failureCode: 'AMOUNT_LIMIT_EXCEEDED',
                failureReason: 'Payout amount exceeds daily limit',
            });
        } else {
            storedTxn.status = 'success';
            storedTxn.settledAt = new Date().toISOString();
            await sendWebhook('payout.success', {
                transactionReference: transactionRef,
                amount,
                settledAt: storedTxn.settledAt,
            });
        }
    }, 2000); // 2 second delay

    res.json({
        success: true,
        transactionRef,
        status: 'processing',
        estimatedArrival: new Date(Date.now() + 5000).toISOString(),
    });
});

// ============================================
// Test Helpers (only in mock mode)
// ============================================

app.post('/api/v1/_test/trigger-collection', authMiddleware, async (req: Request, res: Response) => {
    const { mandateReference, success = true } = req.body;

    const mandate = mandates.get(mandateReference);
    if (!mandate) {
        res.status(404).json({ error: 'Mandate not found' });
        return;
    }

    const transactionRef = generateReference('COL');

    if (success) {
        await sendWebhook('collection.success', {
            mandateReference,
            transactionReference: transactionRef,
            amount: mandate.amount,
            settledAt: new Date().toISOString(),
        });
    } else {
        await sendWebhook('collection.failed', {
            mandateReference,
            transactionReference: transactionRef,
            amount: mandate.amount,
            failureCode: 'INSUFFICIENT_FUNDS',
            failureReason: 'Not enough funds in account',
            nextRetryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        });
    }

    res.json({ success: true, transactionRef });
});

app.post('/api/v1/_test/reset', (req: Request, res: Response) => {
    mandates.clear();
    transactions.clear();
    res.json({ success: true, message: 'Mock data cleared' });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    console.log(`\n🏦 Mock Realpay API running at http://localhost:${PORT}`);
    console.log(`   Webhooks will be sent to: ${WEBHOOK_TARGET}\n`);
    console.log('Available endpoints:');
    console.log('  POST /api/v1/avs/verify       - Account verification');
    console.log('  POST /api/v1/mandates         - Create DebiCheck mandate');
    console.log('  GET  /api/v1/mandates/:ref    - Get mandate status');
    console.log('  DELETE /api/v1/mandates/:ref  - Cancel mandate');
    console.log('  POST /api/v1/payouts          - Instant payout');
    console.log('\nTest helpers:');
    console.log('  POST /api/v1/_test/trigger-collection - Simulate collection');
    console.log('  POST /api/v1/_test/reset              - Clear mock data\n');
});
