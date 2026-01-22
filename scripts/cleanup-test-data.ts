
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
    console.log('Starting Cleanup...');

    // Delete users matching 'test.bank.*'
    const { data: { users: users1 }, error: err1 } = await supabase.auth.admin.listUsers();

    if (err1) {
        console.error('Error listing users:', err1);
        return;
    }

    const targets = users1.filter(u =>
        u.email?.startsWith('test.bank.') ||
        u.email?.startsWith('test.concurrent.') ||
        u.email?.startsWith('test.retake.') ||
        u.email?.startsWith('admin.e2e.') ||
        u.email?.startsWith('borrower.e2e.')
    );

    console.log(`Found ${targets.length} test users to delete.`);

    for (const user of targets) {
        console.log(`Deleting user: ${user.email} (${user.id})`);

        // 1. Delete user from auth (Cascades to profiles/loans usually, but let's be safe)
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
            console.error(`Failed to delete user ${user.id}:`, delError.message);
        } else {
            console.log(`Deleted ${user.email}`);
        }
    }

    console.log('Cleanup Complete.');
}

cleanup();
