// Storage Bucket Verification Script
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

async function verifyStorage() {
    console.log('🔍 Verifying Supabase Storage Setup...\n')

    try {
        const { data: buckets, error } = await supabase.storage.listBuckets()

        if (error) {
            console.log('❌ Error connecting to storage:', error.message)
            return false
        }

        const documentsBucket = buckets?.find(b => b.name === 'documents')

        if (documentsBucket) {
            console.log('✅ Storage bucket "documents" exists')
            console.log(`   - ID: ${documentsBucket.id}`)
            console.log(`   - Public: ${documentsBucket.public}`)
            console.log(`   - Created: ${documentsBucket.created_at}`)
            console.log('\n✅ Storage is ready!')
            console.log('\nYou can now upload documents at: http://localhost:3000/documents')
            return true
        } else {
            console.log('❌ Storage bucket "documents" NOT found')
            console.log('\n📋 To fix this:')
            console.log('1. Go to https://app.supabase.com')
            console.log('2. Navigate to Storage')
            console.log('3. Create a new bucket named "documents"')
            console.log('4. Set it as PRIVATE (not public)')
            console.log('5. Run this command again to verify')
            console.log('\nOr follow the guide in: STORAGE_SETUP.md')
            return false
        }
    } catch (err) {
        console.log('💥 Unexpected error:', err.message)
        return false
    }
}

verifyStorage()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('💥 Script failed:', err)
        process.exit(1)
    })
