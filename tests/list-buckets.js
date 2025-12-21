// List all storage buckets
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

async function listBuckets() {
    console.log('🔍 Checking Supabase Storage...\n')
    console.log(`Project URL: ${supabaseUrl}\n`)

    try {
        const { data: buckets, error } = await supabase.storage.listBuckets()

        if (error) {
            console.log('❌ Error:', error.message)
            return
        }

        if (!buckets || buckets.length === 0) {
            console.log('📭 No storage buckets found in this project')
            console.log('\nThis means you need to create the "documents" bucket')
            return
        }

        console.log(`Found ${buckets.length} bucket(s):\n`)
        buckets.forEach((bucket, i) => {
            console.log(`${i + 1}. Name: "${bucket.name}"`)
            console.log(`   ID: ${bucket.id}`)
            console.log(`   Public: ${bucket.public}`)
            console.log(`   Created: ${bucket.created_at}`)
            console.log('')
        })

        const hasDocs = buckets.find(b => b.name === 'documents')
        if (hasDocs) {
            console.log('✅ "documents" bucket exists!')
        } else {
            console.log('❌ "documents" bucket NOT found')
            console.log('\nYou have other buckets but not "documents"')
            console.log('Please create a bucket named exactly: documents')
        }

    } catch (err) {
        console.log('💥 Error:', err.message)
    }
}

listBuckets()
