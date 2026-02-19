/**
 * Realpay Mock Server Tests
 * 
 * Standalone tests for the Realpay mock API server.
 * Run with: node tests/realpay-mock-tests.js
 * 
 * Prerequisites: Mock server running on port 4100
 *   npm run mock:realpay
 */

const MOCK_API_URL = 'http://localhost:4100';

const testBankDetails = {
    bankCode: '282672',
    accountNumber: '62123456789',
    idNumber: '1234567890123',
    accountHolderName: 'Test User',
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

async function runTests() {
    console.log('\n🧪 Realpay Mock Server Tests\n');
    console.log(`Testing against: ${MOCK_API_URL}\n`);

    // Check if server is running
    try {
        await fetch(`${MOCK_API_URL}/api/v1/_test/reset`, {
            method: 'POST',
            headers: { 'X-API-Key': 'test_key' },
        });
    } catch (e) {
        console.error('❌ Mock server not running. Start with: npm run mock:realpay\n');
        process.exit(1);
    }

    // Reset mock data
    await test('Reset mock data', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/_test/reset`, {
            method: 'POST',
            headers: { 'X-API-Key': 'test_key' },
        });
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.message === 'Mock data cleared', 'Expected cleared message');
    });

    // AVS - Valid account
    await test('AVS: Verify valid account', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify(testBankDetails),
        });
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.status === 'verified', `Expected verified, got ${data.status}`);
        assert(data.matchScore === 100, 'Expected matchScore 100');
    });

    // AVS - Invalid account (ends in 0000)
    await test('AVS: Reject invalid account (ends 0000)', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                ...testBankDetails,
                accountNumber: '621234560000',
            }),
        });
        const data = await res.json();
        assert(data.status === 'failed', `Expected failed, got ${data.status}`);
        assert(data.matchScore === 0, 'Expected matchScore 0');
    });

    // AVS - ID mismatch (ends in 1111)
    await test('AVS: ID mismatch (ends 1111)', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                ...testBankDetails,
                accountNumber: '621234561111',
            }),
        });
        const data = await res.json();
        assert(data.status === 'mismatch', `Expected mismatch, got ${data.status}`);
        assert(data.matchScore === 40, 'Expected matchScore 40');
    });

    // Mandate - Create
    let mandateRef = '';
    await test('Mandate: Create new mandate', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
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
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.mandateReference.startsWith('MND_'), 'Expected MND_ prefix');
        assert(data.status === 'pending', 'Expected pending status');
        mandateRef = data.mandateReference;
    });

    // Mandate - Get status
    await test('Mandate: Get status', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/mandates/${mandateRef}`, {
            headers: { 'X-API-Key': 'test_key' },
        });
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.mandate.mandateReference === mandateRef, 'Reference match');
        assert(data.mandate.amount === 1500, 'Amount match');
    });

    // Mandate - Cancel
    await test('Mandate: Cancel mandate', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/mandates/${mandateRef}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': 'test_key' },
        });
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.status === 'cancelled', 'Expected cancelled status');
    });

    // Mandate - Verify cancelled
    await test('Mandate: Verify cancelled status', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/mandates/${mandateRef}`, {
            headers: { 'X-API-Key': 'test_key' },
        });
        const data = await res.json();
        assert(data.mandate.status === 'cancelled', 'Expected cancelled');
    });

    // Payout - Create
    await test('Payout: Create payout', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/payouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-payout',
                amount: 5000,
                accountDetails: testBankDetails,
                reference: 'LOAN-TEST',
            }),
        });
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.transactionRef.startsWith('TXN_'), 'Expected TXN_ prefix');
        assert(data.status === 'processing', 'Expected processing');
    });

    // Auth - Missing API key
    await test('Auth: Reject missing API key', async () => {
        const res = await fetch(`${MOCK_API_URL}/api/v1/avs/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testBankDetails),
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
        const data = await res.json();
        assert(data.error === 'Missing API key', 'Expected error message');
    });

    // Trigger collection webhook
    await test('Webhook: Trigger collection', async () => {
        // Create a mandate first
        const createRes = await fetch(`${MOCK_API_URL}/api/v1/mandates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test_key',
            },
            body: JSON.stringify({
                loanId: 'test-loan-webhook',
                amount: 3000,
                collectionDay: 1,
                accountDetails: testBankDetails,
            }),
        });
        const createData = await createRes.json();

        // Trigger collection
        const res = await fetch(`${MOCK_API_URL}/api/v1/_test/trigger-collection`, {
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
        const data = await res.json();
        assert(data.success === true, 'Expected success');
        assert(data.transactionRef.startsWith('COL_'), 'Expected COL_ prefix');
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(50) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
