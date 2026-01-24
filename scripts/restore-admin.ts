
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function restoreAdmin() {
    const email = 'lucy@omarifinance.com'
    const password = 'Password123!' // Default temporary password
    const role = 'admin_verifier' // Best guess for "admin for verification"

    console.log(`Attempting to recreate admin: ${email}...`)

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: role // Should be in app_metadata usually, let's put in both to be safe or update after
        },
        app_metadata: {
            role: role
        }
    })

    if (error) {
        console.error('Error creating user:', error)
    } else {
        console.log('✅ User reinstated successfully!')
        console.log(`ID: ${data.user.id}`)
        console.log(`Email: ${data.user.email}`)
        console.log(`Temporary Password: ${password}`)
        console.log('Role set to:', role)
    }
}

restoreAdmin()
