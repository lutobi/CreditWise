// Detailed storage diagnostics
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
    console.log('🔧 Detailed Storage Diagnostics\n')
    console.log('Configuration:')
    console.log(`- URL: ${supabaseUrl}`)
    console.log(`- Key: ${supabaseKey.substring(0, 20)}...`)
    console.log('')

    // Test 1: List buckets
    console.log('Test 1: Listing buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
        console.log(`❌ Error: ${bucketsError.message}`)
        console.log(`   Status: ${bucketsError.status}`)
        console.log(`   Details:`, bucketsError)
    } else {
        console.log(`✅ Success: ${buckets?.length || 0} bucket(s) found`)
        if (buckets && buckets.length > 0) {
            buckets.forEach(b => console.log(`   - ${b.name}`))
        }
    }

    console.log('')

    // Test 2: Try to access documents bucket directly
    console.log('Test 2: Accessing "documents" bucket directly...')
    const { data: files, error: filesError } = await supabase.storage
        .from('documents')
        .list()

    if (filesError) {
        console.log(`❌ Error: ${filesError.message}`)
        console.log(`   This could mean:`)
        console.log(`   - Bucket doesn't exist`)
        console.log(`   - No permission to access bucket`)
        console.log(`   - RLS policies blocking access`)
    } else {
        console.log(`✅ Success: Can access documents bucket!`)
        console.log(`   Files found: ${files?.length || 0}`)
    }

    console.log('')

    // Test 3: Check database connection
    console.log('Test 3: Database connection...')
    const { error: dbError } = await supabase.from('profiles').select('count').limit(1)

    if (dbError) {
        console.log(`❌ Database Error: ${dbError.message}`)
    } else {
        console.log(`✅ Database connection works`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n📋 DIAGNOSIS:')

    if (!bucketsError && buckets && buckets.length === 0) {
        console.log('\n⚠️  The anon key can access storage BUT finds no buckets.')
        console.log('   This might mean:')
        console.log('   1. Bucket was created in a different project')
        console.log('   2. Bucket naming is case-sensitive (must be "documents")')
        console.log('   3. Browser cache showing old data')
        console.log('\n   💡 Try refreshing your Supabase dashboard and verify')
        console.log('      the bucket really exists in project: oqufncrgcdevqeiglmgj')
    }

    if (filesError && !filesError.message.includes('The resource was not found')) {
        console.log('\n⚠️  Permission issue detected')
        console.log('   The anon key might need storage permissions')
    }
}

diagnose()
