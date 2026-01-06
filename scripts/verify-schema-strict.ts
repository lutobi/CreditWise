
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('Verifying DB columns before E2E run...')

    // Check loans.purpose
    const { error: loanError } = await supabase.from('loans').select('purpose').limit(1)
    if (loanError) {
        console.error('❌ loans.purpose is MISSING. Please run the SQL migration.')
        process.exit(1)
    }
    console.log('✅ loans.purpose exists')

    // Check verifications.employment_status
    const { error: verifError } = await supabase.from('verifications').select('employment_status').limit(1)
    if (verifError) {
        console.error('❌ verifications.employment_status is MISSING. Please run the SQL migration.')
        process.exit(1)
    }
    console.log('✅ verifications.employment_status exists')
}

run()
