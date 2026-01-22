
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

test.describe('Debug Application Flow', () => {
    // Unique User for this run to avoid conflicts
    const email = `test.apply.${Date.now()}@example.com`;
    const password = 'Password123!';
    let userId: string;

    test.beforeAll(async () => {
        // Create User directly in DB to skip Signup flow issues if any
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // --- ADDED DEBUGGING ---
        console.log("Setting up console listeners...");
        // -----------------------

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (error) throw error;
        userId = data.user.id;
    });

    test.afterAll(async () => {
        // Cleanup
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.auth.admin.deleteUser(userId);
    });

    test('Complete Loan Application Flow', async ({ page }) => {
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[Browser Error] ${msg.text()}`);
            } else {
                console.log(`[Browser Log] ${msg.text()}`);
            }
        });

        // 1. Login
        await page.goto('http://localhost:3000/login');

        // Reset storage state for a clean test (must happen after navigation)
        await page.evaluate(() => window.localStorage.clear());

        await page.fill('#email', email);
        await page.fill('#password', password);
        await page.click('button:has-text("Sign In")');
        await expect(page).toHaveURL('http://localhost:3000/dashboard');

        // 2. Start Application
        // 2. Start Application
        await page.goto('http://localhost:3000/apply');

        // Step 1: Personal
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'User');
        await page.fill('input[name="nationalId"]', '90010100123');
        await page.fill('input[name="dob"]', '1990-01-01');
        await page.selectOption('select[name="gender"]', 'Male');
        await page.fill('input[name="nationality"]', 'Namibian');
        await page.selectOption('select[name="maritalStatus"]', 'Single');
        await page.fill('input[name="phone"]', '081 123 4567');
        await page.fill('input[name="address"]', '123 Test Street');
        // Email should look auto-filled or handled, if input exists
        await page.click('button:has-text("Next")');

        // Step 2: Employment
        await page.fill('input[name="employerName"]', 'Test Corp');
        await page.fill('input[name="jobTitle"]', 'Tester');
        await page.fill('input[name="employerPhone"]', '061 234 567');
        await page.fill('input[name="employmentStartDate"]', '2020-01-01');
        await page.selectOption('select[name="employmentType"]', 'Permanent');
        await page.fill('input[name="monthlyIncome"]', '15000');
        await page.fill('input[name="hrName"]', 'HR Manager');
        await page.fill('input[name="hrEmail"]', 'hr@testcorp.com');
        await page.fill('input[name="hrPhone"]', '061 999 888');
        await page.click('button:has-text("Next")');

        // Step 3: Banking
        await page.fill('input[name="bankName"]', 'Bank Windhoek');
        await page.fill('input[name="accountHolder"]', 'Test User');
        await page.fill('input[name="accountNumber"]', '123456789');
        await page.selectOption('select[name="accountType"]', 'Savings');
        await page.fill('input[name="branchCode"]', '482072');
        await page.click('button:has-text("Next")');

        // Step 4: Loan Details
        // Should default to Payday/1 Month
        // Purpose: "Rent" (Checking our fix)
        await page.fill('input[name="loanPurpose"]', 'Rent');
        await page.selectOption('select[name="repaymentMethod"]', 'Debit Order');
        await page.click('button:has-text("Next")');

        // Step 5: References
        await page.fill('input[name="nextOfKinName"]', 'Mom Doe');
        await page.fill('input[name="nextOfKinRelationship"]', 'Mother');
        await page.fill('input[name="nextOfKinContact"]', '081 111 2222');
        await page.fill('input[name="nextOfKinAddress"]', '456 Mom Street');
        await page.click('button:has-text("Next")');

        // Step 6: Documents
        // Step 6: Documents
        // Mock File Uploads using Bypass Inputs (Hidden Text Fields)
        await page.fill('input[id="idDocument-bypass"]', 'https://example.com/mock-id.jpg', { force: true });
        await page.fill('input[id="selfie-bypass"]', 'https://example.com/mock-selfie.jpg', { force: true });
        await page.fill('input[id="payslip-bypass"]', 'https://example.com/mock-payslip.pdf', { force: true });

        await page.click('button:has-text("Next")');

        // Step 7: Declaration
        // Custom Checkbox wraps input. We can check the hidden/styled input or click the label.
        // The styling uses: <input type="checkbox" ... onChange={(e) => onChange(name, e.target.checked)} />
        // It has no ID but name="termsAccepted".

        // We can just click the label text to trigger the checkbox logic
        // await page.click('text=I have read, understood, and agree');

        // Click the label because the input is strictly hidden/styled
        await page.click('text=I have read, understood, and agree');

        await page.fill('input[name="signatureName"]', 'Test User');
        await page.fill('input[name="declarationDate"]', new Date().toISOString().split('T')[0]);

        // Listen for Toast or Navigation
        const submitButton = page.locator('button:has-text("Submit Application")');
        await submitButton.click();

        // Wait for connection/API/validation
        // Check for visible errors if submission fails
        try {
            await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log("⚠️ Submission Timeout. Checking for validation errors...");
            const errorMessages = await page.locator('.text-red-500, .text-red-600').allTextContents();
            console.log("Validation Errors Found:", errorMessages);
            throw e;
        }
    });
});
