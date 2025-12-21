const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPermissions() {
    console.log('Verifying submission permissions...');

    // 1. Sign up a test user with unique email each run
    const timestamp = Date.now();
    const email = `creditwise.test.${timestamp}@gmail.com`;
    const password = 'Password123!';

    console.log(`Signing up user: ${email}`);
    let { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.log('Signup failed:', authError.message);
        if (authError.message.includes('already registered') || authError.message.includes('User already exists')) {
            console.log('User exists, attempting sign in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) {
                console.error('Sign in failed:', signInError.message);
                return;
            }
            authData = signInData;
        } else {
            return;
        }
    }

    const user = authData.user;
    if (!user) {
        console.error('User creation/login failed (no user returned)');
        return;
    }
    console.log('User authenticated:', user.id);

    // Check if profile exists
    console.log('Checking for user profile...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
    } else if (!profile) {
        console.log('No profile found, creating one...');
        const { error: createError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: 'Test User',
                updated_at: new Date().toISOString()
            });

        if (createError) {
            console.error('Failed to create profile:', createError);
        } else {
            console.log('✅ Profile created successfully');
        }
    } else {
        console.log('✅ Profile exists');
    }

    // 2. Try to insert into verifications
    console.log('\nAttempting insert into verifications...');
    console.log('Using user_id:', user.id);
    const { error: verifError } = await supabase
        .from('verifications')
        .upsert({
            user_id: user.id,
            employer_name: 'Test Employer',
            monthly_income: 5000,
        });

    if (verifError) {
        console.error('❌ Insert into verifications FAILED:', verifError.message);
        console.error('Details:', verifError);
    } else {
        console.log('✅ Insert into verifications SUCCESS');
    }

    // 3. Try to insert into loans
    console.log('\nAttempting insert into loans...');
    const { error: loanError } = await supabase
        .from('loans')
        .insert({
            user_id: user.id,
            amount: 5000,
            duration_months: 6,
            monthly_payment: 1000,
            status: 'pending'
        });

    if (loanError) {
        console.error('❌ Insert into loans FAILED:', loanError.message);
        console.error('Details:', loanError);
    } else {
        console.log('✅ Insert into loans SUCCESS');
    }
}

verifyPermissions();
