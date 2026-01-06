
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

async function checkColumn(table: string, column: string) {
    const { error } = await supabase.from(table).select(column).limit(1)
    if (error) {
        console.log(`❌ ${table}.${column} is MISSING`)
        return false
    }
    console.log(`✅ ${table}.${column} exists`)
    return true
}

async function run() {
    console.log('Verifying all required columns...')
    await checkColumn('loans', 'purpose')
    await checkColumn('loans', 'term_months')
    await checkColumn('verifications', 'employment_status')
    await checkColumn('verifications', 'updated_at')
}

run()
