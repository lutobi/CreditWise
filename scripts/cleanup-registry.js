
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function cleanupRegistry() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🚀 Finalizing User Registry Sync...\n');

    // 1. Fetch All Auth Users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }

    const authUsers = authData.users;

    // 2. Load Existing Profiles to check for missing entries
    console.log('🔄 Syncing missing profiles for real users...');
    const { data: profiles } = await supabase.from('profiles').select('id');
    const profileIds = new Set(profiles?.map(p => p.id) || []);

    // Filter out users who wouldn't be "real" or are already deleted
    const realUsers = authUsers.filter(u => {
        const email = u.email || '';
        return !email.includes('@example.com') && !email.includes('robot.verified');
    });

    const missingProfiles = realUsers.filter(u => !profileIds.has(u.id));
    console.log(`🧩 Found ${missingProfiles.length} real users missing profile records.`);

    for (const user of missingProfiles) {
        process.stdout.write(`Syncing profile for ${user.email}... `);

        // We know 'email' might be missing from the table, so we only send 'id' and 'full_name'
        // 'full_name' is usually in user_metadata
        const { error } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Incomplete Signup',
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log('✅ Synced');
        }
    }

    console.log('\n✨ Sync Complete. All real users should now appear in the User Registry.');
}

cleanupRegistry();
