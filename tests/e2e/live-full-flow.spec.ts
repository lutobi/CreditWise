import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('LIVE Full User Flow (Real Database + Admin Bypass)', () => {
    // This test runs against the LIVE application with REAL .env.local credentials.
    // It mocks NOTHING. Use with caution as it creates real users and data.

    test.beforeEach(async ({ page }) => {
        // Logging for debugging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
        page.on('requestfailed', req => console.log(`REQ FAILED: ${req.url()} - ${req.failure()?.errorText}`));

        // Log POST and GET data to Supabase
        page.on('request', request => {
            if (request.url().includes('supabase.co')) {
                if (request.method() === 'POST') {
                    console.log(`REQ POST ${request.url()}:`, request.postData());
                } else if (request.method() === 'GET') {
                    console.log(`REQ GET ${request.url()}`);
                }
            }
        });
    });

    test('should complete full flow with PRE-VERIFIED user', async ({ page }) => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            test.skip(!serviceRoleKey, 'Skipping: Missing SUPABASE_SERVICE_ROLE_KEY');
            return;
        }

        // 1. Create a Verified User via Admin API
        const uniqueId = Date.now();
        const email = `robot.verified.${uniqueId}@example.com`;
        const password = 'Password123!';

        console.log(`TEST: Creating verified user: ${email}`);

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // ERROR BYPASS: Auto-confirm email
            user_metadata: { full_name: 'Robot Verified' }
        });

        if (createError) {
            console.error('TEST ERROR: Failed to create user', createError);
            throw createError;
        }
        console.log('TEST: Verified User Created Successfully.');

        // 0. Landing Page
        await page.goto('/');
        await expect(page.locator('text=Unlock Your Financial Potential')).toBeVisible();
        await page.click('text=Get Started');
        await expect(page).toHaveURL(/.*\/signup/);

        // 1.5 Create Profile (Fix 23503 FK Error)
        // Some apps have triggers for this, but manually doing it ensures safety.
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            id: user.user.id,
            full_name: 'Robot Verified',
            national_id: '90010100123' // Matching the form fill
        });

        if (profileError) {
            console.log('TEST WARNING: Profile creation failed (maybe trigger exists?):', profileError.message);
        } else {
            console.log('TEST: Profile created manually for ID:', user.user.id);
        }

        // Verify Profile Exists
        const { data: profileCheck, error: checkError } = await supabaseAdmin.from('profiles').select('*').eq('id', user.user.id).single();
        if (checkError || !profileCheck) {
            console.error('TEST FATAL: Profile NOT found in DB after insert!', checkError);
            throw new Error('Profile missing');
        }
        console.log('TEST: Profile confirmed in DB:', profileCheck.id);

        // 2. Login with this user
        console.log('TEST: Logging in...');
        await page.goto('/login');
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="password"]', password);
        await page.click('button:has-text("Sign In")');

        await page.waitForURL('**/dashboard');
        console.log('TEST: Login Successful! On Dashboard.');
        await expect(page.locator('text=Welcome back')).toBeVisible();
        await page.screenshot({ path: 'test-results/screenshots/2-dashboard-initial.png' });

        // 3. Apply
        console.log('TEST: Starting Application...');
        await page.goto('/apply');

        // Step 1: Personal
        await page.fill('input[placeholder="John"]', 'Robot');
        await page.fill('input[placeholder="Doe"]', 'Verified');
        await page.fill('input[placeholder="Enter your ID number"]', '90010100123');
        await page.fill('input[placeholder="+264 81 123 4567"]', '+264 81 123 4567');
        await page.click('button:has-text("Next Step")');

        // Step 2: Employment
        await expect(page.locator('text=Employment Information')).toBeVisible();
        await page.fill('input[placeholder="Company Ltd"]', 'Tech Corp');
        await page.fill('input[placeholder="15000"]', '25000');
        await page.selectOption('select', 'Full-time Permanent');
        await page.click('button:has-text("Next Step")');

        // Step 3: Document Uploads
        await expect(page.locator('text=Document Uploads')).toBeVisible();
        console.log('TEST: Uploading REAL files to Storage...');

        // Upload ID
        await page.setInputFiles('input[id="idDocument"]', {
            name: 'id_scan.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('this is a test image content')
        });
        await page.waitForTimeout(1000); // Give Supabase time strictly

        // Upload Payslip
        await page.setInputFiles('input[id="payslip"]', {
            name: 'payslip.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('this is a test pdf content')
        });

        // Wait for Green Checks
        await expect(page.locator('.text-green-500').nth(0)).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.text-green-500').nth(1)).toBeVisible({ timeout: 15000 });
        console.log('TEST: Real Documents Uploaded Successfully!');

        await page.click('button:has-text("Next Step")');

        // Step 4: Loan Details
        await expect(page.locator('text=Loan Details')).toBeVisible();
        await page.fill('input[type="range"]', '10000');
        await page.click('button:has-text("12 Months")');

        // Submit
        await page.click('button:has-text("Submit Application")');
        console.log('TEST: Submitting Application to Real DB...');

        // Step 5: Success
        await expect(page.locator('text=Application Received!')).toBeVisible({ timeout: 15000 });
        console.log('TEST: Live Application Submitted Successfully!');
        await page.screenshot({ path: 'test-results/screenshots/7-success.png' });

        // 6. Admin Check
        console.log('TEST: Navigating to Admin Portal...');
        await page.goto('/admin');
        await expect(page.locator('text=Pending Loans')).toBeVisible();
        await expect(page.locator(`text=N$ 10000`)).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: 'test-results/screenshots/9-admin-dashboard.png' });
        console.log('TEST: Admin Portal Verified.');

        // 7. Dashboard Check (Day 4 Requirement: Real User Data)
        console.log('TEST: Navigating back to User Dashboard to verify Real Data Connection...');
        await page.goto('/dashboard');

        // Take a debug screenshot immediately
        await page.waitForTimeout(2000); // Wait a bit for fetch
        await page.screenshot({ path: 'test-results/screenshots/debug-dashboard-state.png' });

        await expect(page.locator('text=Welcome back')).toBeVisible();

        // Verify Active Loan Card
        // Scoping to the loan card container in Real Dashboard
        console.log('TEST: Checking for Active Loan card...');
        await expect(page.locator('text=Active Loan')).toBeVisible({ timeout: 15000 });

        await expect(page.getByText('N$ 10000')).toBeVisible();
        await expect(page.locator('span').filter({ hasText: 'pending' }).first()).toBeVisible();

        // Verify Verification Card (Should be pending)
        await expect(page.locator('text=Employment Status')).toBeVisible();
        await expect(page.locator('span.text-2xl').filter({ hasText: 'Pending' })).toBeVisible();

        console.log('TEST: User Dashboard Verified with Real Data.');
        await page.screenshot({ path: 'test-results/screenshots/10-user-dashboard-final.png' });

        // 4. Logout
        await page.goto('/login');
        await expect(page.locator('text=Log In')).toBeVisible();

        // 5. Cleanup
        if (user && user.user) {
            console.log('TEST: Cleaning up - Deleting test user...');
            await supabaseAdmin.auth.admin.deleteUser(user.user.id);
        }
    });
});
