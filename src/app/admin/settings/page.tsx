
"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Shield, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

type StaffMember = {
    id: string
    email: string
    role: string
    created_at: string
}

export default function AdminSettingsPage() {
    const { user, session, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [loading, setLoading] = useState(true)

    const [newEmail, setNewEmail] = useState('')
    const [newRole, setNewRole] = useState('admin_verifier')
    const [inviting, setInviting] = useState(false)

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.app_metadata?.role !== 'admin') {
                // Only Super Admin can manage staff
                router.push('/admin')
                return
            }
            fetchStaff()
        }
    }, [user, authLoading])

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/admin/staff')
            const data = await res.json()
            if (data.staff) setStaff(data.staff)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)
        try {
            const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, role: newRole })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message)
                setNewEmail('')
                fetchStaff()
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error("Failed to invite")
        } finally {
            setInviting(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-purple-900">Admin Settings</h1>
                        <p className="text-slate-600">Manage team access and roles.</p>
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Invite Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Team Member</CardTitle>
                            <CardDescription>Grant admin access to a user. If they don't exist, an invite will be sent.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvite} className="flex gap-4 items-end">
                                <div className="grid gap-2 flex-1">
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="colleague@omarifinance.com"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2 w-[200px]">
                                    <Label>Role</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newRole}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRole(e.target.value)}
                                    >
                                        <option value="admin_verifier">Verifier (View Only/Check)</option>
                                        <option value="admin_approver">Approver (Unblock Loan)</option>
                                        <option value="admin">Super Admin</option>
                                    </select>
                                </div>
                                <Button type="submit" disabled={inviting}>
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                    Add Member
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Staff List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Staff</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {staff.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{member.email}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">{member.role.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                        {member.role !== 'admin' && (
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                        </CardContent>
                    </Card>

                    {/* Global Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Configuration</CardTitle>
                            <CardDescription>System-wide financial parameters.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const input = form.elements.namedItem('limit') as HTMLInputElement;
                                    const val = input.value;

                                    try {
                                        toast.loading("Updating budget...");

                                        // Robust Auth: Send Session Token Explicitly
                                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                                        console.log("Budget Update Debug: Session present?", !!session, "Token length:", session?.access_token?.length);

                                        if (session?.access_token) {
                                            headers['Authorization'] = `Bearer ${session.access_token}`;
                                        }

                                        const res = await fetch('/api/admin/settings', {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ totalLimit: val })
                                        });

                                        const data = await res.json();

                                        // Check for Success Flag OR Standard OK (Backwards compat)
                                        if (data.success || (res.ok && !data.error)) {
                                            toast.success("Budget updated!");
                                        } else {
                                            console.error("Update failed:", data);
                                            // Show detailed debug info in toast
                                            const debugMsg = data.debug ? `Role: ${data.debug.role}` : (data.error || "Unknown Error");
                                            toast.error(`Update Failed: ${debugMsg}`);
                                        }
                                    } catch (err: any) {
                                        console.error("Network error:", err);
                                        toast.error(`Network Error: ${err.message}`);
                                    } finally {
                                        toast.dismiss();
                                    }
                                }}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <div className="space-y-2">
                                    <Label>Total Lending Budget (N$)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            name="limit"
                                            type="number"
                                            placeholder="4500000"
                                            defaultValue={4500000}
                                        />
                                        <Button type="submit" variant="secondary">Update</Button>
                                    </div>
                                    <p className="text-xs text-slate-500">Controls the "Budget Utilization" ring in Reports.</p>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

            </main>
            <Footer />
        </div>
    )
}
