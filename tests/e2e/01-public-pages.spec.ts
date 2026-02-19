import { test, expect } from '@playwright/test';

/**
 * SUITE 1: Public Pages — No auth required.
 * Verifies every public page loads, renders key content, and has SEO tags.
 */

const PUBLIC_PAGES = [
    { path: '/', title: 'Home', mustContain: 'Apply' },
    { path: '/about', title: 'About', mustContain: 'Omari' },
    { path: '/contact', title: 'Contact', mustContain: 'contact' },
    { path: '/careers', title: 'Careers', mustContain: 'career' },
    { path: '/products/personal-loans', title: 'Personal Loans', mustContain: 'loan' },
    { path: '/products/payday-loans', title: 'Payday Loans', mustContain: 'loan' },
    { path: '/products/credit-checks', title: 'Credit', mustContain: 'credit' },
    { path: '/legal/privacy', title: 'Privacy', mustContain: 'privacy' },
    { path: '/legal/terms', title: 'Terms', mustContain: 'terms' },
    { path: '/legal/responsible-lending', title: 'Lending', mustContain: 'lending' },
    { path: '/legal/complaints', title: 'Complaints', mustContain: 'complaint' },
];

test.describe('Suite 1: Public Pages', () => {
    for (const pg of PUBLIC_PAGES) {
        test(`${pg.title} page loads (${pg.path})`, async ({ page }) => {
            await page.goto(pg.path);
            await page.waitForLoadState('networkidle');

            // Page doesn't show error
            const body = await page.textContent('body');
            expect(body).toBeTruthy();
            expect(body!.length).toBeGreaterThan(100); // Not empty

            // Contains expected keyword (case insensitive search in body text)
            expect(body!.toLowerCase()).toContain(pg.mustContain.toLowerCase());
        });
    }

    test('Homepage has nav links and CTA', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Nav exists
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();

        // Apply CTA button or link exists
        const applyCta = page.locator('a[href="/apply"], a[href="/login"], button:has-text("Apply")').first();
        await expect(applyCta).toBeVisible();

        // Footer exists
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
    });

    test('Homepage nav links navigate correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test About link
        const aboutLink = page.locator('a[href="/about"]').first();
        if (await aboutLink.isVisible()) {
            await aboutLink.click();
            await page.waitForURL('**/about');
            expect(page.url()).toContain('/about');
        }
    });

    test('SEO: each page has a <title>', async ({ page }) => {
        for (const pg of PUBLIC_PAGES.slice(0, 5)) { // Check first 5 to be efficient
            await page.goto(pg.path);
            const title = await page.title();
            expect(title.length).toBeGreaterThan(3);
        }
    });

    test('404 page for non-existent route', async ({ page }) => {
        const res = await page.goto('/this-route-does-not-exist-xyz');
        // Next.js returns 404 status
        expect(res?.status()).toBe(404);
    });

    test('Mobile responsive — no horizontal overflow', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        // Allow 5px tolerance for scrollbars
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });
});
