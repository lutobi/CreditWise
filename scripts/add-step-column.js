const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function addStepColumn() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Adding application_step column to profiles...');

    // Try to add the column via RPC (raw SQL)
    const { error } = await supabase.rpc('exec_sql', {
        query: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_step integer DEFAULT 0;`
    });

    if (error) {
        // RPC might not exist, try direct approach - just test if column works
        console.log('RPC not available, testing column directly...');

        // Try to read the column - if it fails, the column doesn't exist
        const { data, error: testError } = await supabase
            .from('profiles')
            .select('application_step')
            .limit(1);

        if (testError && testError.message.includes('does not exist')) {
            console.log('❌ Column does not exist. Please run this SQL in the Supabase Dashboard SQL Editor:');
            console.log('');
            console.log('  ALTER TABLE public.profiles ADD COLUMN application_step integer DEFAULT 0;');
            console.log('');
            console.log('Go to: https://supabase.com/dashboard → SQL Editor → Run the above query.');
        } else if (testError) {
            console.log('❌ Error:', testError.message);
        } else {
            console.log('✅ Column already exists! Current data:', data);
        }
    } else {
        console.log('✅ Column added successfully.');
    }
}

addStepColumn();
