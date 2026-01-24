'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkEmailExists(email: string): Promise<boolean> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Method 1: Check profiles table first (faster)
        const { data: profileCheck, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (profileCheck) {
            return true
        }

        // Method 2: Check Auth users directly using Admin API
        // listUsers returns all users, we filter by email
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000 // Get a reasonable batch
        })

        if (authError) {
            console.error('[checkEmailExists] Auth error:', authError)
            // Fall through, don't block signup on error
        }

        if (authData?.users) {
            const existingUser = authData.users.find(
                (user) => user.email?.toLowerCase() === email.toLowerCase()
            )
            if (existingUser) {
                return true
            }
        }

        return false

    } catch (error) {
        console.error('[checkEmailExists] Error:', error)
        return false // Don't block signup on error
    }
}

export async function createProfile(userId: string, fullName: string, email: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({ // Opsert to be safe effectively
                id: userId,
                full_name: fullName,
                email: email,
                updated_at: new Date().toISOString(),
            })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error("Create Profile Error:", error)
        return { success: false, error: error.message }
    }
}
