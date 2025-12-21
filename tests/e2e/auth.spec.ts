import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
    test('should show signup form and validate fields', async ({ page }) => {
        await page.goto('/signup');

        // Check page loads
        await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

        // Try to submit empty form
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should show validation errors
        await expect(page.getByText('Full name must be at least 3 characters')).toBeVisible();
        await expect(page.getByText('Invalid email address')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
        await page.goto('/signup');

        // Fill in fields with weak password
        await page.getByLabel('Full Name').fill('John Doe');
        await page.getByLabel('Email', { exact: true }).fill('john@example.com');
        await page.getByLabel('Password', { exact: true }).fill('weak');
        await page.getByLabel('Confirm Password').fill('weak');

        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should show password validation errors
        await expect(page.getByText(/Password must be at least 8 characters/)).toBeVisible();
    });

    test('should show email sent confirmation after valid signup', async ({ page }) => {
        await page.goto('/signup');

        // Fill in valid data
        const timestamp = Date.now();
        await page.getByLabel('Full Name').fill('Test User');
        await page.getByLabel('Email', { exact: true }).fill(`test${timestamp}@example.com`);
        await page.getByLabel('Password', { exact: true }).fill('Test1234');
        await page.getByLabel('Confirm Password').fill('Test1234');

        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should show email confirmation
        await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 10000 });
    });

    test('should show login form', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    });

    test('should validate login fields', async ({ page }) => {
        await page.goto('/login');

        // Try empty submission
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByText('Invalid email address')).toBeVisible();
        await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should navigate to forgot password', async ({ page }) => {
        await page.goto('/login');

        await page.getByRole('link', { name: 'Forgot password?' }).click();

        await expect(page).toHaveURL('/forgot-password');
        await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible();
    });

    test('should submit forgot password request', async ({ page }) => {
        await page.goto('/forgot-password');

        await page.getByLabel('Email').fill('test@example.com');
        await page.getByRole('button', { name: 'Send Reset Link' }).click();

        await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 5000 });
    });
});
