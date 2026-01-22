
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load Environment Variables (We need Service Role Key)
// Note: Playwright runs in Node, so process.env should be populated if configured or we load manually.
// We'll trust the running context or load from .env.local if possible.

// We need to read .env.local manually because Playwright might not load it by default in all setups
// unless using dotenv in config. Let's be safe.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase Env Vars for E2E Test. Skipping.");
    test.skip();
}

const supabase = createClient(supabaseUrl!, serviceKey!);

test.describe('Admin Decision Real Flow (RLS Verification)', () => {
    let adminEmail = `admin.e2e.${Date.now()}@test.com`;
    let borrowerEmail = `borrower.e2e.${Date.now()}@test.com`;
    const password = 'Password123!';
    let adminId: string;
    let loanId: string;
    let borrowerId: string;

    test.beforeAll(async () => {
        // 1. Create Admin User
        const { data: admin, error: adminErr } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: password,
            email_confirm: true,
            app_metadata: { role: 'admin' }, // KEY: Real Admin Role
            user_metadata: { full_name: 'E2E Admin' }
        });
        if (adminErr) throw adminErr;
        adminId = admin.user.id;
        console.log(`Created Admin: ${adminEmail} (${adminId})`);

        // 2. Create Borrower User
        const { data: borrower, error: borrowerErr } = await supabase.auth.admin.createUser({
            email: borrowerEmail,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'E2E Borrower' }
        });
        if (borrowerErr) throw borrowerErr;
        borrowerId = borrower.user.id;

        // 3. Create Profile (Trigger usually handles this, but let's ensure it exists)
        // We'll update it to be fully populated for the contract PDF
        const { error: profileErr } = await supabase.from('profiles').upsert({
            id: borrowerId,
            full_name: 'E2E Borrower',
            national_id: '90010100123',
            address: '123 Test St, Windhoek',
            phone_number: '+264 81 123 4567'
        });
        if (profileErr) throw profileErr;

        // 4. Create Pending Loan
        // We set status='pending' and bypass verification queue by marking verifications?
        // Actually, to test APPROVAL, the loan must be in a state that appears in the queue.
        // If we want to test "Approval Page", the loan typically needs to be verified first?
        // Or if we test "Verification Page" Force Clear?
        // Let's create a loan that is ready for approval.
        // Status: 'pending'.
        // If we want it in Approval Queue, usually current flow is Pending -> Verified -> Approved.
        // But /admin/approval typically lists 'pending' loans that have cleared verification?
        // Or just 'pending' loans?
        // Let's assume standard 'pending' loan is enough to verify the API RLS.

        const { data: loan, error: loanErr } = await supabase.from('loans').insert({
            user_id: borrowerId,
            amount: 5000,
            duration_months: 6,
            monthly_payment: 1041.66, // (5000 * 1.25) / 6
            status: 'pending',
            interest_rate: 25,
            application_data: {
                monthlyIncome: 20000,
                employerName: 'Test Corp'
            }
        }).select().single();

        if (loanErr) throw loanErr;
        loanId = loan.id;
        console.log(`Created Loan: ${loanId}`);
    });

    test('Admin can Approve Loan and Download Contract', async ({ page }) => {
        // 1. Login as Admin
        await page.goto('http://localhost:3000/login');
        await page.fill('input[id="email"]', adminEmail);
        await page.fill('input[id="password"]', password);
        await page.click('button:has-text("Sign In")');

        // Wait for dashboard and role check
        await page.waitForTimeout(2000);

        // 2. Go to Approval Page directly (assuming loan shows up there or verification page)
        // If we created a 'pending' loan, it typically shows in Verification Queue first.
        // But we want to test "Approve".
        // Can we Approve from Verification Page? No, it's "Verify" then it moves to "Approval".
        // Let's try navigating to /admin/verification, force clearing it (if that feature exists) or
        // Manually updating the loan to 'verified' status via DB so it appears in Approval?
        // Wait, the API `status-update` is used for Approval.
        // Let's manually set the loan to 'pending' (standard) and use the Verification Queue to approve it?
        // No, Verification Queue verifies data. Approval Queue makes the decision.

        // Strategy: Force Verification via DB so it appears in Approval Queue
        // We'll create a Verification record.
        const { error: verifErr } = await supabase.from('verifications').insert({
            user_id: borrowerId,
            is_employed: true,
            credit_score: 750,
            updated_at: new Date().toISOString()
        });
        if (verifErr) {
            console.log("Warngin: Verification insert failed, might already exist via trigger?", verifErr);
        }

        // Now go to Approval Page
        await page.goto('http://localhost:3000/admin/approval');

        // 3. Find our Loan
        // It should be in the list.
        // 3. Find our Loan
        // Note: UI displays Full Name, not Email.
        await expect(page.locator(`text=E2E Borrower`)).toBeVisible({ timeout: 10000 });

        // 4. Click Approve
        page.on('dialog', dialog => {
            console.log(`DIALOG: ${dialog.type()} - ${dialog.message()}`);
            dialog.accept();
        });
        // await page.click(`button[aria-label="Approve Loan ${loanId}"]`); // Assuming accessible name or we find by text
        // Fallback selector finding based on row content
        // This might be tricky if list is long, but we have a fresh filtered view potentially.
        // Let's try locating the row with the user name, then the Approve button within it.
        const row = page.locator('tr', { hasText: 'E2E Borrower' });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Approve' }).click();

        // 5. Verify Success
        // Wait for "Loan approved successfully" alert or UI change.
        // Since we bypassed the alert confirmation above, we expect a page reload or status update.
        // The API should respond 200.
        // We can verify via DB or UI.
        await page.waitForTimeout(4000);

        // Verify DB status changed (Definitive proof API worked)
        const { data: updatedLoan, error: checkErr } = await supabase.from('loans').select('status').eq('id', loanId).single();
        if (checkErr) throw checkErr;
        console.log(`Loan Status in DB: ${updatedLoan?.status}`);
        expect(updatedLoan?.status).toBe('approved');
        console.log("Loan Successfully Approved via API");

        // 6. Download Contract
        // Now that it's approved, the "Download Contract" button might appear?
        // Or it might be in the 'Approved' tab?
        // Switch to 'Loans' or 'Approved' tab if necessary.
        // The UI usually has tabs.
        // Let's finding the "Download Contract" button.
        // If the row moved to 'Approved' list, we might need to change tabs.

        // Click "Queue" / "Loans" tab toggle if exists.
        // Assuming we need to find the approved loan now.
        // It might be in the lower section "Active Loans" or similar?

        // Let's just try to call the API directly via browser context to VERIFY the API fix?
        // No, the user wants "E2E".
        // Let's Refresh and see if it appears in Active Loans.
        await page.reload();
        // Assuming 'Approved' loans show up in the main list or a separate list.
        await row.getByRole('button', { name: /Download|Contract/ }).click();

        // Handle Download
        const downloadPromise = page.waitForEvent('download');
        // If the implementation opens a new tab or triggers download
        // We need to trigger the click that causes download.
        // Wait, if it downloads, we verify the download event.
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('Loan_Agreement');
        console.log("Contract Download Started Successfully");
    });

    test.afterAll(async () => {
        // Cleanup
        if (adminId) await supabase.auth.admin.deleteUser(adminId);
        if (borrowerId) await supabase.auth.admin.deleteUser(borrowerId);
        // Loans cascade delete usually? If not, we might leave junk, but users are main thing.
    });
});
