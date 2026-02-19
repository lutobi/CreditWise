import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ─── Constants ──────────────────────────────────────────────────────────────
export const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'testuser@omarifinance.com',
    password: process.env.TEST_USER_PASSWORD || 'Test1234!'
};
export const ADMIN_USER = {
    email: process.env.TEST_ADMIN_EMAIL || 'superadmin@omarifinance.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin1234!'
};
export const BASE_URL = 'http://localhost:3000';

// ─── Supabase Admin Client (for test data setup) ───────────────────────────
export function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ─── Auth Helpers ───────────────────────────────────────────────────────────

/** Login via the UI form. Returns true if login succeeded, false if it failed. */
export async function loginAs(page: Page, email: string, password: string): Promise<boolean> {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    try {
        await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
        return true;
    } catch {
        // Login failed — credentials may not exist
        return false;
    }
}

export async function loginAsUser(page: Page): Promise<boolean> {
    return loginAs(page, TEST_USER.email, TEST_USER.password);
}

export async function loginAsAdmin(page: Page): Promise<boolean> {
    return loginAs(page, ADMIN_USER.email, ADMIN_USER.password);
}

// ─── Form Helpers ───────────────────────────────────────────────────────────

/** Fill a React controlled input robustly (triple-click + fill + Tab). */
export async function fillRobust(page: Page, selector: string, value: string) {
    const el = page.locator(selector);
    await el.click({ clickCount: 3 });
    await el.fill(value);
    await el.press('Tab');
}

/** Take a named screenshot to test-results/screenshots/. */
export async function screenshot(page: Page, name: string) {
    await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

// ─── Data Helpers ───────────────────────────────────────────────────────────

/** Insert a test loan via Supabase admin for a given user. Returns loan ID. */
export async function insertTestLoan(
    userId: string,
    status: string = 'pending',
    extras: Record<string, any> = {}
): Promise<string> {
    const sb = getAdminSupabase();
    const { data, error } = await sb.from('loans').insert({
        user_id: userId,
        amount: 5000,
        duration_months: 6,
        monthly_payment: 5750,
        status,
        application_data: {
            full_name: 'Test User',
            national_id: '85010112345',
            phone: '+264811234567',
            email: TEST_USER.email,
            monthly_income: 12000,
            employer_name: 'Test Corp',
            employment_type: 'permanent',
            bank_name: 'FNB Namibia',
            account_number: '62000001234',
            branch_code: '280172',
            account_holder: 'Test User',
            account_type: 'savings',
            kin_name: 'Jane Doe',
            kin_relationship: 'Spouse',
            kin_contact: '+264812345678',
            kin_address: '123 Test St, Windhoek',
            ...extras,
        },
    }).select('id').single();
    if (error) throw new Error(`insertTestLoan failed: ${error.message}`);
    return data!.id;
}

/** Delete all test loans for the test user email. */
export async function cleanupTestLoans() {
    const sb = getAdminSupabase();
    await sb.from('loans').delete().eq('application_data->>email', TEST_USER.email);
}
