const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('loans')
        .select('id, status, amount')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('All loans (last 10):');
    if (error) console.error('Error:', error);
    else {
        data.forEach(l => console.log(`  ${l.id.slice(0, 8)}... | status: ${l.status} | amount: ${l.amount}`));
    }
}

check();
