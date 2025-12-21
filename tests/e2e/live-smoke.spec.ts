nowimport { test, expect } from '@playwright/test';

test.describe('Live Smoke Test (Real Backend)', () => {
    // These tests run against the LIVE application with REAL .env.local credentials.
    // they do NOT use mocks (page.route) except for potentially dangerous ops if needed.

    test('should load the landing page (Public Access)', async ({ page }) => {
        console.log('Using Base URL:', test.info().project.use.baseURL);
        await page.goto('/');

        // Check for key elements that indicate successful render
        await expect(page.locator('text=Unlock Your Financial Potential')).toBeVisible();
        await expect(page.locator('text=Get Started').first()).toBeVisible();
    });

    test('should enforce RLS/Auth protection on Dashboard', async ({ page }) => {
        // Attempt to go directly to dashboard without logging in
        await page.goto('/dashboard');

        // Should verify we are redirected to Login
        await expect(page).toHaveURL(/.*\/login/);
        await expect(page.locator('text=Sign In')).toBeVisible();
    });

    test('should load Signup page (Supabase Auth Connectivity)', async ({ page }) => {
        await page.goto('/signup');
        // If Supabase client fails to initialize (missing keys), this page might crash or show error
        await expect(page.locator('text=Create an Account')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });
});
