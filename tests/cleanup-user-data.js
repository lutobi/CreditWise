const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupUserData() {
    const email = process.argv[2];

    if (!email) {
        console.error('Usage: node tests/cleanup-user-data.js <email>');
        console.error('Example: node tests/cleanup-user-data.js test@example.com');
        process.exit(1);
    }

    console.log(`🧹 Cleaning up data for: ${email}\n`);

    // Login to get user ID
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: process.argv[3] || 'Password123!'
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        console.log('Please provide password as third argument:');
        console.log('  node tests/cleanup-user-data.js <email> <password>');
        return;
    }

    const userId = authData.user.id;
    console.log('✓ User ID:', userId);

    // Delete loans
    console.log('\n📝 Deleting loan applications...');
    const { error: loansError, count: loansCount } = await supabase
        .from('loans')
        .delete()
        .eq('user_id', userId);

    if (loansError) {
        console.error('❌ Failed to delete loans:', loansError.message);
    } else {
        console.log(`✅ Deleted ${loansCount || 0} loan applications`);
    }

    // Delete verifications
    console.log('\n📝 Deleting verification data...');
    const { error: verifError } = await supabase
        .from('verifications')
        .delete()
        .eq('user_id', userId);

    if (verifError) {
        console.error('❌ Failed to delete verification:', verifError.message);
    } else {
        console.log('✅ Deleted verification data');
    }

    console.log('\n🎉 Cleanup complete! You can now submit a fresh application.');
}

cleanupUserData().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
