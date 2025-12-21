const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPolicies() {
    console.log('🔍 Verifying RLS Policies...\n');

    // We can't query pg_policies directly with anon key usually, 
    // but we can test the behavior.

    // 1. Create a test user
    const email = `policytest.${Date.now()}@gmail.com`;
    const password = 'Password123!';

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Signup failed:', authError.message);
        return;
    }
    const user = authData.user;
    console.log('✅ Test user created:', user.id);

    // 1b. Create Profile (Required for FK)
    console.log('\nCreating Profile...');
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            full_name: 'Policy Test User',
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('❌ Profile creation FAILED:', profileError);
        return;
    }
    console.log('✅ Profile created');

    // 2. Test INSERT Verification
    console.log('\nTesting INSERT Verification...');
    const { error: insertError } = await supabase
        .from('verifications')
        .insert({
            user_id: user.id,
            employer_name: 'Test Corp',
            monthly_income: 5000
        });

    if (insertError) {
        console.error('❌ INSERT Verification FAILED:', insertError);
    } else {
        console.log('✅ INSERT Verification SUCCESS');
    }

    // 3. Test UPDATE Verification
    console.log('\nTesting UPDATE Verification...');
    const { error: updateError } = await supabase
        .from('verifications')
        .update({
            employer_name: 'Updated Corp'
        })
        .eq('user_id', user.id);

    if (updateError) {
        console.error('❌ UPDATE Verification FAILED:', updateError);
    } else {
        console.log('✅ UPDATE Verification SUCCESS');
    }

    // 4. Test SELECT Verification
    console.log('\nTesting SELECT Verification...');
    const { data: selectData, error: selectError } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (selectError) {
        console.error('❌ SELECT Verification FAILED:', selectError);
    } else {
        console.log('✅ SELECT Verification SUCCESS:', selectData.employer_name);
    }

    // 5. Test INSERT Loan
    console.log('\nTesting INSERT Loan...');
    const { error: loanError } = await supabase
        .from('loans')
        .insert({
            user_id: user.id,
            amount: 1000,
            duration_months: 6,
            monthly_payment: 200,
            status: 'pending'
        });

    if (loanError) {
        console.error('❌ INSERT Loan FAILED:', loanError);
    } else {
        console.log('✅ INSERT Loan SUCCESS');
    }

    console.log('\n--------------------------------');
    console.log('Summary:');
    if (!insertError && !updateError && !selectError && !loanError) {
        console.log('✅ ALL POLICIES ARE CORRECTLY CONFIGURED');
    } else {
        console.log('❌ SOME POLICIES ARE MISSING OR INCORRECT');
        console.log('Please run the reset-policies.sql script in Supabase SQL Editor.');
    }
}

verifyPolicies().catch(console.error);
