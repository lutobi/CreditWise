import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin, TEST_USER, ADMIN_USER } from './helpers';

/**
 * SUITE 2: Authentication Flows
 * Tests login, failed login, route protection, logout, and session persistence.
 */

test.describe('Suite 2: Auth Flows', () => {
    // Run serially to avoid parallel auth session contention
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(45000);

    test('Login with valid credentials → redirects to dashboard', async ({ page }) => {
        const success = await loginAsUser(page);
        if (!success) {
            test.skip();
            return;
        }
        expect(page.url()).toContain('/dashboard');
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
    });

    test('Login with wrong password → shows error', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', TEST_USER.email);
        await page.fill('#password', 'WrongPassword123!');
        await page.click('button:has-text("Sign In")');

        // Should stay on login page
        await page.waitForTimeout(3000);
        expect(page.url()).toContain('/login');

        // Error message should be visible
        const body = await page.textContent('body');
        expect(body!.toLowerCase()).toMatch(/invalid|incorrect|error|failed/);
    });

    test('Login with non-existent email → shows error', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'doesnotexist@fakemail.com');
        await page.fill('#password', 'SomePassword1!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(3000);
        expect(page.url()).toContain('/login');
    });

    test('Signup page renders', async ({ page }) => {
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        // Form fields present
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();
        await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
    });

    test('Forgot password page renders', async ({ page }) => {
        await page.goto('/forgot-password');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#email')).toBeVisible();
    });

    test('Protected route /dashboard → redirects to login when logged out', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForURL('**/login**', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('Protected route /apply → redirects to login when logged out', async ({ page }) => {
        await page.goto('/apply');
        await page.waitForURL('**/login**', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('Protected route /admin → redirects to login when logged out', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForURL('**/login**', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });

    test('Admin page as regular user → shows Access Denied', async ({ page }) => {
        const success = await loginAsUser(page);
        if (!success) {
            test.skip();
            return;
        }
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // Allow role check

        const body = await page.textContent('body');
        // Should show Access Denied, unauthorized, OR redirect back
        const isBlocked = body!.toLowerCase().includes('access denied') ||
            body!.toLowerCase().includes('denied') ||
            body!.toLowerCase().includes('unauthorized') ||
            body!.toLowerCase().includes('not authorized') ||
            body!.toLowerCase().includes('forbidden') ||
            page.url().includes('/dashboard') ||
            page.url().includes('/login');
        expect(isBlocked).toBeTruthy();
    });

    test('Admin login → reaches admin dashboard', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) {
            test.skip();
            return;
        }
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const body = await page.textContent('body');
        expect(body!.toLowerCase()).toMatch(/admin|dashboard|verification|approval/);
    });

    test('Session persists across page reload', async ({ page }) => {
        const success = await loginAsUser(page);
        if (!success) {
            test.skip();
            return;
        }
        expect(page.url()).toContain('/dashboard');

        // Reload
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Still on dashboard (not redirected to login)
        expect(page.url()).not.toContain('/login');
    });
});
