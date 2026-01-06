
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
    console.log(`Checking ${table}.${column}...`)
    const { error } = await supabase
        .from(table)
        .select(column)
        .limit(1)

    if (error) {
        console.error(`❌ Missing: ${table}.${column} (${error.message})`)
        return false
    }
    console.log(`✅ Found: ${table}.${column}`)
    return true
}

async function run() {
    await checkColumn('loans', 'purpose')
    await checkColumn('verifications', 'employment_status')
}

run()
