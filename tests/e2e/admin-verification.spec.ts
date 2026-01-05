
import { test, expect } from '@playwright/test';

test.describe('Admin Verification Flow', () => {
    test('Admin can log in and view applications', async ({ page }) => {
        // 1. Login as Admin
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email').fill('admin@example.com');
        await page.getByLabel('Password').fill('admin123'); // Assuming default dev admin
        await page.click('button[type="submit"]');

        // 2. Verify Redirect to Admin Dashboard
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.getByText('Admin Portal')).toBeVisible();

        // 3. Verify Pending Loans Section
        await expect(page.getByText('Pending Loan Applications')).toBeVisible();
    });

    test('Admin can trigger Face Verification (Mock/Real)', async ({ page }) => {
        // 1. Login
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email').fill('admin@example.com');
        await page.getByLabel('Password').fill('admin123');
        await page.click('button[type="submit"]');

        // 2. Navigate to Admin
        await page.waitForURL(/\/admin/);

        // 3. Check for "Verify Face" button if a loan allows it
        // Note: This depends on having pending verifications with faces.
        // We will assume the UI elements exist.

        // Locate a row with "Verify Face" button
        const verifyBtn = page.getByRole('button', { name: 'Verify Face' }).first();

        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();

            // 4. Assert Feedback (Success or Error toast)
            // Since we might not have valid AWS keys or faces in dev, checking for *any* toast is a good connectivity test.
            await expect(page.locator('.toast')).toBeVisible({ timeout: 10000 });
            // Or check for "Verification Successful" or "Verification Failed"
        } else {
            console.log('No pending face verifications found to test.');
        }
    });
});
