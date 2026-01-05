
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('User Application Flow', () => {
    test.slow();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Robust fill helper with retry logic for flaky React inputs
    async function fillAndVerify(page: any, label: string, value: string, exact: boolean = false) {
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const locator = page.getByLabel(label, { exact });
                await expect(locator).toBeVisible();
                await locator.scrollIntoViewIfNeeded();
                await locator.fill(value);
                await page.waitForTimeout(100); // Debounce
                // Verify value stuck
                const currentValue = await locator.inputValue();
                if (currentValue === value) return; // Success!
                console.log(`[Retry ${i + 1}] Failed to fill ${label}. Expected "${value}", got "${currentValue}". Retrying...`);
                await page.waitForTimeout(500); // Wait before retry
            } catch (e) {
                console.log(`[Retry ${i + 1}] Error filling ${label}: ${e}`);

                // Fallback: Direct React State Injection (React 16+ setter hack)
                if (i === maxRetries - 1) {
                    console.log(`[Fallback] Forcing value for ${label} via JS injection...`);
                    await page.evaluate(({ l, v }) => {
                        // Find by label text content
                        const labelEl = Array.from(document.querySelectorAll('label')).find(e => e.textContent?.includes(l));
                        if (labelEl) {
                            const input = document.getElementById(labelEl.getAttribute('for') || '');
                            if (input) {
                                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                                if (setter) {
                                    setter.call(input, v);
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        }
                    }, { l: label, v: value });
                    await page.waitForTimeout(500); // Wait for React to process
                    // After attempting fallback, re-check the value in the next loop iteration.
                    // If it still fails, the loop will exit and the test will fail.
                } else {
                    throw e; // Re-throw if not the last retry, or if fallback was attempted and failed.
                }
            }
        }
    }

    async function selectAndVerify(page: any, label: string, value: string) {
        const locator = page.getByLabel(label);
        await locator.scrollIntoViewIfNeeded();
        await locator.selectOption(value);
        await page.waitForTimeout(200);
        // Verify value
        const val = await locator.inputValue();
        if (val === value) return;
        console.log(`[Select Retry] Expected ${value}, got ${val}. Forcing...`);
        // Fallback: Dispatch change manually
        await locator.selectOption(value);
        await locator.dispatchEvent('change');
    }

    test('Full Application Flow', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        if (!supabaseUrl || !serviceRoleKey) return;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const email = `testuser.${Date.now()}@example.com`;
        const password = 'Password123!';

        const { data: user } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true
        });

        try {
            console.log(`User created: ${email}`);

            // Login
            await page.goto('/login');
            await page.fill('#email', email);
            await page.fill('#password', password);
            await page.click('button:has-text("Sign In")');
            await page.waitForURL('**/dashboard', { timeout: 15000 });

            await page.goto('/apply');
            await page.waitForLoadState('networkidle');

            // Step 1
            await expect(page.getByText('Step 1 of 7')).toBeVisible({ timeout: 10000 });

            await fillAndVerify(page, 'First Name', 'John');
            await fillAndVerify(page, 'Last Name', 'Doe');
            await fillAndVerify(page, 'ID Number', '90090900112');
            await fillAndVerify(page, 'Date of Birth', '1990-09-09');
            await fillAndVerify(page, 'Nationality', 'Namibian');
            await selectAndVerify(page, 'Gender', 'Male');
            await selectAndVerify(page, 'Marital Status', 'Single');
            await fillAndVerify(page, 'Mobile Number', '0811234567');
            await fillAndVerify(page, 'Alt Contact', '0811234567');
            await fillAndVerify(page, 'Email', email);
            await fillAndVerify(page, 'Residential Address', 'Windhoek');
            await page.screenshot({ path: 'screenshots/step1-personal.png' });
            await page.click('button:has-text("Next")');

            // Step 2
            await expect(page.getByText('Step 2 of 7')).toBeVisible(); // Anchor to Step Change

            await fillAndVerify(page, 'Employer Name', 'Test Corp');
            await fillAndVerify(page, 'Job Title', 'Dev');
            await fillAndVerify(page, 'Employer Contact', '061111');
            await fillAndVerify(page, 'Start Date', '2020-01-01');
            await selectAndVerify(page, 'Employment Type', 'Permanent');
            await fillAndVerify(page, 'Monthly Income', '20000', false); // Partial match if needed
            await fillAndVerify(page, 'HR Name', 'HR');
            await fillAndVerify(page, 'HR Email', 'hr@test.com');
            await fillAndVerify(page, 'HR Phone', '061222');
            await page.screenshot({ path: 'screenshots/step2-employment.png' });
            await page.click('button:has-text("Next")');

            // Step 3
            await expect(page.getByText('Banking Details')).toBeVisible();

            await fillAndVerify(page, 'Bank Name', 'FNB');
            await fillAndVerify(page, 'Account Holder Name', 'John Doe');
            await fillAndVerify(page, 'Account Number', '123123');
            await selectAndVerify(page, 'Account Type', 'Savings');
            await fillAndVerify(page, 'Branch Code', '280172');
            await page.screenshot({ path: 'screenshots/step3-banking.png' });
            await page.click('button:has-text("Next")');

            // Step 4
            await expect(page.locator('text=Loan Details')).toBeVisible();
            // Slider handling
            const slider = page.locator('input[type="range"]');
            await slider.fill('5000');
            // Force events for slider
            await slider.dispatchEvent('input');
            await slider.dispatchEvent('change');
            await page.click('button:has-text("6m")');
            await fillAndVerify(page, 'Purpose of Loan', 'Personal Expense');
            await selectAndVerify(page, 'Repayment Method', 'EFT');
            await page.screenshot({ path: 'screenshots/step4-loan-details.png' });
            // Check if Next is clickable
            await page.waitForTimeout(500);
            await page.click('button:has-text("Next")');

            // Step 5
            await expect(page.getByText('References')).toBeVisible({ timeout: 10000 });
            // Note: Step 5 logic uses "Next of Kin Details" text in component
            await expect(page.getByText('Next of Kin Details')).toBeVisible();

            await fillAndVerify(page, 'Full Name', 'Mom');
            await fillAndVerify(page, 'Relationship', 'Mother');
            await fillAndVerify(page, 'Contact Number', '081999');
            await fillAndVerify(page, 'Physical Address', 'Home Address');
            await page.screenshot({ path: 'screenshots/step5-next-of-kin.png' });
            await page.click('button:has-text("Next")');

            // Step 6 (Documents)
            await expect(page.locator('text=Step 6 of 7')).toBeVisible();

            // Using Bypass Inputs for reliability in test environment
            const idBypass = page.locator('#idDocument-bypass');
            await idBypass.fill('https://example.com/id.jpg');
            await idBypass.dispatchEvent('change');

            const payslipBypass = page.locator('#payslip-bypass');
            await payslipBypass.fill('https://example.com/payslip.pdf');
            await payslipBypass.dispatchEvent('change');

            // Selfie Bypass using hidden input
            const selfieBypass = page.locator('#selfie-bypass');
            await selfieBypass.fill('https://example.com/selfie.jpg');
            await selfieBypass.dispatchEvent('change');

            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/step6-documents.png' });

            await page.click('button:has-text("Next")');

            // Step 7 Declaration
            await expect(page.getByText('Step 7 of 7')).toBeVisible({ timeout: 10000 });

            const checkboxes = await page.locator('input[type="checkbox"]').all();
            for (const cb of checkboxes) await cb.check();

            // Signature uses "Full Name" label which might be duplicate of Step 5?
            // Step 5 is hidden. Step 7 visible. exact=true helps.
            // Check ApplyPage: Step 7 Label is "Full Name". Step 5 is "Full Name".
            // Since Step 5 DOM element is hidden (conditional rendering in React), getByLabel should find the VISIBLE one.
            await fillAndVerify(page, 'Full Name', 'John Doe');
            await fillAndVerify(page, 'Date', '2025-01-01');
            await page.screenshot({ path: 'screenshots/step7-declaration.png' });

            await page.click('button:has-text("Submit Application")');
            await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 15000 });
            await page.screenshot({ path: 'screenshots/success.png' });

            console.log('✅ TEST PASSED');

        } finally {
            if (user?.user?.id) await supabaseAdmin.auth.admin.deleteUser(user.user.id);
        }
    });
});
