"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Banknote, Loader2, UserCog, Lock, TrendingUp } from "lucide-react"
import { CircularProgress } from "@/components/ui/circular-progress"

export default function AdminRouter() {
    const { user, session, isLoading } = useAuth()
    const router = useRouter()
    const [role, setRole] = useState<string | null>(null)
    const [metrics, setMetrics] = useState({ uptime: 0, latency: 0, workload: 0, tasks: 0, security: 100 })
    const [loadingMetrics, setLoadingMetrics] = useState(true)

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
                return;
            }

            const userRole = user.app_metadata?.role;
            setRole(userRole);

            // Fetch Metrics
            if (userRole === 'admin' || userRole === 'super_admin') {
                const fetchMetrics = async () => {
                    try {
                        const headers: Record<string, string> = {};
                        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

                        const res = await fetch('/api/admin/metrics', { headers });
                        const data = await res.json();
                        if (data.success) setMetrics(data.data);
                    } catch (e) {
                        console.error("Metrics fetch failed", e);
                    } finally {
                        setLoadingMetrics(false);
                    }
                };
                fetchMetrics();
            } else {
                setLoadingMetrics(false);
            }

            // Auto-Redirect based on specific roles
            if (userRole === 'admin_verifier') {
                router.push('/admin/verification');
            } else if (userRole === 'admin_approver') {
                router.push('/admin/approval');
            }
            // Super 'admin' stays here to choose
        }
    }, [user, isLoading, router])

    if (isLoading || !role) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    // If regular user or unknown role tries to access
    if (role !== 'admin' && role !== 'admin_verifier' && role !== 'admin_approver' && role !== 'super_admin') {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <Lock className="w-12 h-12 text-slate-300" />
                <h1 className="text-xl font-bold">Access Denied</h1>
                <p>You do not have administrative privileges.</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-slate-600 mb-8">Select a workflow queue to manage.</p>

                    <div className="grid md:grid-cols-2 gap-6 items-start">
                        {/* System Health Section - Real Data */}
                        <div className="mb-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200 col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">System Metrics</h2>
                                    <p className="text-slate-500">Live operational performance.</p>
                                </div>
                                {loadingMetrics ? (
                                    <div className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-yellow-100 text-yellow-700">
                                        Checking...
                                    </div>
                                ) : (
                                    <div className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${metrics.uptime > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {metrics.uptime > 0 ? 'Operational' : 'Outage'}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
                                <CircularProgress
                                    value={metrics.uptime}
                                    size={140}
                                    strokeWidth={12}
                                    label="API Status"
                                    color="text-green-500"
                                    subLabel={loadingMetrics ? 'Connecting...' : (metrics.latency > 0 ? `${metrics.latency}ms Latency` : 'Checking...')}
                                />
                                <CircularProgress
                                    value={metrics.workload}
                                    size={140}
                                    strokeWidth={12}
                                    label="Pipeline Load"
                                    color="text-blue-500"
                                    subLabel={loadingMetrics ? 'Calculating...' : `${metrics.tasks} Active Items`}
                                />
                                <CircularProgress
                                    value={metrics.tasks > 0 ? 100 : 0} // Full ring if tasks exist
                                    size={140}
                                    strokeWidth={12}
                                    label="Queue Depth"
                                    color="text-purple-500"
                                    subLabel={loadingMetrics ? 'Syncing...' : `${metrics.tasks} Pending`}
                                />
                                <CircularProgress
                                    value={metrics.security}
                                    size={140}
                                    strokeWidth={12}
                                    label="Approval Rate"
                                    color="text-slate-700"
                                    subLabel={loadingMetrics ? 'Analyzing...' : `${(100 - metrics.security).toFixed(0)}% Rejected`}
                                />
                            </div>
                        </div>

                        {/* Verification Queue Card */}
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500" onClick={() => router.push('/admin/verification')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl text-blue-900">Verification Queue</CardTitle>
                                <ShieldCheck className="w-8 h-8 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 mb-4">
                                    Review identity documents, selfies, and employment status.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                    <UserCog className="w-4 h-4" />
                                    Managed by: Verifiers (Lucy)
                                </div>
                            </CardContent>
                        </Card>

                        {/* Approval Queue Card */}
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500" onClick={() => router.push('/admin/approval')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl text-purple-900">Approval Queue</CardTitle>
                                <Banknote className="w-8 h-8 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 mb-4">
                                    Review credit reports, affordability, and disburse loans.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                                    <UserCog className="w-4 h-4" />
                                    Managed by: Approvers (Tobi)
                                </div>
                            </CardContent>
                        </Card>

                        {/* Active Loans Card - NEW */}
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500" onClick={() => router.push('/admin/loans')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl text-green-900">Active Loans</CardTitle>
                                <TrendingUp className="w-8 h-8 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 mb-4">
                                    Track payments, record receipts, and manage loan portfolio.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                    <UserCog className="w-4 h-4" />
                                    Payments & Collections
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
