
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createAdmin(email: string, name: string, role: string) {
    console.log(`Creating ${role}: ${email}...`);

    // 1. Create User
    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email,
        password: 'Password123!',
        email_confirm: true,
        app_metadata: { role } // Crucial: Set Role here
    })

    if (error) {
        if (error.message.includes('already registered')) {
            console.log(`User ${email} exists. Updating role...`);
            // Helper to get ID if exists
            const { data: list } = await supabase.auth.admin.listUsers();
            const existing = list.users.find(u => u.email === email);
            if (existing) {
                await supabase.auth.admin.updateUserById(existing.id, {
                    app_metadata: { role }
                });
                console.log(`Updated ${email} to role: ${role}`);
                return existing.id;
            }
        } else {
            console.error(`Error creating ${email}:`, error.message);
            return null;
        }
    }

    if (user) {
        // 2. Create Profile
        await supabase.from('profiles').upsert({
            id: user.id,
            full_name: name,
            email: email,
            role: role // Optional: if you mirror role in profile
        });
        console.log(`✅ Success: ${email} is now ${role}`);
        return user.id;
    }
}

async function main() {
    await createAdmin('lucy@omarifinance.com', 'Lucy Verifier', 'admin_verifier');
    await createAdmin('tobi@omarifinance.com', 'Tobi Approver', 'admin_approver');
}

main();
