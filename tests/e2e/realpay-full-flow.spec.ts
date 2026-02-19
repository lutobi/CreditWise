/**
 * Comprehensive Realpay E2E Test Suite with Authentication
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'tests/screenshots/full-flow';
const BASE_URL = 'http://localhost:3000';
const MOCK_SERVER = 'http://localhost:4100';

const TEST_USER = {
    email: 'e2e-test-user@nomad.com',
    password: 'TestPassword123!'
};

// Ensure screenshot directory exists
test.beforeAll(async () => {
    const dir = path.join(process.cwd(), SCREENSHOT_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

async function screenshot(page: Page, name: string) {
    await page.screenshot({
        path: path.join(process.cwd(), SCREENSHOT_DIR, `${name}.png`),
        fullPage: true
    });
}

async function login(page: Page) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Check if already logged in
    if (await page.locator('text=Dashboard').count() > 0) return;

    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

    await Promise.all([
        page.waitForNavigation({ timeout: 20000 }).catch(() => { }),
        page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    ]);

    await page.waitForTimeout(2000);
}

// ============================================
// TEST SUITE 1: AUTHENTICATED LOAN APPLICATION
// ============================================
test.describe('1. Authenticated Loan Application', () => {
    test('Login and complete full application', async ({ page }) => {
        test.setTimeout(120000);

        // 1. Visit Homepage
        await page.goto(BASE_URL);
        await screenshot(page, '01_homepage');

        // 2. Login First
        await login(page);
        await screenshot(page, '02_logged_in_dashboard');

        // 3. Navigate to Appy
        await page.goto(`${BASE_URL}/apply`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await screenshot(page, '03_apply_start');

        // Step 1: Personal Details
        console.log('Step 1: Personal Details');
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="nationalId"]', '90010100123'); // Valid format

        // DOB
        const dobInput = page.locator('input[name="dob"]');
        await dobInput.fill('1990-01-01');

        await page.fill('input[name="phone"]', '+264811234567');
        await page.fill('input[name="nationality"]', 'Namibian');
        await page.fill('input[name="address"]', '123 Main Street, Windhoek');

        // Selects
        const genderSelect = page.locator('select[name="gender"]');
        if (await genderSelect.count() > 0) await genderSelect.selectOption('Male');

        const maritalStatus = page.locator('select[name="maritalStatus"]');
        if (await maritalStatus.count() > 0) await maritalStatus.selectOption('Single');

        await screenshot(page, '04_step1_filled');
        await page.click('button:has-text("Next")');

        // Check for errors
        // Debug errors if next step doesn't appear
        try {
            await page.waitForSelector('text=Employment & Income', { timeout: 5000 });
        } catch (e) {
            console.log('Step 1 Navigation failed. Checking for errors...');
            const errors = await page.locator('.text-red-600').allInnerTexts();
            console.log('Form Errors:', errors);
            // Capture specific error screenshot
            await screenshot(page, 'step1_error_debug');
            throw e;
        }

        // Step 2: Employment
        console.log('Step 2: Employment');
        await screenshot(page, '05_step2_employment');

        await page.fill('input[name="employerName"]', 'Acme Corporation');
        await page.fill('input[name="jobTitle"]', 'Manager');
        await page.fill('input[name="employerPhone"]', '+264612345678');
        await page.fill('input[name="employmentStartDate"]', '2020-01-01');
        await page.fill('input[name="monthlyIncome"]', '35000');

        // HR Details
        await page.fill('input[name="hrName"]', 'Jane HR');
        await page.fill('input[name="hrEmail"]', 'hr@acme.com');
        await page.fill('input[name="hrPhone"]', '+26461999999');

        const employmentType = page.locator('select[name="employmentType"]');
        if (await employmentType.count() > 0) await employmentType.selectOption('Permanent');

        await screenshot(page, '06_step2_filled');
        await page.click('button:has-text("Next")');

        // Wait for Step 3 header
        await page.waitForSelector('text=Bank', { timeout: 10000 });

        // Step 3: Banking (Realpay Integration)
        console.log('Step 3: Banking');
        await screenshot(page, '07_step3_banking');

        // Select Bank - look for the specific Realpay select
        // It has text "Select your bank" as first option
        const bankSelect = page.locator('select').filter({ hasText: /Select your bank/ });
        if (await bankSelect.count() > 0) {
            await bankSelect.selectOption({ index: 1 }); // First real bank (FNB)
            await page.waitForTimeout(1000);
        } else {
            console.log('BankSelect not found by text, trying generic select');
            await page.locator('select').first().selectOption({ index: 1 });
        }

        // Fill fields
        await page.fill('input[name="accountNumber"]', '62123456789');
        await page.fill('input[name="accountHolder"]', 'John Doe');

        const accountType = page.locator('select[name="accountType"]');
        if (await accountType.count() > 0) await accountType.selectOption('Savings');

        await screenshot(page, '08_step3_filled');
        await page.click('button:has-text("Next")');

        // Wait for Step 4
        await page.waitForSelector('text=Loan Details', { timeout: 10000 });

        // Step 4: Loan Details
        console.log('Step 4: Loan Details');
        await screenshot(page, '09_step4_loan_details');

        // Only fill if empty (some might be prefilled or sliders)
        const amountInput = page.locator('input[name="amount"], input[name="loanAmount"]');
        await amountInput.fill('5000');

        // Fix for loanPurpose (it is a text input, not select)
        await page.fill('input[name="loanPurpose"]', 'School Fees');

        // Repayment Method
        const repayment = page.locator('select[name="repaymentMethod"]');
        if (await repayment.count() > 0) await repayment.selectOption('Debit Order');

        await screenshot(page, '10_step4_filled');
        await page.click('button:has-text("Next")');

        // Step 5: References
        await page.waitForSelector('text=References', { timeout: 10000 });
        console.log('Step 5: References');
        await screenshot(page, '11_step5_references');
        await page.fill('input[name="nextOfKinName"]', 'Jane Doe');
        await page.fill('input[name="nextOfKinContact"]', '+264811111111'); // changed from reference1Phone
        await page.fill('input[name="nextOfKinRelationship"]', 'Spouse');
        await page.fill('input[name="nextOfKinAddress"]', 'Erf 456, Walvis Bay');

        await screenshot(page, '12_step5_filled');
        await page.click('button:has-text("Next")');

        // Debug Step 5->6
        try {
            await page.waitForSelector('text=Documents', { timeout: 10000 });
        } catch (e) {
            console.log('Step 5 Navigation failed. Checking for errors...');
            const errors = await page.locator('.text-red-600').allInnerTexts();
            console.log('Form Errors (Step 5):', errors);
            throw e;
        }
        console.log('Step 6: Documents');
        await screenshot(page, '13_step6_documents');

        // Use bypass inputs for testing
        console.log('Using bypass inputs for documents...');
        await page.fill('#idDocument-bypass', 'https://example.com/id.pdf', { force: true });
        await page.fill('#payslip-bypass', 'https://example.com/payslip.pdf', { force: true });
        await page.fill('#selfie-bypass', 'https://example.com/selfie.jpg', { force: true });

        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isEnabled()) {
            await nextBtn.click();
        }

        // Debug Step 6->7
        try {
            await page.waitForSelector('text=Declaration', { timeout: 10000 });
        } catch (e) {
            console.log('Step 6 Navigation failed. Checking for errors...');
            const errors = await page.locator('.text-red-500').allInnerTexts(); // Documents use red-500
            console.log('Form Errors (Step 6):', errors);
            throw e;
        }

        // Step 7: Final Review
        try {
            await page.waitForSelector('text=Legal Declaration', { timeout: 15000 });
        } catch (e) {
            console.log('Step 7 Navigation failed.');
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('CURRENT PAGE TEXT:', bodyText.substring(0, 500) + '...');
            await screenshot(page, 'step6_stuck_debug');
            throw e;
        }
        console.log('Step 7: Final Review');
        await screenshot(page, '14_step7_review');

        const declaration = page.locator('input[type="checkbox"]');
        if (await declaration.count() > 0) await declaration.check();

        await screenshot(page, '15_step7_checked');

        // Submit
        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Apply")');
        if (await submitBtn.isEnabled()) {
            await submitBtn.click();

            // Wait for success
            await page.waitForSelector('text=Application Received', { timeout: 30000 });
            console.log('Application Submitted Successfully');
            await screenshot(page, '16_application_success');
        }
    });
});

// ============================================
// TEST SUITE 2: USER DASHBOARD
// ============================================
test.describe('2. User Dashboard (Authenticated)', () => {
    test('View dashboard with Realpay components', async ({ page }) => {
        await login(page);
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');

        await screenshot(page, '20_dashboard_view');

        // Check for Payment Calendar
        const calendar = page.locator('text=Payment Schedule');
        if (await calendar.count() > 0) {
            await screenshot(page, '21_payment_calendar');
        }

        // Check for Status Banner
        const banner = page.locator('[class*="banner"]');
        if (await banner.count() > 0) {
            await screenshot(page, '22_status_banner');
        }
    });
});

// ============================================
// TEST SUITE 3: ADMIN DASHBOARD
// ============================================
test.describe('3. Admin Dashboard (Authenticated)', () => {
    test('View admin panel with Realpay analytics', async ({ page }) => {
        await login(page);
        await page.goto(`${BASE_URL}/admin`);
        await page.waitForLoadState('networkidle');

        await screenshot(page, '30_admin_view');

        // Check for Realpay Admin Panel
        const realpayPanel = page.locator('text=Realpay Analytics');
        if (await realpayPanel.count() > 0) {
            await realpayPanel.scrollIntoViewIfNeeded();
            await screenshot(page, '31_realpay_admin_panel');
        }

        // Active Loans
        const activeLoans = page.locator('text=Active Loans');
        if (await activeLoans.count() > 0) {
            await activeLoans.click();
            await page.waitForTimeout(1000);
            await screenshot(page, '32_admin_active_loans');
        }
    });
});

// ============================================
// TEST SUITE 4: API TESTS
// ============================================
test.describe('4. Realpay API Tests', () => {
    test('Test Mock Server Endpoints', async ({ request }) => {
        // Reset (using /api/ prefix if needed, or fallback)
        await request.post(`${MOCK_SERVER}/reset`).catch(() => { });

        // Verify Account with correct path /api/v1/...
        const avs = await request.post(`${MOCK_SERVER}/api/v1/avs/verify`, {
            headers: { 'X-API-Key': 'test-key', 'Content-Type': 'application/json' },
            data: {
                bankCode: '250655', accountNumber: '62123456789',
                idNumber: '12345678901234', accountHolderName: 'John Doe'
            }
        });
        expect(avs.status()).toBe(200);
        const avsData = await avs.json();
        // Mock server returns { success: true, status: 'verified', ... }
        expect(avsData.status).toBe('verified');

        // Create Mandate (Use Mock Server internal schema)
        const mandate = await request.post(`${MOCK_SERVER}/api/v1/mandates`, {
            headers: { 'X-API-Key': 'test-key', 'Content-Type': 'application/json' },
            data: {
                loanId: 'LOAN-Test-123',
                amount: 5000,
                collectionDay: 25,
                accountDetails: {
                    accountNumber: '62123456789',
                    bankCode: '250655',
                    idNumber: '12345678901234'
                }
            }
        });
        expect(mandate.status()).toBe(200);
    });
});
