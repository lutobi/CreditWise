
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkRLS() {
    console.log("--- Checking RLS for 'verifications' ---");

    // 1. Admin Client (Bypass RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: allVerifs, error: adminError } = await adminClient.from('verifications').select('*');
    if (adminError) {
        console.error("Admin Fetch Error:", adminError);
        return;
    }
    console.log(`Admin sees ${allVerifs.length} records.`);
    if (allVerifs.length > 0) {
        console.log("Sample Record:", allVerifs[0]);
    } else {
        console.log("No records found in DB at all!");
    }

    // 2. Anon Client (User Perspective - without login for public, needs login for authorized)
    // We need to simulate a logged-in user to test 'authenticated' role RLS
    // Let's sign in a test user or create one
    const { data: { user }, error: createError } = await adminClient.auth.admin.createUser({
        email: `debug.rls.${Date.now()}@example.com`,
        password: 'Password123!',
        email_confirm: true
    });

    if (!user) {
        console.error("Failed to create test user", createError);
        return;
    }

    console.log("Created Test User:", user.id);

    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { session }, error: loginError } = await userClient.auth.signInWithPassword({
        email: user.email!,
        password: 'Password123!'
    });

    if (loginError) {
        console.error("Login failed", loginError);
        return;
    }

    console.log("User Logged In. Fetching verifications...");
    const { data: userVerifs, error: userObError } = await userClient.from('verifications').select('*');

    if (userObError) {
        console.error("User Fetch Error:", userObError);
    } else {
        console.log(`User sees ${userVerifs.length} records.`);
        if (userVerifs.length === 0 && allVerifs.length > 0) {
            console.error("RLS BLOCK DETECTED: User cannot see records!");
        } else {
            console.log("RLS seems okay (or table is empty).");
        }
    }

    // Cleanup
    await adminClient.auth.admin.deleteUser(user.id);
}

checkRLS();
