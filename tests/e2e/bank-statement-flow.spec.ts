
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Bank Statement Retake Flow', () => {
    test('Admin Request -> User Upload -> Graceful Update', async ({ page, request }) => {
        // 1. Setup Data (User + Loan)
        const email = `test.bank.${Date.now()}@example.com`;
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { full_name: 'Bank User' }
        });
        if (userError) throw userError;
        const userId = user.user.id;

        // Ensure profile
        await supabase.from('profiles').insert({
            id: userId,
            full_name: 'Bank User',
            national_id: `ID-${Date.now()}`
        }).select().single();

        // Create Loan
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                user_id: userId,
                amount: 8000,
                duration_months: 6,
                monthly_payment: 1500,
                status: 'pending',
                documents: {
                    id_url: 'http://valid-id.jpg',
                    selfie_url: 'http://valid-selfie.jpg',
                    payslip_url: 'http://old-statement.pdf'
                }
            })
            .select()
            .single();
        if (loanError) throw loanError;
        const loanId = loan.id;

        // 2. Admin Request Bank Statement
        console.log('Admin requesting Bank Statement...');
        const reqRes = await request.post('http://localhost:3000/api/admin/request-retake', {
            data: { loanId, type: 'bank_statement', reason: 'Old statement' }
        });
        expect(reqRes.ok()).toBeTruthy();

        // DEBUG: Verify DB State
        const { data: debugLoan } = await supabase.from('loans').select('*').eq('id', loanId).single();
        console.log('DEBUG Loan State:', JSON.stringify(debugLoan?.application_data, null, 2));


        // 3. User Login & Dashboard
        console.log('User logging in...');
        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'Password123!');
        await page.getByRole('button', { name: 'Sign In' }).click();

        try {
            await page.waitForURL('**/dashboard', { timeout: 10000 });
        } catch (e) {
            console.log('Login timed out. Checking for errors...');
            // Check for common error messages
            const errorAlert = page.locator('.text-destructive'); // shadcn error text often uses this or similar
            if (await errorAlert.count() > 0) {
                console.log('Login Error Found:', await errorAlert.textContent());
            } else {
                console.log('No error text found. Page content:', await page.content());
            }
            throw e;
        }

        // 4. Verify "Action Required" & "Upload Bank Statement"
        // 4. Verify "Action Required" & "Upload Bank Statement"
        await expect(page.getByRole('heading', { name: 'Action Required' })).toBeVisible();
        await expect(page.getByText('Upload Bank Statement')).toBeVisible();
        await expect(page.getByText('Recent 3 months statement')).toBeVisible();

        // 5. User Uploads File (Simulate PDF)
        console.log('User uploading file...');
        // We can use setInputFiles on the hidden input
        await page.setInputFiles('input[type="file"]', {
            name: 'checklist.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('fake pdf content')
        });

        // 6. Verify File Name & Click Upload
        await expect(page.getByText('checklist.pdf')).toBeVisible();

        // Monitor API Response
        page.on('response', resp => {
            if (resp.url().includes('/api/user/submit-retake') && resp.status() !== 200) {
                console.log('API ERROR:', resp.status(), resp.statusText());
            }
        });

        await page.click('button:has-text("Upload Statement")');

        // 7. Verify Graceful Transition (NO RELOAD)
        console.log('Verifying graceful update...');
        // The Banner collapses, so we look for the Verification Pending snapshot
        await expect(page.getByText('Verification Pending')).toBeVisible({ timeout: 10000 });
        // And Action Required is gone
        await expect(page.getByRole('heading', { name: 'Action Required' })).not.toBeVisible();



        // Optional: Verify the snapshot component appears
        // (Assuming logic was: if single item submitted -> resubmitted status -> snapshot)
        // Since backend updates status to 'resubmitted' if no other requests pending.

        // 8. Verify "Upload Bank Statement" is GONE
        await expect(page.getByText('Upload Bank Statement')).not.toBeVisible();

        console.log('Test Complete: Bank Statement flow verified!');
    });
});
