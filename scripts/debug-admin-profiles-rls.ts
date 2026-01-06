
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkAdminProfilesRLS() {
    console.log("--- Checking Admin RLS for 'profiles' ---");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create Admin User
    const timestamp = Date.now();
    const adminEmail = `debug.admin.prof.${timestamp}@example.com`;
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

    // Create a regular user to have a profile
    const userEmail = `debug.user.prof.${timestamp}@example.com`;
    const { data: regUser } = await adminClient.auth.admin.createUser({
        email: userEmail,
        password: 'Password123!',
        email_confirm: true
    });
    // Create profile for reg user (using verify logic from apply page)
    await adminClient.from('profiles').upsert({ id: regUser.user?.id, full_name: 'Debug Target' });


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

    // Try to fetch ALL profiles
    const { data: profiles, error: fetchError } = await client.from('profiles').select('*');

    if (fetchError) {
        console.error("❌ Admin Profiles Fetch Failed:", fetchError);
    } else {
        console.log(`✅ Admin Profiles fetch success. Retrieved ${profiles.length} profiles.`);
        const target = profiles.find(p => p.full_name === 'Debug Target');
        if (target) console.log("✅ Can see target user profile");
        else console.error("❌ Cannot see target user profile (RLS hiding others?)");
    }

    // Cleanup
    await adminClient.auth.admin.deleteUser(adminUser.user.id);
    if (regUser.user) await adminClient.auth.admin.deleteUser(regUser.user.id);
}

checkAdminProfilesRLS();
