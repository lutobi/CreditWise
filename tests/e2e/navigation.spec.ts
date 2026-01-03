import { test, expect } from '@playwright/test';

test.describe('Navigation and Auth State', () => {
    test('should show correct navbar for logged out user', async ({ page }) => {
        await page.goto('/');

        // Should show Log In and Get Started buttons
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    });

    test('should navigate to Features section', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('link', { name: 'Features' }).click();

        // Should scroll to features section
        await expect(page.getByRole('heading', { name: 'Why Choose CreditWise?' })).toBeInViewport();
    });

    test('should navigate to How it Works section', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('link', { name: 'How it Works' }).first().click();

        await expect(page.getByRole('heading', { name: 'How It Works' })).toBeInViewport();
    });

    test('should redirect to login when accessing protected routes', async ({ page }) => {
        await page.goto('/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing apply page without auth', async ({ page }) => {
        await page.goto('/apply');

        await expect(page).toHaveURL(/login/);
    });

    test('should navigate between signup and login', async ({ page }) => {
        await page.goto('/login');

        // Click sign up link
        await page.getByRole('link', { name: 'Sign up' }).click();
        await expect(page).toHaveURL('/signup');

        // Go back to login
        await page.getByRole('link', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/login');
    });
});
