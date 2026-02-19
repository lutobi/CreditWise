
import { test, expect } from '@playwright/test';

test.describe('Admin Verification Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Build robust logging
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    });

    test('Admin can view verification queue and load selfie image', async ({ page }) => {
        // 1. Mock Admin Login
        await page.route(/.*\/auth\/v1\/token.*/, async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    access_token: 'admin-token',
                    user: {
                        id: 'admin-user',
                        aud: 'authenticated',
                        role: 'authenticated',
                        email: 'admin@example.com',
                        app_metadata: { role: 'admin_verifier' },
                        user_metadata: { full_name: 'Admin User' }
                    }
                })
            });
        });

        await page.route(/.*\/auth\/v1\/user.*/, async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 'admin-user',
                    app_metadata: { role: 'admin_verifier' },
                    user_metadata: { full_name: 'Admin User' }
                })
            });
        });

        // 2. MOCK THE NEW SERVER-SIDE API RESPONSE
        await page.route('/api/admin/verification-queue', async route => {
            console.log('MOCK: Intercepted /api/admin/verification-queue');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [
                        {
                            loan_id: 'test-loan-1',
                            user_id: 'user-1',
                            amount: 5000,
                            duration_months: 1,
                            status: 'pending',
                            created_at: new Date().toISOString(),
                            full_name: 'Test Borrower',
                            national_id: '123456789',
                            monthly_income: 10000,
                            employer_name: 'Test Corp',
                            employment_type: 'Permanent',
                            is_employed: false,
                            reference_id: 'REF-123',
                            documents: {
                                // Use a Base64 image to bypass DNS/Network issues
                                selfie_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                                id_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                                payslip_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
                            }
                        }
                    ]
                })
            });
        });

        // Mock Supabase Auth User Endpoint
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'admin-user',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'admin@example.com',
                    app_metadata: { role: 'admin_verifier' },
                    user_metadata: { full_name: 'Admin User' },
                    created_at: new Date().toISOString()
                })
            });
        });

        // 3. Navigate (Inject Mock User)
        await page.goto('http://localhost:3000/login');
        await page.evaluate(() => {
            const fakeUser = {
                id: 'admin-user',
                email: 'admin@example.com',
                app_metadata: { role: 'admin_verifier' },
                user_metadata: { full_name: 'Admin User' },
                aud: 'authenticated',
                created_at: new Date().toISOString()
            };
            window.localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });

        await page.goto('http://localhost:3000/admin/verification');

        // 4. Verify Page Header
        await expect(page.getByRole('heading', { name: 'Verification Queue' })).toBeVisible({ timeout: 10000 });

        // 5. Verify Queue Item Loaded
        await expect(page.getByText('Test Borrower')).toBeVisible();

        // 6. VERIFY SELFIE IMAGE
        const selfieImg = page.locator('img[alt="Selfie"]');
        await expect(selfieImg).toBeVisible();

        // 7. Verify Referrer Policy
        await expect(selfieImg).toHaveAttribute('referrerPolicy', 'no-referrer');

        // 8. Verify Image loads (naturalWidth > 0)
        await expect(selfieImg).toHaveJSProperty('complete', true);
        const naturalWidth = await selfieImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
        console.log("TEST SUCCESS: Selfie Image Loaded with width:", naturalWidth);

        // 9. VERIFY DOCUMENT ACCESS (Clicking Buttons & Image)
        // Mock window.open
        await page.evaluate(() => {
            (window as any)._openedUrl = null;
            (window as any).open = (url: string) => {
                console.log(`Opened: ${url}`);
                (window as any)._openedUrl = url;
                return null; // Return null window
            };
        });

        // Test A: Click "View ID Doc" Button
        await page.getByRole('button', { name: 'View ID Doc' }).click();
        const url1 = await page.evaluate(() => (window as any)._openedUrl);
        expect(url1).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

        // Test B: Click "View 3-Month St." Button
        await page.getByRole('button', { name: 'View 3-Month St.' }).click();
        const url2 = await page.evaluate(() => (window as any)._openedUrl);
        expect(url2).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

        // Test C: Click Selfie Image (Full View)
        await page.locator('.relative.aspect-video').click(); // Click the container
        const url3 = await page.evaluate(() => (window as any)._openedUrl);
        expect(url3).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

        console.log("TEST SUCCESS: All Document Links Triggered window.open Correctly");
        // 5. Verify Persistent State (Reload Page)
        await page.reload();
        await page.waitForSelector("text='Pending'", { state: "visible" });
        await expect(page.locator("text='Test Borrower'")).toBeVisible();

        // Result should still be visible without running check again
        // Note: First test uses unverified user, so we don't expect "Verified" here.
        // The persistence is tested in the next test case.
    });

    test('Admin shows persistent results for pre-verified users', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

        // Mock Queue with a Verified User
        await page.route('**/api/admin/verification-queue', async route => {
            console.log("Mocking Verification Queue for Persistent Test (Hit!)");
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [{
                        loan_id: 'loan_123_verified',
                        user_id: 'user_456',
                        amount: 5000,
                        duration_months: 6,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        full_name: 'Verified Borrower',
                        national_id: 'ID-999999',
                        monthly_income: 15000,
                        employer_name: 'Tech Corp',
                        employment_type: 'Full-Time',
                        is_employed: true,
                        confidence: 98.5,
                        face_verified: true,
                        verified_at: new Date().toISOString(),
                        documents: {
                            id_url: 'http://example.com/id.jpg',
                            payslip_url: 'http://example.com/payslip.pdf',
                            selfie_url: 'http://example.com/selfie.jpg'
                        }
                    }]
                })
            });
        });

        // Login Mock
        await page.goto('/login');
        await page.evaluate(() => {
            const fakeUser = {
                id: 'admin_user',
                email: 'admin@example.com',
                app_metadata: { role: 'admin' },
                user_metadata: { full_name: 'Admin User' },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            };
            window.localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });

        await page.goto('/admin/verification');

        // Assert Persistent UI
        await expect(page.locator("text='Verified Borrower'")).toBeVisible({ timeout: 10000 });
        await expect(page.locator("text='✅ Verified (98.5%)'")).toBeVisible();
        await expect(page.locator("text='Loaded from previous check'")).toBeVisible();
    });

    test('Admin shows persistent results for failed verifications', async ({ page }) => {
        // Mock Queue with a FAILED User
        await page.route('**/api/admin/verification-queue', async route => {
            console.log("Mocking Verification Queue for Failed Persistence Test");
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        {
                            loan_id: 'loan-failed-123',
                            user_id: 'user-failed',
                            full_name: 'Failed Borrower',
                            amount: 2000,
                            status: 'pending',
                            confidence: 0,
                            face_verified: false,
                            verified_at: new Date().toISOString(),
                            documents: {
                                id_url: 'http://example.com/id.jpg',
                                payslip_url: 'http://example.com/payslip.pdf',
                                selfie_url: 'http://example.com/selfie.jpg'
                            }
                        }
                    ]
                })
            });
        });

        // Login Mock
        await page.goto('/login');
        await page.evaluate(() => {
            const fakeUser = {
                id: 'admin_user',
                email: 'admin@example.com',
                app_metadata: { role: 'admin' },
                user_metadata: { full_name: 'Admin User' },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            };
            window.localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });

        await page.goto('/admin/verification');

        // Assert Persistent UI for Failed Check
        await expect(page.locator("text='Failed Borrower'")).toBeVisible({ timeout: 10000 });
        // This assertion expects some form of failure message to be visible
        // We match substring loosely to account for formatting changes (e.g. emojis)
        await expect(page.locator('.text-red-200')).toBeVisible(); // Check for the red style class
        await expect(page.getByText('Low Match', { exact: false })).toBeVisible();
    });
});
