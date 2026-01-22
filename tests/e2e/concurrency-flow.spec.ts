
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Multi-Document Request Flow', () => {
    // Skipped for simplicity, using the standalone test below
});

test('Full Concurrency Flow', async ({ page, request }) => {
    // 1. Create User & Loan
    const email = `test.concurrent.${Date.now()}@example.com`;
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: 'Concurrent User' }
    });
    if (userError) throw userError;
    const userId = user.user.id;

    // Ensure profile exists (handle potential trigger delay)
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            full_name: 'Concurrent User',
            national_id: `ID-${Date.now()}`
        })
        .select()
        .single();

    // If error is duplicate key, ignore it (trigger won). If other error, throw.
    if (profileError && profileError.code !== '23505') {
        throw profileError;
    }

    const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
            user_id: userId,
            amount: 5000,
            duration_months: 12,
            monthly_payment: 500, // Fixed: Added monthly_payment
            status: 'pending',
            documents: {
                id_url: 'http://initial-id.jpg',
                selfie_url: 'http://initial-selfie.jpg'
            }
        })
        .select()
        .single();
    if (loanError) throw loanError;
    const loanId = loan.id;

    // --- ADMIN ACTIONS ---
    // Request ID & Selfie
    await request.post('http://localhost:3000/api/admin/request-retake', {
        data: { loanId, type: 'id', reason: 'Too dark' }
    });
    await request.post('http://localhost:3000/api/admin/request-retake', {
        data: { loanId, type: 'selfie', reason: 'Blurry' }
    });

    // --- USER DASHBOARD ---
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // 1. Verify "Action Required (2 Items)"
    await expect(page.locator('h3')).toContainText('Action Required (2 Items)');

    // 2. Initial State: Checklist visible
    await expect(page.getByText('ID Document').first()).toBeVisible();
    await expect(page.getByText('Selfie').first()).toBeVisible();

    // 3. Resolve ID
    // Click Update for ID
    await page.locator('div').filter({ hasText: 'ID Document' }).getByRole('button', { name: 'Update' }).click();

    // Check UI switched to ID Upload
    await expect(page.getByText('Updating: ID Document')).toBeVisible();

    // Back to List
    await page.click('text=Back to List');
    await expect(page.getByText('Update', { exact: true })).toHaveCount(2);

    // Resolve Selfie (Simulate API call to update status on backend)
    await request.post('http://localhost:3000/api/user/submit-retake', {
        data: { loan_id: loanId, file_path: 'new-selfie.jpg', user_id: userId, type: 'selfie' }
    });

    await page.reload();

    // 4. Verify 1 Item Remaining (ID Only)
    // "Action Required" (No count if 1 item)
    await expect(page.locator('h3')).toHaveText('Action Required');
    // And it immediately shows the ID Upload UI (Auto-select single item)
    await expect(page.getByText('Upload your ID Document')).toBeVisible();
    await expect(page.getByText('Selfie')).not.toBeVisible(); // Checklist hidden

    // 5. Resolve ID (Simulate API)
    await request.post('http://localhost:3000/api/user/submit-retake', {
        data: { loan_id: loanId, file_path: 'new-id.jpg', user_id: userId, type: 'id' }
    });

    await page.reload();

    // 6. Verify All Done
    await expect(page.locator('h3')).toContainText('Update Your Submission');

});
