
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function auditUsers() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('--- AUDIT: PROFILES TABLE ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.table(profiles.map(p => ({ id: p.id, email: p.email, name: p.full_name, phone: p.phone_number })));
    }

    console.log('\n--- AUDIT: AUTH USERS ---');
    const { data: authData, error: aError } = await supabase.auth.admin.listUsers();
    if (aError) {
        console.error('Error fetching auth users:', aError);
    } else {
        const authUsers = authData.users;
        console.table(authUsers.map(u => ({ id: u.id, email: u.email, confirmed: !!u.email_confirmed_at })));

        // Compare
        const profileIds = new Set(profiles?.map(p => p.id) || []);
        const missingProfiles = authUsers.filter(u => !profileIds.has(u.id));

        if (missingProfiles.length > 0) {
            console.log('\n--- DISCREPANCY: AUTH USERS WITHOUT PROFILES ---');
            console.table(missingProfiles.map(u => ({ id: u.id, email: u.email })));
        } else {
            console.log('\nNo discrepancies found between Auth and Profiles.');
        }
    }
}

auditUsers();
