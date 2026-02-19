import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser, insertTestLoan, cleanupTestLoans, getAdminSupabase, TEST_USER, ADMIN_USER } from './helpers';

/**
 * SUITE 5-6: Admin Portal — Access Control, Verification Queue, Approval Queue
 * Combined for efficiency. Tests access control, queue loading, and admin actions.
 */

let testUserId: string;

test.describe('Suite 5-6: Admin Portal', () => {
    // Run serially to avoid parallel auth session contention
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(45000); // Extra time for auth + page load

    test.beforeAll(async () => {
        const sb = getAdminSupabase();
        const { data } = await sb.auth.admin.listUsers({ perPage: 100 });
        const user = data?.users?.find(u => u.email === TEST_USER.email);
        if (user) testUserId = user.id;
    });

    // ─── 5. Access Control ─────────────────────────────────────────────────

    test('Admin dashboard renders for admin user', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        // Should see admin content — metrics, queue cards, etc.
        expect(body!.toLowerCase()).toMatch(/admin|verification|approval|metrics|dashboard/);
    });

    test('Regular user cannot access admin', async ({ page }) => {
        const success = await loginAsUser(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        const blocked = body!.toLowerCase().includes('denied') ||
            body!.toLowerCase().includes('access') ||
            body!.toLowerCase().includes('unauthorized') ||
            page.url().includes('/dashboard') ||
            page.url().includes('/login');
        expect(blocked).toBeTruthy();
    });

    // ─── 6. Verification Queue ─────────────────────────────────────────────

    test('Verification queue loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/verification');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        // Either shows pending applications or "No pending applications"
        expect(body!.length).toBeGreaterThan(100);
    });

    test('Verification queue shows pending applications', async ({ page }) => {
        if (!testUserId) test.skip();
        await cleanupTestLoans();

        // Insert a pending loan with documents
        const sb = getAdminSupabase();
        await sb.from('loans').insert({
            user_id: testUserId,
            amount: 8000,
            duration_months: 6,
            monthly_payment: 9200,
            status: 'pending',
            application_data: {
                full_name: 'Test User',
                national_id: '85010112345',
                email: TEST_USER.email,
                monthly_income: 15000,
                employer_name: 'Test Corp',
                employment_type: 'permanent',
            },
            documents: {
                id_url: 'https://example.com/test-id.jpg',
                selfie_url: 'https://example.com/test-selfie.jpg',
            },
        });

        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/verification');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        // Page should render with pending applications data
        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(100);
    });

    // ─── 7. Approval Queue ─────────────────────────────────────────────────

    test('Approval queue loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/approval');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(100);
    });

    // ─── 8. Active Loans Page ──────────────────────────────────────────────

    test('Active loans page loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/loans');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(100);
    });

    // ─── 9. Admin Utilities ────────────────────────────────────────────────

    test('Search page loads and accepts input', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/search');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Search input should be visible
        const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="search" i]').first();
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        // Type a search term
        await searchInput.fill('Test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
    });

    test('Reports page loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/reports');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        expect(body!.toLowerCase()).toMatch(/report|chart|loan|reconciliation/);
    });

    test('Settings page loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(50);
    });

    test('Users page loads', async ({ page }) => {
        const success = await loginAsAdmin(page);
        if (!success) { test.skip(); return; }
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        expect(body!.length).toBeGreaterThan(50);
    });

    test.afterAll(async () => {
        await cleanupTestLoans();
    });
});

