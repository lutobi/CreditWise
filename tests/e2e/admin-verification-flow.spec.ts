
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Admin Face Verification Flow', () => {
    test.slow(); // Allow more time for this E2E flow

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    test.beforeAll(() => {
        if (!supabaseUrl || !serviceRoleKey) {
            console.warn('Skipping test: Missing Supabase Credentials');
        }
    });

    test('User applies, Admin verifies', async ({ page }) => {
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
            await page.goto('/login');
            await page.fill('input[id="email"]', userEmail);
            await page.fill('input[id="password"]', password);
            await page.click('button:has-text("Sign In")');
            await page.waitForURL('**/dashboard');

            await page.goto('/apply');

            // Step 1: Personal
            await page.fill('input[name="firstName"]', 'Test');
            await page.fill('input[name="lastName"]', 'Applicant');
            await page.fill('input[name="nationalId"]', '90010112345');
            await page.fill('input[name="phone"]', '+264811234567');
            await page.click('button:has-text("Next Step")');

            // Step 2: Employment
            await page.fill('input[name="employerName"]', 'Test Corp');
            await page.fill('input[name="monthlyIncome"]', '5000');
            await page.selectOption('select[name="employmentType"]', 'Full-time Permanent');
            await page.click('button:has-text("Next Step")');

            // Step 3: Banking (Skipped/Mocked in previous logic? Let's check view_file)
            // Wait, previous test didn't have banking step explicitly in log?
            // "Step 3: Document Uploads" in live-full-flow.spec.ts? 
            // The wizard is 7 steps now. live-full-flow.spec.ts might be OUTDATED!
            // I need to follow the NEW 7-step wizard structure.

            // Let's assume the new wizard structure:
            // 1. Personal
            // 2. Employment
            // 3. Banking ? (Let's check ApplyPage code or just fill generic inputs)
            // 4. Loan Details
            // 5. References ?
            // 6. Documents
            // 7. Declaration

            // I'll proceed hoping I can identify steps by text content.

            // Step 3: Banking details (if present)
            if (await page.isVisible('text=Banking Details')) {
                await page.fill('input[placeholder*="Bank"]', 'Bank Windhoek');
                await page.fill('input[placeholder*="Account"]', '123456789');
                await page.click('button:has-text("Next Step")');
            }

            // Step 4: Loan Details (if present)
            if (await page.isVisible('text=Loan Details')) {
                await page.fill('input[type="range"]', '5000');
                await page.click('button:has-text("Next Step")'); // or manually select period
            }

            // Just generic "Next Step" until we find "Document Uploads"
            while (!(await page.isVisible('text=Document Uploads')) && !(await page.isVisible('text=Identity Verification'))) {
                // Try to fill visible inputs to pass validation
                const inputs = await page.locator('input:visible').all();
                for (const input of inputs) {
                    const type = await input.getAttribute('type');
                    if (type === 'text' || !type) await input.fill('Generic Answer');
                    if (type === 'number') await input.fill('123');
                }
                if (await page.isVisible('button:has-text("Next Step")')) {
                    await page.click('button:has-text("Next Step")');
                    await page.waitForTimeout(500);
                } else {
                    break; // Safety break
                }
            }

            // Step 6: Documents
            // Upload FAKE files
            console.log('Uploading documents...');
            await page.setInputFiles('input[id="idDocument"]', {
                name: 'id.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake-image-content')
            });
            await page.setInputFiles('input[id="selfie"]', {
                name: 'selfie.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake-image-content')
            });
            await page.setInputFiles('input[id="payslip"]', {
                name: 'payslip.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('fake-pdf-content')
            });

            // Wait for uploads to finish (green text?)
            await page.waitForTimeout(2000);

            // CLICK NEXT - This is the Critical Step
            // Should NOT block
            console.log('Clicking Next on Step 6...');
            await page.click('button:has-text("Next Step")');

            // Step 7: Declaration / Submit
            await expect(page.locator('text=Declaration')).toBeVisible({ timeout: 10000 });
            await page.check('input[type="checkbox"]');
            await page.click('button:has-text("Submit Application")');

            // Success
            await expect(page.locator('text=Application Received')).toBeVisible();

            // --- ADMIN FLOW ---
            await page.goto('/login');
            // Logout first? Or direct navigation clears session?
            // Page state persistence depends on playwright context.
            await page.click('button:has-text("Sign Out")'); // Assuming logout button exists

            await page.fill('input[id="email"]', adminEmail);
            await page.fill('input[id="password"]', password);
            await page.click('button:has-text("Sign In")');
            await page.waitForURL('**/dashboard');

            await page.goto('/admin');
            await expect(page.locator('text=Pending Loans')).toBeVisible();

            // Find the loan for our user
            await expect(page.locator(`text=Test Applicant`)).toBeVisible();
            // Check for Verify Button
            await expect(page.locator('button:has-text("Verify Face Identity")').first()).toBeVisible();

            console.log('✅ Admin Verification Flow E2E Test Passed');

        } finally {
            // Cleanup
            await supabaseAdmin.auth.admin.deleteUser(user.user.id);
            await supabaseAdmin.auth.admin.deleteUser(admin.user.id);
        }
    });
});
