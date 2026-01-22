
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

test.describe('Debug Reports API', () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    test('Reports API should return budget limit', async ({ request }) => {
        // 1. Create Admin User
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: adminData } = await supabaseAdmin.auth.admin.createUser({
            email: `report.debug.${Date.now()}@example.com`,
            password: 'Password123!',
            email_confirm: true,
            app_metadata: { role: 'admin' }
        });
        const userId = adminData.user!.id;

        try {
            // 2. Login to get token
            const supabaseClient = createClient(supabaseUrl, anonKey);
            const { data: sessionData } = await supabaseClient.auth.signInWithPassword({
                email: adminData.user!.email!,
                password: 'Password123!'
            });
            const token = sessionData.session!.access_token;

            // 3. Hit API with Token Header
            const response = await request.get('http://localhost:3000/api/admin/reports/reconciliation', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const body = await response.json();
            console.log("\n--- REPORTS API RESPONSE ---\n", JSON.stringify(body, null, 2));

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.totalLimit).toBeGreaterThan(4500000); // Should be our new 6M or 20k, but not default

        } finally {
            await supabaseAdmin.auth.admin.deleteUser(userId);
        }
    });

    // Check pure DB state too to be sure
    test('DB should have correct settings', async () => {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data } = await supabaseAdmin.from('app_settings').select('*').eq('key', 'total_lending_limit');
        console.log("\n--- DB STATE ---\n", data);
    });
});
