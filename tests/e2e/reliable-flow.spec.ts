import { test, expect } from '@playwright/test';

test.describe('Reliable Loan Application Flow', () => {
    test('should complete the full loan application flow successfully', async ({ page }) => {
        // 1. Generate unique user
        const timestamp = Date.now();
        const email = `e2e.reliable.${timestamp}@example.com`;
        const password = 'TestPassword123!';

        console.log(`TEST: Starting test with user: ${email}`);

        // 2. Signup
        await page.goto('http://localhost:3000/signup');
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="fullName"]', 'E2E Test User');
        await page.fill('input[id="password"]', password);
        await page.fill('input[id="confirmPassword"]', password);
        await page.click('button:has-text("Sign Up")');

        // Wait for "Check your email" or redirection
        // Since the app always shows "Check your email" even if auto-confirmed:
        await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });
        console.log('TEST: Signup successful, "Check your email" visible');

        // 3. Login (since we can't auto-login from signup page logic)
        await page.click('text=Go to Login');
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="password"]', password);
        await page.click('button:has-text("Sign In")');

        // Wait for dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('TEST: Login successful, redirected to dashboard');

        // 4. Navigate to Apply
        await page.goto('http://localhost:3000/apply');
        console.log('TEST: Navigated to /apply');

        // 4. Step 1: Personal Details
        await page.fill('input[placeholder="John"]', 'Test');
        await page.fill('input[placeholder="Doe"]', 'User');
        await page.fill('input[placeholder="Enter your ID number"]', '90010100123'); // Valid length
        await page.fill('input[placeholder="+264 81 123 4567"]', '+264 81 123 4567');

        console.log('TEST: Filled Step 1');

        // Robust click for Next Step
        const nextButton = page.locator('button:has-text("Next Step")');
        await expect(nextButton).toBeVisible();
        await nextButton.click();

        // 5. Step 2: Employment Information
        await expect(page.locator('text=Employment Information')).toBeVisible({ timeout: 5000 });
        console.log('TEST: Advanced to Step 2');

        await page.fill('input[placeholder="Company Ltd"]', 'Test Corp');
        await page.fill('input[placeholder="15000"]', '25000');

        await nextButton.click();

        // 6. Step 3: Loan Details
        await expect(page.locator('text=Loan Details')).toBeVisible({ timeout: 5000 });
        console.log('TEST: Advanced to Step 3');

        // Adjust loan amount (optional, just to interact)
        await page.fill('input[type="range"]', '10000');

        // 7. Submit Application
        const submitButton = page.locator('button:has-text("Submit Application")');
        await expect(submitButton).toBeVisible();
        await submitButton.click();
        console.log('TEST: Clicked Submit');

        // 8. Verify Success
        // Wait for success message or redirection
        await expect(page.locator('text=Application Received!')).toBeVisible({ timeout: 10000 });
        console.log('TEST: Success message visible!');

        // 9. Verify Dashboard
        await page.click('button:has-text("Go to Dashboard")');
        await expect(page.locator('text=Active Loan')).toBeVisible();
        console.log('TEST: Dashboard verified');
    });
});
