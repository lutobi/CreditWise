"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Mail, Calendar, User, CheckCircle2, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

type UserProfile = {
    id: string
    created_at: string // In profiles table, usually updated_at is there. We might need joined_at or infer from created_at
    updated_at?: string
    full_name: string | null
    email: string | null
    phone_number?: string
    address?: string
    userStatus?: string
    statusColor?: string
}

export default function AdminUsersPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        if (!isLoading) {
            const role = user?.app_metadata?.role;
            if (!user || (role !== 'admin' && role !== 'super_admin')) {
                router.push('/admin'); // Redirect if not admin
                return;
            }
            fetchUsers();
        }
    }, [user, isLoading, router])

    const fetchUsers = async () => {
        try {
            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }

            const result = await res.json();
            if (result.success) {
                setUsers(result.data as UserProfile[]);
            } else {
                console.error("Error fetching users from API", result.error);
            }
        } catch (e) {
            console.error("Error fetching users", e);
        } finally {
            setLoadingData(false);
        }
    }

    if (isLoading || loadingData) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="mb-6">
                    <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" onClick={() => router.push('/admin')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">User Registry</h1>
                            <p className="text-slate-600">Track all registered users and their account status.</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border shadow-sm">
                            <span className="text-sm font-medium text-slate-500">Total Users</span>
                            <p className="text-2xl font-bold">{users.length}</p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Registered Accounts</CardTitle>
                        <CardDescription>Users who have signed up via the registration page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-500 font-medium">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500">No users found.</td>
                                        </tr>
                                    ) : (
                                        users.map((profile) => {
                                            const hasProfile = !!profile.address || !!profile.phone_number;
                                            // Ideally check for loan but that requires join. For now, profile status is good.

                                            return (
                                                <tr key={profile.id} className="hover:bg-slate-50/50">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                                <User className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{profile.full_name || 'Unknown'}</p>
                                                                <p className="text-xs text-slate-500 font-mono">{profile.id.slice(0, 8)}...</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            {profile.email && (
                                                                <div className="flex items-center gap-2 text-slate-600">
                                                                    <Mail className="w-3 h-3" /> {profile.email}
                                                                </div>
                                                            )}
                                                            {/* Only show "No Email" if explicitly missing and we expect it */}
                                                            {!profile.email && <span className="text-xs text-slate-400 italic">Email not synced</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${profile.statusColor}-100 text-${profile.statusColor}-700`}>
                                                            <CheckCircle2 className="w-3 h-3" /> {profile.userStatus || 'Registered'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500">
                                                        {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    )
}
