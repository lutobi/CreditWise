import { test, expect } from '@playwright/test';

test.describe('Full User Journey & Form UX', () => {
    test('should complete the full loan application flow', async ({ page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()} `));

        // 1. Signup
        const uniqueId = Date.now();
        const email = `testuser${uniqueId} @example.com`;
        const password = 'Password123!';

        await page.goto('/signup');
        await page.fill('input[type="text"]', `Test User ${uniqueId} `);
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Sign Up")');
        console.log('TEST: Signup clicked');

        // Wait for redirect to dashboard or verify email page
        // Since email verification is likely required or mocked, let's see where we land.
        // Assuming for dev/test we might be auto-logged in or redirected.
        // If Supabase requires email verification, this might block. 
        // However, in the previous manual tests, we saw we could proceed.
        // Let's assume we get redirected to dashboard or we can go to /apply.

        // Wait for navigation
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => console.log('TEST: Dashboard redirect timeout'));

        // If we are stuck on "Check your email", we can't proceed easily without mocking.
        // But let's try to go to /apply and see if we are authenticated.
        console.log('TEST: Navigating to /apply');
        await page.goto('/apply');

        // Check if we are redirected to login (meaning signup didn't auto-login)
        if (await page.url().includes('/login')) {
            console.log('TEST: Redirected to login, attempting login...');
            await page.fill('input[type="email"]', email);
            await page.fill('input[type="password"]', password);
            await page.click('button:has-text("Sign In")');
            await page.waitForURL('**/dashboard');
            await page.goto('/apply');
        }
        console.log('TEST: On /apply page');

        // 2. Loan Application - Step 1
        await expect(page.locator('text=Personal Details')).toBeVisible();

        await page.fill('input[placeholder="John"]', 'John');
        await page.fill('input[placeholder="Doe"]', 'Doe');
        await page.fill('input[placeholder="Enter your ID number"]', '85010100123');
        await page.fill('input[placeholder="+264 81 123 4567"]', '+264 81 123 4567');

        await page.click('button:has-text("Next Step")');

        // Verification: Should be on Step 2
        await expect(page.locator('text=Employment Information')).toBeVisible();

        // 3. Loan Application - Step 2
        await page.fill('input[placeholder="Company Ltd"]', 'Acme Corp');
        await page.fill('input[placeholder="15000"]', '15000');
        // Employment Type is a select
        await page.selectOption('select', 'Full-time Permanent');

        await page.click('button:has-text("Next Step")');

        // Verification: Should be on Step 3
        await expect(page.locator('text=Loan Details')).toBeVisible();

        // 4. Loan Application - Step 3
        // Sliders or inputs? The code uses state formData.loanAmount.
        // Let's check the UI for Step 3.
        // It likely has inputs or sliders.
        // Assuming inputs for now based on typical form, or we just click Submit if defaults are okay.

        await page.click('button:has-text("Submit Application")');

        // Verification: Success
        await expect(page.locator('text=Application Received!')).toBeVisible();
    });
});
