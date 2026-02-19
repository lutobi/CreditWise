'use server'

import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

export interface LoginResult {
    success: boolean
    error?: string
    isRateLimited?: boolean
    retryAfter?: number
    redirectTo?: string
}

export async function serverLogin(email: string, password: string): Promise<LoginResult> {
    // Get client IP for rate limiting
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rateLimitKey = `login:${ip}:${email.toLowerCase()}`

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.AUTH)
    if (!rateLimit.success) {
        const retryAfterSeconds = Math.ceil((rateLimit.reset - Date.now()) / 1000)
        return {
            success: false,
            error: `Too many login attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
            isRateLimited: true,
            retryAfter: retryAfterSeconds,
        }
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            // Generic error message to prevent user enumeration
            if (error.message.includes('Email not confirmed')) {
                return {
                    success: false,
                    error: 'Please verify your email before logging in. Check your inbox for the verification link.',
                }
            }
            return {
                success: false,
                error: 'Invalid email or password. Please try again.',
            }
        }

        if (data.user) {
            // Determine redirect based on role
            const redirectTo = data.user.app_metadata?.role === 'admin' ? '/admin' : '/dashboard'
            return {
                success: true,
                redirectTo,
            }
        }

        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        }

    } catch (err: any) {
        console.error('[serverLogin] Error:', err)
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        }
    }
}

export async function serverPasswordReset(email: string): Promise<{ success: boolean; error?: string; isRateLimited?: boolean }> {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rateLimitKey = `password-reset:${ip}`

    // Check rate limit (stricter for password reset)
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.PASSWORD_RESET)
    if (!rateLimit.success) {
        const retryAfterMinutes = Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60)
        return {
            success: false,
            error: `Too many reset attempts. Please try again in ${retryAfterMinutes} minutes.`,
            isRateLimited: true,
        }
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
        })

        // Always return success to prevent email enumeration
        // The actual error is logged server-side
        if (error) {
            console.error('[serverPasswordReset] Error:', error)
        }

        return { success: true }

    } catch (err: any) {
        console.error('[serverPasswordReset] Error:', err)
        return { success: true } // Don't reveal errors
    }
}
