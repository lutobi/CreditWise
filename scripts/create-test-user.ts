
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTestUser() {
    const email = 'e2e-test-user@nomad.com';
    const password = 'TestPassword123!';

    console.log(`Creating test user: ${email}...`);

    // Check if user exists first
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }

    const existing = users.find(u => u.email === email);

    if (existing) {
        console.log('User already exists. Deleting to ensure clean state...');
        await supabase.auth.admin.deleteUser(existing.id);
    }

    // Create new confirmed user
    const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: 'E2E Test User'
        },
        app_metadata: {
            role: 'admin' // Sets the Supabase Auth role to admin
        }
    });

    if (createError) {
        console.error('Error creating user:', createError);
        process.exit(1);
    }

    console.log('Successfully created test user:', data.user.id);
}

createTestUser();
