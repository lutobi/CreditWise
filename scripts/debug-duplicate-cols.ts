
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
    // We can't list columns directly via JS client typically without RLS permissions on information_schema, 
    // but we can try to Select * from loans limit 1 and see the keys in the data if any row exists.
    // OR we can just try to insert a dummy row to see errors.

    // Better: Rely on the error message. Error says: `null value in column "duration_months"`.
    // This confirms `duration_months` exists and is NOT NULL.
    // My previous migration added `term_months`. So now we probably have BOTH, but the code is inserting to `term_months` 
    // while `duration_months` is left null and complaining.

    console.log("Checking columns via introspection (best effort)...")

    // Check if 'duration_months' is select-able
    const { error: durError } = await supabase.from('loans').select('duration_months').limit(1)
    if (!durError) console.log("✅ 'duration_months' column exists")
    else console.log("❌ 'duration_months' error:", durError.message)

    // Check if 'term_months' is select-able
    const { error: termError } = await supabase.from('loans').select('term_months').limit(1)
    if (!termError) console.log("✅ 'term_months' column exists (likely added by recent migration)")
    else console.log("❌ 'term_months' error:", termError.message)
}

run()
