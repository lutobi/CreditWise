"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type AuthContextType = {
    user: User | null
    session: Session | null
    isLoading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // 1. Initialization Effect (Run Once)
    useEffect(() => {
        let mounted = true;

        const checkMockUser = () => {
            // SECURITY: Require BOTH development mode AND explicit flag to enable mock auth
            const allowMockAuth = process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH === 'true';
            const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

            if (isDev && allowMockAuth) {
                const mockUserJson = typeof window !== 'undefined' ? localStorage.getItem('nomad_mock_user') : null
                if (mockUserJson) {
                    try {
                        const mockUser = JSON.parse(mockUserJson)
                        // Validate mock user has required fields
                        if (mockUser?.id && mockUser?.email) {
                            if (mounted) {
                                // Avoid loop: Only update if not already set or ID differs
                                setUser(prev => prev?.id === mockUser.id ? prev : mockUser)
                                setSession(prev => prev?.user?.id === mockUser.id ? prev : { user: mockUser, access_token: 'mock-token', token_type: 'bearer' } as Session)
                                setIsLoading(false)
                            }
                            return true; // Mock user found
                        }
                    } catch (e) {
                        console.error('[Auth] Invalid mock user JSON:', e);
                    }
                }
            }
            return false;
        };

        if (checkMockUser()) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session)
                setUser(session?.user ?? null)
                setIsLoading(false)
            }
        })

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // Run only on mount

    // 2. Idle Timer Effect (Run on Session Change)
    useEffect(() => {
        if (!session?.user) return;

        const TIMEOUT_MS = 20 * 60 * 1000;
        let idleTimer: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(async () => {
                console.log("⚠️ Session timed out due to inactivity (20m)");
                await supabase.auth.signOut();
                router.push('/login?reason=timeout');
            }, TIMEOUT_MS);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [session?.user, router]);

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
