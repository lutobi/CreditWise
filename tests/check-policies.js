const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('Checking RLS policies...\n');

    // Query to check policies - using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT 
                tablename,
                policyname,
                cmd,
                qual,
                with_check
            FROM pg_policies 
            WHERE tablename IN ('verifications', 'loans')
            ORDER BY tablename, policyname;
        `
    });

    if (error) {
        console.error('Could not fetch policies via RPC:', error.message);
        console.log('\nNote: You may need to manually check policies in Supabase dashboard');
        console.log('Go to: Database > Tables > verifications > Policies');
        console.log('       Database > Tables > loans > Policies');
        return;
    }

    console.log('Current Policies:');
    console.log(JSON.stringify(data, null, 2));
}

checkPolicies();
