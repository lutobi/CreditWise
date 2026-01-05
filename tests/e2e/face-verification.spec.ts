import { test, expect } from '@playwright/test';

test.use({
    launchOptions: {
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
    permissions: ['camera'],
});

test('Face Verification Success (Mock Auth)', async ({ page }) => {
    // 1. Mock Network Requests
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.route('/api/verify-face', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, isMatch: true, similarity: 99.0 })
        });
    });

    // Mock Storage - Generic
    await page.route('**/storage/v1/object/**', async route => {
        console.log('MOCKING STORAGE REQUEST:', route.request().url());
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ Key: 'documents/mock-upload.jpg', Id: '123' })
        });
    });

    // 2. Inject Mock User via LocalStorage
    // We need to do this before the page loads AuthProvider logic.
    await page.addInitScript(() => {
        const mockUser = {
            id: 'test-user-123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
        };
        localStorage.setItem('nomad_mock_user', JSON.stringify(mockUser));
    });

    // 3. Navigate to Apply (Mock Auth should kick in)
    await page.goto('http://localhost:3000/apply');

    // Verify we are NOT redirected to login
    await expect(page).toHaveURL(/\/apply/);

    // --- STEP 1 ---
    await page.fill('input[placeholder="John"]', 'Test');
    await page.fill('input[placeholder="Doe"]', 'User');
    await page.fill('input[placeholder="Enter your ID number"]', '90010100112');
    await page.fill('input[placeholder="+264 81 123 4567"]', '0811234567');
    await page.click('button:has-text("Next Step")');

    // --- STEP 2 ---
    await page.fill('input[placeholder="Company Ltd"]', 'Test Corp');
    await page.fill('input[placeholder="15000"]', '20000');
    await page.click('button:has-text("Next Step")');

    // --- STEP 3 (Documents) ---
    await page.setInputFiles('input#idDocument', {
        name: 'id_test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('dummy-image')
    });

    // Wait for upload success
    await expect(page.locator('text=Change File').first()).toBeVisible({ timeout: 10000 });

    // A2. Upload Payslip (Required)
    await page.setInputFiles('input#payslip', {
        name: 'payslip_test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('dummy-payslip')
    });
    // Wait for checks (Change File appears for both now)
    await expect(page.locator('text=Change File').nth(1)).toBeVisible({ timeout: 10000 });

    // B. Capture Selfie (Fake Camera)

    // Wait for video to be ready
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
    // Give it a moment to initialize stream (fake device)
    await page.waitForTimeout(1000);

    // Click exact button text "Capture Live Selfie"
    await page.click('button:has-text("Capture Live Selfie")');

    // Wait for "Selfie Captured" text
    await expect(page.locator('text=Selfie Captured')).toBeVisible({ timeout: 10000 });

    // Submit Step 3 -> Verification Trigger
    // Note: The code calls /api/verify-face when step 3 submits
    await page.click('button:has-text("Next Step")');

    // Verification toast? "Identity Verified Successfully"
    await expect(page.locator('text=Identity Verified Successfully')).toBeVisible();

    // --- STEP 4 ---
    await expect(page.locator('text=Loan Details')).toBeVisible();
});
