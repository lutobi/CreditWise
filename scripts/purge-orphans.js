
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function purgeOrphanedProfiles() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🚀 Checking for Orphaned Profiles in Registry...\n');

    // 1. Fetch All Auth Users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }

    const authUsers = authData.users;
    const validAuthIds = new Set(authUsers.map(u => u.id));
    console.log(`📊 Found ${validAuthIds.size} valid users in Auth.`);

    // 2. Identify Test Users in Auth (to ensure they are deleted everywhere)
    const testPatterns = ['@example.com', '@omari.com', 'robot.verified'];
    const testAuthUsers = authUsers.filter(u => {
        const email = u.email || '';
        // Skip current admin Tobi as a safety measure
        if (email === 'abimbolatobi@gmail.com') return false;

        return testPatterns.some(pattern => email.includes(pattern));
    });

    const testUserIds = new Set(testAuthUsers.map(u => u.id));

    // We already deleted them from Auth in the previous script, but just in case they are still there or in Profiles:

    // 3. Load Existing Profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name, updated_at');
    if (pError) {
        console.error('❌ Error fetching profiles:', pError);
        return;
    }

    console.log(`📊 Found ${profiles.length} total profiles in Registry.`);

    // 4. Find Orphaned Profiles (Not in Auth) OR Test Profiles (In Auth but marked as Test)
    const profilesToDelete = profiles.filter(p => {
        const isOrphan = !validAuthIds.has(p.id);
        const isKnownTestId = testUserIds.has(p.id);
        return isOrphan || isKnownTestId;
    });

    console.log(`🗑️ Identified ${profilesToDelete.length} orphaned/test profiles for deletion from Registry.`);

    // 5. Delete them from the Profiles table
    if (profilesToDelete.length > 0) {
        const idsToDelete = profilesToDelete.map(p => p.id);

        // Clean up mock data
        console.log('Cleaning up associated mock data...');
        await supabase.from('loans').delete().in('user_id', idsToDelete);
        await supabase.from('verifications').delete().in('user_id', idsToDelete);

        console.log('Deleting profiles...');
        const { error: delError } = await supabase.from('profiles').delete().in('id', idsToDelete);

        if (delError) {
            console.log(`❌ Error deleting profiles: ${delError.message}`);
        } else {
            console.log(`✅ Successfully deleted ${profilesToDelete.length} test profiles from the registry.`);
        }
    } else {
        console.log('✅ Registry is already clean.');
    }
}

purgeOrphanedProfiles();
