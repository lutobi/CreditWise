
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

async function auditUsers() {
    console.log('Fetching profiles...')

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, role')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log(`Found ${users.length} profiles.`)
    console.log('---------------------------------------------------')
    console.log('ID | Email | Name | Role | Created At')
    console.log('---------------------------------------------------')

    users.forEach(u => {
        console.log(`${u.id} | ${u.email} | ${u.full_name} | ${u.role} | ${u.created_at}`)
    })
}

auditUsers()
