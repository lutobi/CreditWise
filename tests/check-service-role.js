require('dotenv').config({ path: '.env.local' });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("✅ SERVICE_KEY_FOUND");
    // Verify it works by creating an Admin client
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Simple fast check
    sb.auth.admin.listUsers({ page: 1, perPage: 1 })
        .then(({ data, error }) => {
            if (error) console.error("❌ KEY_INVALID: " + error.message);
            else console.log("✅ KEY_VALID");
        })
        .catch(e => console.error("❌ CLIENT_ERROR: " + e.message));

} else {
    console.log("❌ SERVICE_KEY_MISSING");
}
