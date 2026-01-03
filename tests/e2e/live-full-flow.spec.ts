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

        // 1.5 Create Profile
        // WE REMOVE THIS MANUALLY to test if the Application Flow auto-creates it now.
        // See src/app/apply/page.tsx update.
        // const { error: profileError } = await supabaseAdmin.from('profiles').insert({...});
        console.log('TEST: Skipping manual profile creation to verify App Self-Healing...');

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

        // Wait for Green Checks for Files
        await expect(page.locator('.text-green-500').nth(0)).toBeVisible({ timeout: 15000 });
        await expect(page.locator('.text-green-500').nth(1)).toBeVisible({ timeout: 15000 });
        console.log('TEST: Real Documents Uploaded Successfully!');

        // Live Selfie Capture (Using Fake Camera)
        console.log('TEST: Capturing Live Selfie...');
        await expect(page.locator('text=Live Selfie (Liveness Check)')).toBeVisible();
        await page.click('button:has-text("Capture Live Selfie")');
        // Wait for "Selfie Captured" confirmation
        await expect(page.locator('text=Selfie Captured')).toBeVisible({ timeout: 10000 });
        console.log('TEST: Selfie Captured Successfully!');

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

        console.log('TEST: Live Application Submitted Successfully!');
        await page.screenshot({ path: 'test-results/screenshots/7-success.png' });

        // (Removed Admin Check for Regular User - Security Policy now blocks this)

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
        console.log('TEST: Logging out...');
        await page.click('button:has-text("Sign Out")');
        // Wait for redirect to login or home
        await expect(page.locator('text=Log In')).toBeVisible();

        // 5. Cleanup
        if (user && user.user) {
            console.log('TEST: Cleaning up - Deleting test user...');
            await supabaseAdmin.auth.admin.deleteUser(user.user.id);
        }
    });

    test('should allow ADMIN to verify user and approve loan', async ({ page }) => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            test.skip(true, 'Skipping: Missing SUPABASE_SERVICE_ROLE_KEY');
            return;
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Setup: Create a Regular User AND an Admin User
        const uniqueId = Date.now();
        const userEmail = `user.${uniqueId}@example.com`;
        const adminEmail = `admin.${uniqueId}@example.com`;
        const password = 'Password123!';

        // Create Regular User
        const { data: regularUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            password: password,
            email_confirm: true
        });
        if (userError) throw userError;

        // Create Profile for Regular User
        const uniqueName = `Regular Applicant ${uniqueId}`;
        await supabaseAdmin.from('profiles').insert({
            id: regularUser.user.id,
            full_name: uniqueName,
            national_id: '90090012345'
        });

        // Create Verification Record (Pending)
        await supabaseAdmin.from('verifications').insert({
            user_id: regularUser.user.id,
            employer_name: 'Test Corp',
            monthly_income: 6000,
            is_employed: false
        });

        // Create Admin User with Meta Data
        const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: password,
            email_confirm: true,
            app_metadata: { role: 'admin' }, // KEY: Give Admin Role
            user_metadata: { full_name: 'Admin User' }
        });
        if (adminError) throw adminError;

        console.log(`TEST: Created Regular User (${userEmail}) and Admin User (${adminEmail})`);

        // 2. Login as Admin
        await page.goto('/login');
        await page.fill('input[id="email"]', adminEmail);
        await page.fill('input[id="password"]', password);
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard');

        // 3. Navigate to Admin Portal
        console.log('TEST: Admin navigating to portal...');
        await page.goto('/admin');
        await expect(page.locator('text=Admin Portal')).toBeVisible();

        // 4. Verify the Pending Verification is Visible
        await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
        await page.screenshot({ path: 'test-results/screenshots/admin-portal-pending.png' });

        // 5. Click "Verify & Calculate Score"
        // Find the card containing the unique name, then find the button within it.
        // We scope to the direct children of the container that have the text.
        await page.locator('.space-y-4 > div').filter({ hasText: uniqueName }).getByRole('button', { name: 'Verify & Calculate Score' }).click();

        // 6. Handle Alert/Confirmation
        // ideally the UI updates "Pending" to "Verified" or removes it from the list.
        await expect(page.locator(`text=${uniqueName}`)).toBeHidden({ timeout: 10000 });

        console.log('TEST: Applicant removed from pending list -> Verification Success.');

        // 7. Verify DB State
        const { data: verifyCheck } = await supabaseAdmin.from('verifications').select('*').eq('user_id', regularUser.user.id).single();
        expect(verifyCheck.is_employed).toBe(true);
        expect(verifyCheck.credit_score).toBeGreaterThan(300); // 300 base + 100 for >5000 income
        console.log('TEST: Database verified. Score:', verifyCheck.credit_score);

        // Cleanup
        await supabaseAdmin.auth.admin.deleteUser(regularUser.user.id);
        await supabaseAdmin.auth.admin.deleteUser(adminUser.user.id);
    });
});
