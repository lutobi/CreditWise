
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
    const email = `test-unified-${Date.now()}@example.com`;
    console.log(`Creating user: ${email}`);

    // 1. Auth User
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'Password123!',
        email_confirm: true
    });

    if (authError) throw authError;
    if (!user) throw new Error("No user created");

    const userId = user.id;

    // 2. Profile
    await supabase.from('profiles').insert({
        id: userId,
        full_name: 'Unified Test User',
        national_id: '90010100123',
        phone_number: '0810000000'
    });

    // 3. Verification (Crucial for Unified Card)
    await supabase.from('verifications').insert({
        user_id: userId,
        employer_name: 'Tech Corp',
        monthly_income: 15000,
        employment_status: 'Full Time',
        is_employed: false // Triggers "Verify" button
    });

    // 4. Loan
    await supabase.from('loans').insert({
        user_id: userId,
        amount: 5000,
        duration_months: 1,
        status: 'pending',
        application_data: {
            monthlyIncome: "15000",
            email: email
        }
    });

    console.log('✅ Seeded Pending Verification Loan');
}

seed().catch(console.error);
