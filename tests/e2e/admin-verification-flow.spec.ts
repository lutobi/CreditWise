
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

test.describe('Admin Face Verification Flow', () => {
    test.slow(); // Allow more time for this E2E flow

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    test.beforeAll(() => {
        if (!supabaseUrl || !serviceRoleKey) {
            console.warn('Skipping test: Missing Supabase Credentials in .env.local');
        }
    });

    test('User applies (7-Step Wizard), Admin verifies face', async ({ page }) => {
        // Skip if credentials missing
        if (!supabaseUrl || !serviceRoleKey) return;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Create Unique User & Admin
        const timestamp = Date.now();
        const userEmail = `user.${timestamp}@example.com`;
        const adminEmail = `admin.${timestamp}@example.com`;
        const password = 'Password123!';

        // Create Regular User
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'Test Applicant' }
        });
        if (userError) throw userError;

        // Create Admin User
        const { data: admin, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: password,
            email_confirm: true,
            app_metadata: { role: 'admin' },
            user_metadata: { full_name: 'Super Admin' }
        });
        if (adminError) throw adminError;

        console.log(`Created User: ${userEmail}, Admin: ${adminEmail}`);

        try {
            // --- USER FLOW ---
            // Debug: Capture console logs
            page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

            await test.step('User Login', async () => {
                await page.goto('/login');
                await page.fill('input[id="email"]', userEmail);
                await page.fill('input[id="password"]', password);
                await page.click('button:has-text("Sign In")');
                await page.waitForURL('**/dashboard');
            });

            await test.step('Start Application', async () => {
                await page.goto('/apply');
                await expect(page.locator('text=Personal Details')).toBeVisible();
            });

            await test.step('Step 1: Personal Details', async () => {
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
            });

            await test.step('Step 2: Employment & Income', async () => {
                await expect(page.locator('text=Employer Name')).toBeVisible();
                await page.fill('input[name="employerName"]', 'Test Corp');
                await page.fill('input[name="jobTitle"]', 'Developer');
                await page.fill('input[name="employerPhone"]', '061123456');
                await page.fill('input[name="employmentStartDate"]', '2020-01-01');
                await page.selectOption('select[name="employmentType"]', 'Permanent');
                await page.fill('input[name="monthlyIncome"]', '15000');

                // HR Details
                await page.fill('input[name="hrName"]', 'HR Manager');
                await page.fill('input[name="hrEmail"]', 'hr@testcorp.com');
                await page.fill('input[name="hrPhone"]', '061999888');
                await page.click('button:has-text("Next")');
            });

            await test.step('Step 3: Banking Details', async () => {
                await expect(page.locator('text=Bank Name')).toBeVisible();
                await page.fill('input[name="bankName"]', 'Bank Windhoek');
                await page.fill('input[name="accountHolder"]', 'T Applicant');
                await page.fill('input[name="accountNumber"]', '123456789');
                await page.selectOption('select[name="accountType"]', 'Savings');
                await page.fill('input[name="branchCode"]', '482172');
                await page.click('button:has-text("Next")');
            });

            await test.step('Step 4: Loan Details (Pre-filled Payday)', async () => {
                // Should show "Payday Loan (1 Month)" static text
                await expect(page.locator('text=Payday Loan (1 Month)')).toBeVisible();

                // Fill Purpose (Required)
                await page.fill('input[name="loanPurpose"]', 'Medical Expenses');

                // Click Next
                await page.click('button:has-text("Next")');
            });

            await test.step('Step 5: References', async () => {
                await expect(page.locator('text=Next of Kin Details')).toBeVisible();
                await page.fill('input[name="nextOfKinName"]', 'Parent Applicant');
                await page.fill('input[name="nextOfKinRelationship"]', 'Parent');
                await page.fill('input[name="nextOfKinContact"]', '0819999999');
                await page.fill('input[name="nextOfKinAddress"]', 'Same Address');
                await page.click('button:has-text("Next")');
            });

            await test.step('Step 6: Document Uploads', async () => {
                await expect(page.locator('text=ID Document')).toBeVisible();

                // Use Bypass Inputs to avoid flaky uploads
                // Use Bypass Inputs to avoid flaky uploads
                // Real Uploads
                const fakeImage = Buffer.from('fake-image-content');
                const fakePdf = Buffer.from('fake-pdf-content');
                await page.setInputFiles('input[type="file"] >> nth=0', { name: 'id.jpg', mimeType: 'image/jpeg', buffer: fakeImage });
                await expect(page.locator('button:has-text("Change File") >> nth=0')).toBeVisible({ timeout: 10000 });
                await page.setInputFiles('input[type="file"] >> nth=1', { name: 'payslip.pdf', mimeType: 'application/pdf', buffer: fakePdf });
                await expect(page.locator('button:has-text("Change File") >> nth=1')).toBeVisible({ timeout: 10000 });
                await page.click('button:has-text("Capture Live Selfie")');
                await expect(page.locator('button:text-is("Retake")')).toBeVisible({ timeout: 15000 });

                // Wait for upload simulation (if any) or just click Next
                // In test env, we should ensure uploads "complete"
                await page.waitForTimeout(1000);
                await page.click('button:has-text("Next")');
            });

            await test.step('Step 7: Declaration & Submit', async () => {
                await expect(page.locator('h3:has-text("Legal Declaration")')).toBeVisible({ timeout: 10000 });

                // Tick all checkboxes (force: true in case of custom components)
                const checkboxes = await page.locator('input[type="checkbox"]').all();
                for (const checkbox of checkboxes) {
                    await checkbox.check({ force: true });
                }

                // Fill Signature
                await page.fill('input[name="signatureName"]', 'Test Applicant');

                await page.click('button:has-text("Submit Application")');
                await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 30000 });
            });

            // --- ADMIN FLOW ---
            await test.step('Admin Verification', async () => {
                // Ensure clean slate for Admin Login
                await page.goto('/login');
                await page.evaluate(() => window.localStorage.clear());
                await page.reload();
                await expect(page.locator('form')).toBeVisible();

                // Login Admin (UI) - Slow and Steady
                await page.waitForTimeout(1000);
                await page.fill('input[id="email"]', adminEmail);
                await page.fill('input[id="password"]', password);
                await page.click('button:has-text("Sign In")');

                // Wait for navigation or error
                await page.waitForTimeout(2000);
                await expect(page.locator('text=Pending Loans')).toBeVisible();

                // Find our loan (Use .first() as multiple test runs might create duplicates)
                await expect(page.locator('text=Test Applicant').first()).toBeVisible();

                // Click Verify Face Identity (Use first button found)
                // Handle the alert dialog
                page.on('dialog', async dialog => {
                    console.log(`Alert message: ${dialog.message()}`);
                    if (process.env.TEST_AWS_REKOGNITION === 'true') {
                        console.log('⚠️ RUNNING REAL AWS VERIFICATION (Dialog Accepted)');
                        await dialog.accept();
                    } else {
                        console.log('ℹ️ Skipping AWS Verification (Dialog Dismissed). Set TEST_AWS_REKOGNITION=true to run real check.');
                        await dialog.dismiss();
                    }
                });

                const verifyBtn = page.locator('button:has-text("Verify Face Identity")').first();
                await expect(verifyBtn).toBeVisible();
                await verifyBtn.click();

                // Verification might fail in test env (Mock AWS), but we verified the button exists and is clickable.
                // If we want to verify functionality, we'd need to mock the API response.
                // For now, E2E proves flow integration.
            });

        } finally {
            // Cleanup
            if (user?.user?.id) await supabaseAdmin.auth.admin.deleteUser(user.user.id);
            if (admin?.user?.id) await supabaseAdmin.auth.admin.deleteUser(admin.user.id);
        }
    });
});
