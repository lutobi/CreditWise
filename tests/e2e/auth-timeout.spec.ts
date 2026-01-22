
import { test, expect } from '@playwright/test';

test.describe('Auth Idle Timeout', () => {
    test.beforeEach(async ({ page }) => {
        // Handle client-side routing
        await page.goto('http://localhost:3000/login');
    });

    test('should logout user after 20 minutes of inactivity', async ({ page, context }) => {
        // 1. Mock Login
        await page.route(/.*\/auth\/v1\/token.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake-token', user: { id: 'user-1', email: 'test@example.com' }, expires_in: 3600 }) });
        });
        await page.route(/.*\/auth\/v1\/user.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: 'user-1', email: 'test@example.com', aud: 'authenticated' }) });
        });

        // Mock Session Storage for instant login
        await page.evaluate(() => {
            const fakeUser = { id: 'user-1', email: 'test@example.com', aud: 'authenticated' };
            // Note: Current implementation checks localStorage for mock user in DEV, 
            // but production uses Supabase session. 
            // The AuthProvider uses `supabase.auth.onAuthStateChange`. 
            // To properly test the timer which starts inside useEffect, we need the component to mount AND believe it's logged in.

            // For this test, satisfying the "Mock User" check in AuthProvider is easiest if we want to bypass real Supabase
            localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });

        // 2. Install Fake Clock (Must proceed navigation that starts timers)
        await page.clock.install();

        // 3. Go to Dashboard (Timer starts on mount of AuthProvider/Session)
        await page.goto('http://localhost:3000/dashboard');

        // Verify we are logged in
        await expect(page.locator('text=Sign Out')).toBeVisible();

        // 4. Advance 19 minutes (Should still be logged in)
        await page.clock.fastForward(19 * 60 * 1000);
        await expect(page.locator('text=Sign Out')).toBeVisible();

        // 5. Advance 2 minutes (Total 21 > 20) -> Should Logout
        await page.clock.fastForward(2 * 60 * 1000);

        // Verify Redirection to Login
        // The provider pushes '/login?reason=timeout'
        await expect(page).toHaveURL(/.*\/login\?reason=timeout/);
    });

    test('should reset timer on activity', async ({ page }) => {
        // 1. Mock Login (Same setup)
        await page.evaluate(() => {
            const fakeUser = { id: 'user-1', email: 'test@example.com', aud: 'authenticated' };
            localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });

        await page.clock.install();
        await page.goto('http://localhost:3000/dashboard');
        await expect(page.locator('text=Sign Out')).toBeVisible();

        // 2. Advance 15 minutes
        await page.clock.fastForward(15 * 60 * 1000);

        // 3. Trigger Activity (Click)
        await page.mouse.click(100, 100);

        // 4. Advance 10 minutes (Total 25 from start, but only 10 from click)
        // Should STILL be logged in because timer reset
        await page.clock.fastForward(10 * 60 * 1000);
        await expect(page.locator('text=Sign Out')).toBeVisible();

        // 5. Advance 11 minutes (Total 21 from click) -> Should Logout
        await page.clock.fastForward(11 * 60 * 1000);
        await expect(page).toHaveURL(/.*\/login\?reason=timeout/);
    });
});
