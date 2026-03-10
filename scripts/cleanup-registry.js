
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function cleanupRegistry() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🚀 User Registry Cleanup & Sync...\n');

    // 1. Fetch All Auth Users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }

    const authUsers = authData.users;
    console.log(`📊 Total auth users: ${authUsers.length}`);

    // 2. Identify test/fake accounts to purge
    const testPatterns = [
        '@example.com',
        'robot.verified',
        'test@',
        'demo@',
        'fake@',
        'admin_test',
        'loadtest',
    ];

    const testUsers = authUsers.filter(u => {
        const email = (u.email || '').toLowerCase();
        const name = (u.user_metadata?.full_name || '').toLowerCase();
        return testPatterns.some(p => email.includes(p) || name.includes(p));
    });

    const realUsers = authUsers.filter(u => !testUsers.includes(u));

    console.log(`🧪 Test accounts found: ${testUsers.length}`);
    console.log(`👥 Real accounts: ${realUsers.length}\n`);

    // 3. Delete test profiles from DB
    if (testUsers.length > 0) {
        console.log('🗑️  Purging test data from profiles table...');
        for (const testUser of testUsers) {
            // Delete profile
            const { error: profileErr } = await supabase
                .from('profiles')
                .delete()
                .eq('id', testUser.id);

            // Delete any test loans
            const { error: loanErr } = await supabase
                .from('loans')
                .delete()
                .eq('user_id', testUser.id);

            // Delete the auth user entirely
            const { error: authErr } = await supabase.auth.admin.deleteUser(testUser.id);

            const status = (profileErr || loanErr || authErr) ? '⚠️' : '✅';
            console.log(`  ${status} Purged: ${testUser.email}`);
        }
    }

    // 4. Sync missing profiles for real users
    console.log('\n🔄 Syncing missing profiles for real users...');
    const { data: profiles } = await supabase.from('profiles').select('id');
    const profileIds = new Set(profiles?.map(p => p.id) || []);

    const missingProfiles = realUsers.filter(u => !profileIds.has(u.id));
    console.log(`🧩 Found ${missingProfiles.length} real users missing profile records.`);

    for (const user of missingProfiles) {
        process.stdout.write(`  Syncing profile for ${user.email}... `);

        const { error } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Incomplete Signup',
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log('✅ Synced');
        }
    }

    // 5. Summary
    console.log('\n📋 Final Summary:');
    console.log(`  - Test accounts purged: ${testUsers.length}`);
    console.log(`  - Profiles synced: ${missingProfiles.length}`);
    console.log(`  - Total real users: ${realUsers.length}`);
    console.log('\n✨ Cleanup Complete.');
}

cleanupRegistry();
