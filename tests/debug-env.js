
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
console.log('--- ENV DEBUG ---');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING');
console.log('ALLOW_MOCK_AUTH:', process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH);
console.log('-----------------');
