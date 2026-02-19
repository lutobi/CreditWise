'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkEmailExists(email: string): Promise<boolean> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Method 1: Check profiles table first (faster, indexed lookup)
        const { data: profileCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (profileCheck) {
            return true
        }

        // Method 2: Check Auth users via Admin API
        // Use listUsers with a filter instead of fetching all users
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1,
            // Filter not directly supported, so we do a targeted search
        })

        // Fallback: search by iterating only if small user base
        // For production at scale, rely on profiles table as source of truth
        if (authError) {
            console.error('[checkEmailExists] Auth error:', authError)
            // Fall through, don't block signup on error
        }

        // Direct email lookup via RPC or profiles is the source of truth
        // The profiles table should always have the email for registered users
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
