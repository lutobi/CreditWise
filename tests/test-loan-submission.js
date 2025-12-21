const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoanSubmission() {
    console.log('🧪 Testing Complete Loan Submission Flow...\n');

    // 1. Create test user
    const timestamp = Date.now();
    const email = `loantest.${timestamp}@gmail.com`;
    const password = 'Password123!';

    console.log('📝 Step 1: Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Signup failed:', authError.message);
        return;
    }

    const user = authData.user;
    if (!user) {
        console.error('❌ No user returned from signup');
        return;
    }
    console.log('✅ User created:', user.id);

    // 2. Create profile
    console.log('\n📝 Step 2: Creating user profile...');
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            full_name: 'Test User Loan',
            updated_at: new Date().toISOString()
        });

    if (profileError) {
        console.error('❌ Profile creation failed:', profileError.message);
        return;
    }
    console.log('✅ Profile created');

    // 3. Submit verification (simulating Step 2 of the form)
    console.log('\n📝 Step 3: Submitting employment verification...');

    // Check if verification exists
    const { data: existingVerif } = await supabase
        .from('verifications')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    let verifError;
    if (existingVerif) {
        console.log('  Updating existing verification...');
        const { error } = await supabase
            .from('verifications')
            .update({
                employer_name: 'Test Company Ltd',
                monthly_income: 15000,
            })
            .eq('user_id', user.id);
        verifError = error;
    } else {
        console.log('  Creating new verification...');
        const { error } = await supabase
            .from('verifications')
            .insert({
                user_id: user.id,
                employer_name: 'Test Company Ltd',
                monthly_income: 15000,
            });
        verifError = error;
    }

    if (verifError) {
        console.error('❌ Verification failed:', verifError.message);
        console.error('Details:', verifError);
        return;
    }
    console.log('✅ Verification submitted');

    // 4. Submit loan application (Step 3 of the form)
    console.log('\n📝 Step 4: Submitting loan application...');
    const loanAmount = 5000;
    const repaymentPeriod = 6;
    const monthlyPayment = (loanAmount * 1.12) / repaymentPeriod;

    const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert({
            user_id: user.id,
            amount: loanAmount,
            duration_months: repaymentPeriod,
            monthly_payment: monthlyPayment,
            status: 'pending'
        })
        .select();

    if (loanError) {
        console.error('❌ Loan submission failed:', loanError.message);
        console.error('Details:', loanError);
        return;
    }
    console.log('✅ Loan application submitted');
    console.log('  Loan ID:', loanData[0].id);
    console.log('  Amount: N$', loanAmount);
    console.log('  Monthly Payment: N$', Math.round(monthlyPayment));

    // 5. Verify the data was saved
    console.log('\n📝 Step 5: Verifying saved data...');
    const { data: savedLoan } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (savedLoan) {
        console.log('✅ Loan data verified in database');
    }

    console.log('\n🎉 SUCCESS! Complete loan submission flow works!');
    console.log('\nTest user email:', email);
    console.log('Test user ID:', user.id);
}

testLoanSubmission().catch(err => {
    console.error('\n💥 Test failed with error:', err);
    process.exit(1);
});
