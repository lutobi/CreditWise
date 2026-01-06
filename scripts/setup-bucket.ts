
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBucket() {
    console.log('Checking "documents" bucket...')
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
        console.error('Error listing buckets:', error)
        return
    }

    const docBucket = buckets.find(b => b.name === 'documents')
    if (!docBucket) {
        console.log('❌ "documents" bucket NOT found. Creating...')
        const { data, error: createError } = await supabase.storage.createBucket('documents', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
        })
        if (createError) {
            console.error('Error creating bucket:', createError)
        } else {
            console.log('✅ Created "documents" bucket.')
        }
    } else {
        console.log('✅ "documents" bucket exists.')
    }
}

checkBucket()
