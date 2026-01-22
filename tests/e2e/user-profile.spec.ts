
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

test.describe('User Profile Management', () => {
    // Increase timeout for this test
    test.setTimeout(60000);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabaseAdmin: any;
    let testUserId: string;

    test.beforeAll(() => {
        if (!supabaseUrl || !serviceRoleKey) {
            console.warn('Skipping test: Missing Supabase Credentials');
            return;
        }
        supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    });

    test('should allow authenticated user to update profile details', async ({ page }) => {
        // Use seeded user to avoid Rate Limits on creation
        const email = 'lucy@omarifinance.com';
        const password = 'Password123!';
        const timestamp = Date.now();

        console.log(`Using seeded user: ${email}`);

        try {
            // 2. Login
            await page.goto('/login');
            await page.waitForLoadState('networkidle'); // Wait for hydration
            await page.fill('input[id="email"]', email);
            await page.fill('input[id="password"]', password);
            await page.click('button:has-text("Sign In")');

            // Wait for dashboard
            await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
            console.log('Login successful.');

            // 3. Navigate to Profile
            await page.goto('/dashboard/profile');
            await expect(page.locator('h1')).toContainText('My Profile');

            // 4. Update Details
            // Use timestamp to ensure changes are unique and testable
            const newAddress = `123 Automation St ${timestamp}`;
            const newNokName = `Bot ${timestamp}`;

            await page.fill('input[name="phone"]', '0819998888');
            await page.fill('input[name="address"]', newAddress);
            await page.fill('input[name="nokName"]', newNokName);
            await page.fill('input[name="nokPhone"]', '0811234567');
            await page.fill('input[name="nokRelation"]', 'Sibling');

            // 5. Save
            await page.click('button:has-text("Save Changes")');

            // 6. Verify Toast/Success
            await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 10000 });
            console.log('Profile update confirmed.');

            // 7. Take Screenshot
            const screenshotPath = `test-results/profile-update-success.png`; // Fixed name for easier finding
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Screenshot saved to ${screenshotPath}`);

            // 8. Verify Persistence
            await page.reload();
            await expect(page.locator('input[name="address"]')).toHaveValue(newAddress);

        } finally {
            // No cleanup needed for seeded user
        }
    });
});
