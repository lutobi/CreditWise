import { test, expect } from '@playwright/test';

test.describe('Loan Calculator', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display loan calculator on homepage', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Loan Calculator' })).toBeVisible();
        await expect(page.getByText('Term Loan')).toBeVisible();
        await expect(page.getByText('Payday Loan')).toBeVisible();
    });

    test('should toggle between Term Loan and Payday Loan', async ({ page }) => {
        // Default is Term Loan
        await expect(page.getByRole('button', { name: 'Term Loan' })).toHaveClass(/bg-primary/);

        // Switch to Payday Loan
        await page.getByRole('button', { name: 'Payday Loan' }).click();
        await expect(page.getByRole('button', { name: 'Payday Loan' })).toHaveClass(/bg-primary/);

        // Check info badge updates
        await expect(page.getByText('30% flat fee')).toBeVisible();
    });

    test('should update loan amount with slider', async ({ page }) => {
        const slider = page.locator('input[type="range"]').first();

        // Set slider to max (50000)
        await slider.fill('50000');

        // Check display updates - use more specific selector
        const amountDisplay = page.locator('.space-y-3').first().getByText(/N\$ 50,000/);
        await expect(amountDisplay).toBeVisible();
    });

    test('should update duration with slider', async ({ page }) => {
        const durationSlider = page.locator('input[type="range"]').nth(1);

        // Set duration to 12 months
        await durationSlider.fill('12');

        await expect(page.getByText('12 Months')).toBeVisible();
    });

    test('should calculate monthly payment for Term Loan', async ({ page }) => {
        // Set loan amount to 10,000
        await page.locator('input[type="range"]').first().fill('10000');

        // Set duration to 12 months
        await page.locator('input[type="range"]').nth(1).fill('12');

        // Should show monthly payment (calculation will vary)
        const monthlyPayment = page.getByText(/Monthly Payment/).locator('..').getByText(/N\$/);
        await expect(monthlyPayment).toBeVisible();
    });

    test('should calculate for Payday Loan', async ({ page }) => {
        // Switch to Payday Loan
        await page.getByRole('button', { name: 'Payday Loan' }).click();

        // Payday loan should have different duration range (1-5 months)
        const durationSlider = page.locator('input[type="range"]').nth(1);
        await expect(durationSlider).toHaveAttribute('max', '5');

        // Set values
        await page.locator('input[type="range"]').first().fill('5000');
        await durationSlider.fill('3');

        // Should show calculations
        await expect(page.getByText('Total Repayment')).toBeVisible();
        await expect(page.getByText('Effective APR')).toBeVisible();
    });

    test('should navigate to signup on Apply button click', async ({ page }) => {
        await page.getByRole('button', { name: /Apply for N\$/ }).click();

        await expect(page).toHaveURL(/signup/);
    });
});
