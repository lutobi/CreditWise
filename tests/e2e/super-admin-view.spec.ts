
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

test('Super Admin View Debug', async ({ page }) => {
    console.log('--- Starting Super Admin View Debug ---');
    page.on('console', msg => console.log(`PAGE LOG [${msg.type()}]: ${msg.text()} url=${msg.location().url}`));

    // 1. Create Super Admin User
    const email = `superadmin.${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Creating user: ${email} with role 'super_admin'`);
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'super_admin' },
        app_metadata: { role: 'super_admin' }
    });

    if (createError) console.error("User Creation Error:", createError);

    // 2. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Sign In")');

    // 3. Verify Dashboard Access
    await expect(page).toHaveURL(/.*dashboard/);

    // 4. Navigate to Admin
    await page.goto('http://localhost:3000/admin');
    await expect(page.getByText('Admin Dashboard')).toBeVisible();

    // 5. Navigate to Approval Queue
    console.log("Clicking Approval Queue...");
    await page.click('h3:has-text("Approval Queue")');

    // 6. Navigate to Verification Queue
    console.log("Checking Verification Queue access...");
    await page.goto('http://localhost:3000/admin/verification');
    await expect(page).toHaveURL(/.*verification/);

    console.log("SUCCESS: Super Admin can access all pages.");

    // cleanup
    await supabase.auth.admin.deleteUser(user!.id);
});
