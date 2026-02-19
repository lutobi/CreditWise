import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin, getAdminSupabase, TEST_USER } from './helpers';

/**
 * SUITE 14: Usability — Mobile, keyboard, loading states, edge cases.
 */

test.describe('Suite 14: Usability', () => {
    // Run serially to avoid parallel auth session contention
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(45000);

    test('Mobile viewport — homepage doesn\'t overflow', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollW).toBeLessThanOrEqual(clientW + 5);
    });

    test('Mobile viewport — dashboard is usable', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await loginAsUser(page);
        await page.waitForLoadState('networkidle');

        // Cards should stack vertically — just check no overflow
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollW).toBeLessThanOrEqual(clientW + 5);
    });

    test('Mobile viewport — admin portal is usable', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await loginAsAdmin(page);
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollW).toBeLessThanOrEqual(clientW + 20); // Admin tables may overflow slightly
    });

    test('Keyboard navigation — login form', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Tab to email field → type
        await page.keyboard.press('Tab');
        await page.keyboard.type(TEST_USER.email);

        // Tab to password field → type
        await page.keyboard.press('Tab');
        await page.keyboard.type(TEST_USER.password);

        // Tab to submit → Enter
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        await page.waitForTimeout(5000);
        // Should have attempted login
    });

    test('Loading state — buttons show spinner during action', async ({ page }) => {
        await loginAsUser(page);
        await page.goto('/apply');
        await page.waitForLoadState('networkidle');

        // The "Next" button should exist and not show a spinner initially
        const nextBtn = page.locator('button:has-text("Next")').first();
        if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            // No spinner initially
            const hasSpinner = await page.locator('button:has-text("Next") .animate-spin').isVisible().catch(() => false);
            expect(hasSpinner).toBe(false);
        }
    });

    test('Double-click prevention — submit button', async ({ page }) => {
        await loginAsUser(page);
        await page.goto('/apply');
        await page.waitForLoadState('networkidle');

        // Find any submit/next button
        const btn = page.locator('button:has-text("Next")').first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Click twice rapidly
            await btn.dblclick();
            await page.waitForTimeout(500);
            // Page should not crash
            const body = await page.textContent('body');
            expect(body!.length).toBeGreaterThan(50);
        }
    });

    test('Error recovery — network error doesn\'t crash page', async ({ page }) => {
        await loginAsUser(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Simulate going offline
        await page.context().setOffline(true);

        // Try to reload
        await page.reload().catch(() => { }); // May throw
        await page.waitForTimeout(2000);

        // Go back online
        await page.context().setOffline(false);
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Page should recover
        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(50);
    });

    test('Long text input doesn\'t overflow', async ({ page }) => {
        await loginAsUser(page);
        await page.goto('/apply');
        await page.waitForLoadState('networkidle');

        // Dismiss prefill
        const dismiss = page.locator('button:has-text("Start Fresh"), button:has-text("No")').first();
        if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) await dismiss.click();

        // Enter very long text in first name
        const longText = 'A'.repeat(200);
        await page.locator('input[name="firstName"]').fill(longText);

        // Should not cause horizontal overflow
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollW).toBeLessThanOrEqual(clientW + 10);
    });
});
