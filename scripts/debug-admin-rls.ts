
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkAdminRLS() {
    console.log("--- Checking Admin RLS for 'loans' ---");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    // 1. Create a dummy loan as Service Role
    const { data: loan, error: insertError } = await adminClient.from('loans').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID, might fail FK if users table enforced?
        // Wait, loans.user_id references auth.users usually. We need a real user.
        // Let's create a test user for the loan owner.
    }).select().single();

    // Actually, let's just create a test admin user and try to read ANY existing loans.
    // The previous E2E test created loans. We can assume they exist.

    // Create Admin User
    const timestamp = Date.now();
    const adminEmail = `debug.admin.${timestamp}@example.com`;
    const { data: adminUser, error: createError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: 'Password123!',
        email_confirm: true,
        app_metadata: { role: 'admin' }
    });

    if (createError) {
        console.error("Failed to create admin:", createError);
        return;
    }
    console.log("Created Admin:", adminUser.user.id);

    // Login as Admin
    const client = createClient(supabaseUrl, anonKey);
    const { error: loginError } = await client.auth.signInWithPassword({
        email: adminEmail,
        password: 'Password123!'
    });

    if (loginError) {
        console.error("Login failed:", loginError);
        return;
    }

    // Try to fetch loans
    const { data: loans, error: fetchError } = await client.from('loans').select('*').limit(5);

    if (fetchError) {
        console.error("❌ Admin Fetch Failed:", fetchError);
    } else {
        console.log(`✅ Admin fetch success. Retrieved ${loans.length} loans.`);
        if (loans.length === 0) console.log("⚠️  Warning: Loans table seems empty (or RLS hid all).");
    }

    // Cleanup
    await adminClient.auth.admin.deleteUser(adminUser.user.id);
}

checkAdminRLS();
