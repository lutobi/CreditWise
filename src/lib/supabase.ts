import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Fallback or early return during build time if needed
        // But ideally we want to throw or return a proxy if this is called at the wrong time.
        // For Client Components, these should be available.
        if (typeof window === 'undefined') {
            console.warn("Supabase context requested server-side during build without env vars.");
        }
    }

    supabaseInstance = createClient(supabaseUrl || '', supabaseAnonKey || '', {
        auth: {
            storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    })

    return supabaseInstance;
}

// Deprecated: Use getSupabase() instead. Keeping this for compatibility during refactor if needed, 
// but it will still fail if accessed at module level during build.
export const supabase = typeof window !== 'undefined' ? getSupabase() : {} as any;
