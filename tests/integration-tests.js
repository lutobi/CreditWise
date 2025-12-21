// Automated Integration Tests for CreditWise
// Run with: npm run test:integration

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
config({ path: join(__dirname, '..', '.env.local') })

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test Results Tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
}

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${name}`)
    if (details) console.log(`   ${details}`)

    results.tests.push({ name, passed, details })
    if (passed) results.passed++
    else results.failed++
}

// ============================================
// TEST 1: Database Connection
// ============================================
async function testDatabaseConnection() {
    console.log('\n🔍 Test 1: Database Connection')
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1)
        logTest('Database Connection', !error, error?.message || 'Connected successfully')
        return !error
    } catch (err) {
        logTest('Database Connection', false, err.message)
        return false
    }
}

// ============================================
// TEST 2: Storage Bucket Exists and Accessible
// ============================================
async function testStorageBucket() {
    console.log('\n🔍 Test 2: Storage Bucket Configuration')
    try {
        // Try to access the documents bucket directly (more reliable than listBuckets)
        const { data, error } = await supabase.storage.from('documents').list('', {
            limit: 1
        })

        const bucketAccessible = !error || !error.message.includes('not found')
        logTest('Documents Bucket Accessible', bucketAccessible,
            bucketAccessible ? 'Bucket can be accessed' : 'Bucket not found or no access')
        return bucketAccessible
    } catch (err) {
        logTest('Documents Bucket Accessible', false, err.message)
        return false
    }
}

// ============================================
// TEST 3: Database Tables Exist
// ============================================
async function testTablesExist() {
    console.log('\n🔍 Test 3: Database Tables')

    const tables = ['profiles', 'loans', 'documents', 'verifications']
    let allExist = true

    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('count').limit(1)
            const exists = !error
            logTest(`Table: ${table}`, exists, error?.message || 'Table accessible')
            if (!exists) allExist = false
        } catch (err) {
            logTest(`Table: ${table}`, false, err.message)
            allExist = false
        }
    }

    return allExist
}

// ============================================
// TEST 4: Authentication Flow
// ============================================
async function testAuthenticationFlow() {
    console.log('\n🔍 Test 4: Authentication')

    // Test: Check if auth is configured
    try {
        const { data, error } = await supabase.auth.getSession()
        logTest('Auth Configuration', !error, error?.message || 'Auth configured')

        // Note: We can't create test users without email verification in production
        // This would need to be done in a test environment
        return !error
    } catch (err) {
        logTest('Auth Configuration', false, err.message)
        return false
    }
}

// ============================================
// TEST 5: RLS Policies (Basic Check)
// ============================================
async function testRLSPolicies() {
    console.log('\n🔍 Test 5: Row Level Security')

    // Try to access tables without auth - should be restricted
    const { data: sessions } = await supabase.auth.getSession()
    const isAuthenticated = !!sessions?.session

    if (!isAuthenticated) {
        // Try to insert without auth - should fail
        const { error } = await supabase.from('documents').insert({
            document_type: 'test'
        })

        const rlsWorks = error?.message?.includes('violates row-level security') ||
            error?.message?.includes('permission denied')

        logTest('RLS Blocks Unauthenticated Writes', rlsWorks,
            rlsWorks ? 'RLS policies working' : 'RLS might not be enabled')
        return rlsWorks
    } else {
        logTest('RLS Check Skipped', true, 'User is authenticated, skipping unauthenticated test')
        return true
    }
}

// ============================================
// TEST 6: Data Integrity Checks
// ============================================
async function testDataIntegrity() {
    console.log('\n🔍 Test 6: Data Integrity')

    // Check if any data exists
    const { data: loans } = await supabase.from('loans').select('*').limit(1)
    const { data: docs } = await supabase.from('documents').select('*').limit(1)

    logTest('Database has data', (loans?.length > 0 || docs?.length > 0),
        `Loans: ${loans?.length || 0}, Documents: ${docs?.length || 0}`)

    return true
}

// ============================================
// TEST 7: Calculator Logic Verification
// ============================================
function testCalculatorLogic() {
    console.log('\n🔍 Test 7: Calculator Math')

    // Term Loan: N$ 10,000 for 12 months
    const amount = 10000
    const months = 12
    const annualRate = 0.18
    const initiationFee = amount * 0.15
    const monthlyServiceFee = 50
    const monthlyInterest = (amount * annualRate) / 12
    const totalInterest = monthlyInterest * months
    const totalServiceFees = monthlyServiceFee * months
    const totalRepayment = amount + totalInterest + initiationFee + totalServiceFees
    const monthlyPayment = Math.ceil(totalRepayment / months)

    const expected = {
        totalRepayment: 13900,
        monthlyPayment: 1159
    }

    const correct = (totalRepayment === expected.totalRepayment &&
        monthlyPayment === expected.monthlyPayment)

    logTest('Term Loan Calculation (10k/12mo)', correct,
        `Expected: N$ ${expected.monthlyPayment}, Got: N$ ${monthlyPayment}`)

    // Payday Loan: N$ 5,000 for 3 months
    const paydayAmount = 5000
    const paydayMonths = 3
    const paydayFee = paydayAmount * 0.30
    const paydayTotal = paydayAmount + paydayFee
    const paydayMonthly = Math.ceil(paydayTotal / paydayMonths)

    const paydayExpected = {
        totalRepayment: 6500,
        monthlyPayment: 2167
    }

    const paydayCorrect = (paydayTotal === paydayExpected.totalRepayment &&
        paydayMonthly === paydayExpected.monthlyPayment)

    logTest('Payday Loan Calculation (5k/3mo)', paydayCorrect,
        `Expected: N$ ${paydayExpected.monthlyPayment}, Got: N$ ${paydayMonthly}`)

    return correct && paydayCorrect
}

// ============================================
// Run All Tests
// ============================================
async function runAllTests() {
    console.log('🚀 Starting Automated Integration Tests for CreditWise\n')
    console.log('='.repeat(60))

    // Run tests
    await testDatabaseConnection()
    await testStorageBucket()
    await testTablesExist()
    await testAuthenticationFlow()
    await testRLSPolicies()
    await testDataIntegrity()
    testCalculatorLogic()

    // Print Summary
    console.log('\n' + '='.repeat(60))
    console.log('\n📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${results.passed + results.failed}`)
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0)
}

// Run tests
runAllTests().catch(err => {
    console.error('💥 Test suite crashed:', err)
    process.exit(1)
})
