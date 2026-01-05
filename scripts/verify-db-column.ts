
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyColumn() {
    console.log('Verifying application_data column in loans table...')

    // Try to select the column. If it doesn't exist, this should error or return null/undefined depending on data
    // Using a trick: attempting to select it specifically.
    const { data, error } = await supabase
        .from('loans')
        .select('application_data')
        .limit(1)

    if (error) {
        console.error('❌ Error verifying column:', error.message)
        console.error('It seems the "application_data" column does not exist or permissions are blocked.')
        process.exit(1)
    }

    console.log('✅ Column "application_data" accessibility check passed.')
    console.log('Ensure you have RLS policies allowing insert/select if you encounter permission errors later.')
}

verifyColumn()
