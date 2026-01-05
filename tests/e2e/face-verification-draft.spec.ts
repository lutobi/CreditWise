import { test, expect } from '@playwright/test';

test('Face Verification Flow (Mocked)', async ({ page }) => {
    // Mock the verification API
    await page.route('/api/verify-face', async route => {
        const json = { success: true, isMatch: true, similarity: 99.9 };
        await route.fulfill({ json });
    });

    // Mock Authentication (bypass login)
    await page.context().addCookies([{
        name: 'sb-access-token', value: 'fake-token', domain: 'localhost', path: '/'
    }]);

    // Navigate to Apply
    await page.goto('/apply');

    // NOTE: If auth guard redirects to login, we might need a more robust auth setup 
    // or use the existing 'auth.setup.ts' if available. 
    // For now assuming we can reach page or manually handle auth if needed.
    // Actually, let's assume we need to fill form from Step 1.

    // Step 1: Personal
    await page.fill('input[placeholder="John"]', 'Test');
    await page.fill('input[placeholder="Doe"]', 'User');
    await page.fill('input[placeholder="Enter your ID number"]', '90010100112');
    await page.fill('input[placeholder="+264 81 123 4567"]', '0811234567');
    await page.click('button:has-text("Next Step")');

    // Step 2: Employment
    await page.fill('input[placeholder="Company Ltd"]', 'Test Corp');
    await page.fill('input[placeholder="15000"]', '20000');
    await page.click('button:has-text("Next Step")');

    // Step 3: Documents
    // We need to bypass file upload or mock the state?
    // Since we are interacting with UI, we must upload dummy files.

    // Create dummy file
    await page.evaluate(() => {
        const file = new File(['dummy'], 'id.jpg', { type: 'image/jpeg' });
        // This is tricky with Playwright hidden inputs.
    });

    // Actually, easier to just mock the "Upload" process if possible?
    // Or just locate input[type=file] and setInputFiles.

    await page.setInputFiles('input#idDocument', {
        name: 'id.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('dummy')
    });

    // Wait for upload (toast or checkmark)
    await expect(page.locator('text=Document uploaded successfully')).toBeVisible();

    // Selfie
    // The LiveSelfie component uses webcam. We might need to mock getUserMedia or the file handler.
    // Our code calls `handleSelfieCapture`.
    // Ideally we mock the camera or valid the functionality.
    // For this test, let's skip strict webcam check if possible?
    // Actually, we can't skip validation.
    // We can try to force state update via evaluate or just assume we can't test this easily in headless without args.

    // Use playwright fake video?
    // launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }
});
