
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function createAdmin() {
    const email = 'admin@creditwise.com';
    const password = 'Password123!';
    const fullName = 'Super Admin';

    console.log(`Attempting to create admin user: ${email}`);

    // 1. Create User with 'admin' role metadata
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        app_metadata: { role: 'admin' }, // This is the KEY permission
        user_metadata: { full_name: fullName }
    });

    if (createError) {
        console.error('Error creating admin user:', createError.message);
        return;
    }

    console.log(`Admin User Created Successfully! ID: ${user.user.id}`);

    // 2. Create Profile (Optional but recommended for UI consistency)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: user.user.id,
            full_name: fullName,
            // national_id etc not strictly needed for admin login unless application requires it
            national_id: 'ADMIN001'
        });

    if (profileError) {
        console.warn('Warning: Could not create profile for admin (might already exist):', profileError.message);
    } else {
        console.log('Admin Profile created.');
    }
}

createAdmin();
