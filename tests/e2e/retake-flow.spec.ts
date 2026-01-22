
import { test, expect } from '@playwright/test';

test.describe('Premium Retake Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));
    });

    test('User Dashboard: Focus -> Submit -> Collapse Flow', async ({ page, context }) => {
        // Grant permissions and configure fake media stream
        await context.grantPermissions(['camera']);
        // Note: launchOptions usually need to be in config or global setup, but we can try granting permissions first.
        // Actually, for fake video, we might be out of luck without config access.
        // Let's assume standard local environment might verify this if user has camera, but headless?
        // Let's try just granting permissions.
        // 1. Mock User Login
        await page.route(/.*\/auth\/v1\/token.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'user-token', user: { id: 'user-1', email: 'user@example.com' } }) });
        });
        await page.route(/.*\/auth\/v1\/user.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: 'user-1', email: 'user@example.com' }) });
        });

        // 2. Mock Loan Data (Stateful)
        let isResubmitted = false;
        await page.route(/.*rest\/v1\/loans.*/, async route => {
            const method = route.request().method();
            if (method === 'GET') {
                // Return different data based on internal state
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{
                        id: 'loan-1',
                        status: 'pending',
                        amount: 5000,
                        created_at: new Date().toISOString(),
                        application_data: {
                            status_detail: isResubmitted ? 'resubmitted' : 'retake_requested',
                            retakeType: 'selfie',
                            retakeReason: 'Image too blurry',
                            status_detail_history: []
                        },
                        documents: { selfie_url: isResubmitted ? 'new-selfie-url' : 'old-selfie.jpg' }
                    }])
                });
            } else {
                await route.continue();
            }
        });

        // 3. Mock New Secure API
        await page.route('/api/user/submit-retake', async route => {
            console.log('MOCK: Secure Retake API Custom Mock Hit');
            const body = await route.request().postDataJSON();
            if (body.loan_id && body.file_path) {
                isResubmitted = true; // Update state!
                await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
            } else {
                await route.fulfill({ status: 400, body: JSON.stringify({ error: 'Bad Request' }) });
            }
        });

        // 4. Mock Storage
        await page.route(/.*storage\/v1\/object.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ Key: 'new-selfie.jpg' }) });
        });
        await page.route(/.*storage\/v1\/sign.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ signedUrl: 'https://via.placeholder.com/300' }) });
        });

        // 5. Inject Mock User & Navigate
        await page.goto('http://localhost:3000/login');
        await page.evaluate(() => {
            const fakeUser = { id: 'user-1', email: 'user@example.com', aud: 'authenticated', role: 'authenticated' };
            localStorage.setItem('nomad_mock_session', JSON.stringify({ access_token: 'fake-token', user: fakeUser }));
            localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });
        await page.goto('http://localhost:3000/dashboard');

        // 6. Verify Retake Banner
        // Header text changed to generic "Action Required" or "Action Required (N Items)"
        await expect(page.locator('h3:has-text("Action Required")')).toBeVisible();

        // 7. Verify Restriction & UI
        await expect(page.locator('text=Active Liveness Check Required')).toBeVisible();
        await expect(page.locator('button:has-text("Capture Photo")')).toBeVisible();
        // Ensure NO upload option is present (searching for text/buttons that would indicate upload)
        await expect(page.locator('text=Upload Photo')).not.toBeVisible();
        await expect(page.locator('input[type="file"]')).toHaveCount(0); // Should be 0 if ID upload is not active

        // 8. Simulate Submission (Bypass Camera Capture limitation in Headless)
        // Since we can't easily fake the webcam stream to get a screenshot in this env,
        // we will verify the UI restriction above, then mock the API call to proceed with the flow.

        await page.evaluate(async () => {
            const response = await fetch('/api/user/submit-retake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loan_id: 'loan-1',
                    file_path: 'live-selfie-mock.jpg',
                    user_id: 'user-1',
                    type: 'selfie'
                })
            });
        });

        // Reload to reflect state change (Dashboard fetches on load)
        await page.reload({ waitUntil: 'networkidle' });

        // 9. Verify Collapse to Snapshot
        console.log('Waiting for verification snapshot...');

        // The Banner collapses, so we look for the Verification Pending snapshot
        await expect(page.getByText('Verification Pending')).toBeVisible({ timeout: 10000 });


        await expect(page.locator('text=Verification Pending')).toBeVisible({ timeout: 10000 });

        // Wait for animation to likely finish
        await page.waitForTimeout(1000);

        // Capture Snapshot
        await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-snapshot.png' });

        // 10. Verify Re-expand
        await page.click('button:has-text("Edit / Retake")');
        await expect(page.locator('text=Update Your Submission')).toBeVisible();
        await expect(page.locator('text=Active Liveness Check Required')).toBeVisible();

        // Capture Re-expand
        await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-reexpand.png' });
    });

    test('Admin Verification: Diff View Flow', async ({ page }) => {
        // 1. Mock Admin Login
        await page.route(/.*\/auth\/v1\/token.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'admin-token', user: { id: 'admin-1', email: 'admin@example.com', app_metadata: { role: 'admin_verifier' } } }) });
        });
        await page.route(/.*\/auth\/v1\/user.*/, async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: 'admin-1', app_metadata: { role: 'admin_verifier' } }) });
        });

        // 2. Mock Queue
        await page.route('/api/admin/verification-queue', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    data: [{
                        loan_id: 'loan-1',
                        user_id: 'user-1',
                        status: 'pending',
                        status_detail: 'resubmitted',
                        retake_type: 'selfie',
                        retake_reason: 'Blurry',
                        amount: 5000,
                        full_name: 'Test Borrower',
                        national_id: '123456789',
                        documents: {
                            selfie_url: 'https://via.placeholder.com/300/00FF00',
                            previous_selfie_url: 'https://via.placeholder.com/300/FF0000',
                            id_url: 'https://via.placeholder.com/300',
                            payslip_url: 'https://via.placeholder.com/300'
                        }
                    }]
                })
            });
        });

        // 3. Navigate
        await page.goto('http://localhost:3000/login');
        await page.evaluate(() => {
            const fakeUser = { id: 'admin-1', email: 'admin@example.com', app_metadata: { role: 'admin_verifier' } };
            localStorage.setItem('nomad_mock_session', JSON.stringify({ access_token: 'fake-token', user: fakeUser }));
            localStorage.setItem('nomad_mock_user', JSON.stringify(fakeUser));
        });
        await page.goto('http://localhost:3000/admin/verification');

        // 4. Verify Diff View
        await expect(page.locator('text=Compare Updates: Old vs New')).toBeVisible();
        await expect(page.locator('img[alt="Previous Rejected Selfie"]')).toBeVisible();
        await expect(page.locator('img[alt="New Selfie Response"]')).toBeVisible();

        await page.screenshot({ path: 'tests/e2e/screenshots/admin-diff-view.png' });
    });
});
