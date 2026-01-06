
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

test('Capture Legal Declaration Page (Dark Mode)', async ({ page }) => {
    // 1. Force Dark Mode
    await page.emulateMedia({ colorScheme: 'dark' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) test.skip('Missing credentials');

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const timestamp = Date.now();
    const userEmail = `user.${timestamp}@example.com`;
    const password = 'Password123!';

    // Create User via API
    await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: 'Screenshot Tester' }
    });

    // Login via UI
    await page.goto('/login');
    await page.fill('#email', userEmail);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // 3. Start Application
    await page.goto('/apply');

    // Step 1: Personal
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Applicant');
    await page.fill('input[name="nationalId"]', '90010100123');
    await page.fill('input[name="dob"]', '1990-01-01');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('input[name="nationality"]', 'Namibian');
    await page.selectOption('select[name="maritalStatus"]', 'Single');
    await page.fill('input[name="phone"]', '0811234567');
    await page.fill('input[name="altPhone"]', '0811234567');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="address"]', '123 Test Street, Windhoek');
    await page.click('button:has-text("Next")');

    // Step 2: Employment
    await page.fill('input[name="employerName"]', 'Test Corp');
    await page.fill('input[name="jobTitle"]', 'Developer');
    await page.fill('input[name="employerPhone"]', '061123456');
    await page.fill('input[name="employmentStartDate"]', '2020-01-01');
    await page.selectOption('select[name="employmentType"]', 'Permanent');
    await page.fill('input[name="monthlyIncome"]', '15000');
    await page.fill('input[name="hrName"]', 'HR Manager');
    await page.fill('input[name="hrEmail"]', 'hr@testcorp.com');
    await page.fill('input[name="hrPhone"]', '061999888');
    await page.click('button:has-text("Next")');

    // Step 3: Banking
    await page.fill('input[name="bankName"]', 'Bank Windhoek');
    await page.fill('input[name="accountHolder"]', 'T Applicant');
    await page.fill('input[name="accountNumber"]', '123456789');
    await page.selectOption('select[name="accountType"]', 'Savings');
    await page.fill('input[name="branchCode"]', '482172');
    await page.click('button:has-text("Next")');

    // Step 4: Loan Details
    // Simplified form: Only need Purpose and Method now
    await page.fill('input[name="loanPurpose"]', 'Medical Expenses');
    await page.click('button:has-text("Next")');

    // Step 5: References
    await page.fill('input[name="nextOfKinName"]', 'Parent Applicant');
    await page.fill('input[name="nextOfKinRelationship"]', 'Parent');
    await page.fill('input[name="nextOfKinContact"]', '0819999999');
    await page.fill('input[name="nextOfKinAddress"]', 'Same Address');
    await page.click('button:has-text("Next")');

    // Step 6: Documents
    const fakeImage = Buffer.from('fake-image-content');
    const fakePdf = Buffer.from('fake-pdf-content');

    await page.setInputFiles('input[type="file"] >> nth=0', { name: 'id.jpg', mimeType: 'image/jpeg', buffer: fakeImage });
    await expect(page.locator('button:has-text("Change File") >> nth=0')).toBeVisible();

    await page.setInputFiles('input[type="file"] >> nth=1', { name: 'payslip.pdf', mimeType: 'application/pdf', buffer: fakePdf });
    await expect(page.locator('button:has-text("Change File") >> nth=1')).toBeVisible();

    await page.click('button:has-text("Capture Live Selfie")');
    await expect(page.locator('button:text-is("Retake")')).toBeVisible();

    await page.click('button:has-text("Next")');

    // Step 7: Reach Legal Declaration
    await expect(page.locator('h3:has-text("Legal Declaration")')).toBeVisible();

    // SCREENSHOT TIME
    await page.waitForTimeout(2000); // Allow render
    await page.screenshot({ path: '/Users/olutobi/.gemini/antigravity/playground/nomad-pinwheel/legal-declaration-dark.png', fullPage: true });

    console.log('✅ Screenshot captured at legal-declaration-dark.png');
});
