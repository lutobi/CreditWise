import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots-walkthrough');

test.describe('Comprehensive Loan Lifecycle E2E Walkthrough', () => {
    test.setTimeout(180000); // 3 minutes

    test('Full Application Lifecycle with Screenshots', async ({ page }) => {
        // Setup: Create screenshots directory
        const fs = require('fs');
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }

        // ==================== STEP 1: Homepage ====================
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_homepage.png'), fullPage: true });
        console.log('✓ Step 1: Homepage captured');

        // ==================== STEP 2: Apply Page (Form Step 1) ====================
        await page.click('text=Apply Now');
        await page.waitForURL('**/apply**');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_apply_step1.png'), fullPage: true });
        console.log('✓ Step 2: Application form Step 1');

        // Fill Personal Details
        await page.fill('input[name="fullName"]', 'E2E Walkthrough User');
        await page.fill('input[name="nationalId"]', '9801015012345');
        await page.fill('input[name="phone"]', '0815551234');
        await page.fill('input[name="email"]', 'e2e-walkthrough@example.com');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_apply_step1_filled.png'), fullPage: true });

        // ==================== STEP 3: Form Step 2 (Employment) ====================
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_apply_step2.png'), fullPage: true });
        console.log('✓ Step 3: Employment details');

        // Fill Employment
        await page.fill('input[name="monthlyIncome"]', '18000');
        await page.fill('input[name="employerName"]', 'Omari Tech Solutions');
        await page.selectOption('select[name="employmentType"]', 'permanent');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_apply_step2_filled.png'), fullPage: true });

        // ==================== STEP 4: Form Step 3 (Loan Details) ====================
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_apply_step3.png'), fullPage: true });
        console.log('✓ Step 4: Loan details');

        // Fill Loan Details
        await page.fill('input[name="loanAmount"]', '5000');
        await page.selectOption('select[name="loanTerm"]', '2');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_apply_step3_filled.png'), fullPage: true });

        // ==================== STEP 5: Form Step 4 (Documents) ====================
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_apply_step4_documents.png'), fullPage: true });
        console.log('✓ Step 5: Document upload');

        // Upload test files (we'll use fixture files if they exist)
        const testImagePath = path.join(__dirname, 'fixtures', 'test-id.png');
        const testPayslipPath = path.join(__dirname, 'fixtures', 'test-payslip.pdf');

        // Check if fixture files exist, if not create simple ones
        if (!fs.existsSync(path.join(__dirname, 'fixtures'))) {
            fs.mkdirSync(path.join(__dirname, 'fixtures'), { recursive: true });
        }

        // Create a simple test image if doesn't exist
        if (!fs.existsSync(testImagePath)) {
            // Use a simple 1x1 pixel PNG
            const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(testImagePath, pngBuffer);
        }
        if (!fs.existsSync(testPayslipPath)) {
            // Create a simple PDF-like file
            fs.writeFileSync(testPayslipPath, '%PDF-1.4 test payslip');
        }

        // Try to upload ID
        const idInput = page.locator('input[type="file"]').first();
        if (await idInput.count() > 0) {
            await idInput.setInputFiles(testImagePath);
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_apply_documents_uploaded.png'), fullPage: true });

        // ==================== STEP 6: Form Step 5 (Selfie) ====================
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_apply_step5_selfie.png'), fullPage: true });
        console.log('✓ Step 6: Selfie capture');

        // ==================== STEP 7: Review & Submit ====================
        // Try to proceed (may require camera or manual step in real scenario)
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_apply_review.png'), fullPage: true });
        console.log('✓ Step 7: Review & submit');

        // ==================== STEP 8: Login as Admin ====================
        await page.goto('http://localhost:3000/login');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_login_page.png'), fullPage: true });
        console.log('✓ Step 8: Admin login page');

        // ==================== STEP 9: Admin Dashboard ====================
        // Note: This assumes there's an existing admin session or we can login
        await page.goto('http://localhost:3000/admin');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_admin_dashboard.png'), fullPage: true });
        console.log('✓ Step 9: Admin dashboard');

        // ==================== STEP 10: Verification Queue ====================
        await page.goto('http://localhost:3000/admin/verification');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_verification_queue.png'), fullPage: true });
        console.log('✓ Step 10: Verification queue');

        // ==================== STEP 11: Approval Queue ====================
        await page.goto('http://localhost:3000/admin/approval');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_approval_queue.png'), fullPage: true });
        console.log('✓ Step 11: Approval queue');

        // ==================== STEP 12: Reports Page ====================
        await page.goto('http://localhost:3000/admin/reports');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_reports_page.png'), fullPage: true });
        console.log('✓ Step 12: Reports page');

        // ==================== STEP 13: User Dashboard ====================
        await page.goto('http://localhost:3000/dashboard');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_user_dashboard.png'), fullPage: true });
        console.log('✓ Step 13: User dashboard with repayment display');

        console.log('\n✅ E2E Walkthrough Complete! Screenshots saved to:', SCREENSHOTS_DIR);
    });
});
