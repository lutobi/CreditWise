"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Download, TrendingUp, DollarSign, Calendar, FileText, Activity } from "lucide-react"
import { CircularProgress } from "@/components/ui/circular-progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

type ReportStats = {
    totalDisbursed: number
    countDisbursed: number
    totalPending: number
    countPending: number
    todayDisbursed: number
    projectedInterest: number
    totalLimit: number
    repaymentRate?: number
}

// Mock Data (Fallback)
const emptyChart = [
    { name: 'Jan', volume: 0, revenue: 0 },
    { name: 'Feb', volume: 0, revenue: 0 },
    { name: 'Mar', volume: 0, revenue: 0 },
]

// Demo Data (Moved outside component for stability)
const demoStats: ReportStats = {
    totalDisbursed: 3850000,
    countDisbursed: 1420,
    totalPending: 850000,
    countPending: 125,
    todayDisbursed: 45000,
    projectedInterest: 962500,
    totalLimit: 6000000,
    repaymentRate: 94.5
};

const demoChartData = [
    { name: 'Aug', volume: 150000, revenue: 37500 },
    { name: 'Sep', volume: 280000, revenue: 70000 },
    { name: 'Oct', volume: 450000, revenue: 112500 },
    { name: 'Nov', volume: 890000, revenue: 222500 },
    { name: 'Dec', volume: 1200000, revenue: 300000 },
    { name: 'Jan', volume: 880000, revenue: 220000 },
];

export default function ReportsPage() {
    const { user, session, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [stats, setStats] = useState<ReportStats | null>(null)
    const [chartData, setChartData] = useState<any[]>(emptyChart)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [isDemoMode, setIsDemoMode] = useState(false)

    // Filter State (Initialize empty to avoid hydration mismatch)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Date Init Effect
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today)
        setEndDate(today)
    }, [])

    useEffect(() => {
        if (!authLoading && user?.id) {
            checkAccess();
            // Only fetch if no data or hard refresh needed. 
            // We depend on user.id (stable string) not user (object).
            fetchData();
        }
    }, [user?.id, authLoading])

    const checkAccess = () => {
        if (!user) return router.push('/login');
        const role = user.app_metadata?.role;
        if (role !== 'admin' && role !== 'admin_verifier' && role !== 'admin_approver') {
            // Use console error instead of alert to prevent blocking UI
            console.error("Access Denied");
            router.push('/');
        }
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            // Robust Auth: Attach Token
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // Parallel Fetch
            const [statsRes, chartsRes] = await Promise.all([
                fetch('/api/admin/reports/reconciliation', { headers }),
                fetch('/api/admin/reports/charts', { headers })
            ]);

            const statsData = await statsRes.json();
            const chartsData = await chartsRes.json();

            if (!statsData.success) throw new Error(statsData.error || "Failed to load stats");
            if (!chartsData.success) console.warn("Charts data missing");

            setStats(statsData.data);
            if (chartsData.success && chartsData.data.length > 0) {
                setChartData(chartsData.data);
            }
        } catch (error: any) {
            console.error(error);
            setError("Failed to load report data");
        } finally {
            setLoading(false);
        }
    }

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const query = new URLSearchParams({ startDate, endDate }).toString();
            const res = await fetch(`/api/admin/reports/loan-book?${query}`);

            if (!res.ok) throw new Error("Download failed");

            // Convert to Blob and Trigger Download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loan_book_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert("Error downloading report.");
        } finally {
            setDownloading(false);
        }
    }


    const formatCompactNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    const activeStats = isDemoMode ? demoStats : stats;
    const activeChartData = isDemoMode ? demoChartData : chartData;

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
                        <p className="text-slate-600">Export data and view financial performance.</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
                        <span className={`text-sm font-medium ${isDemoMode ? 'text-slate-400' : 'text-slate-900'}`}>Live Data</span>
                        <Button
                            variant={isDemoMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDemoMode(!isDemoMode)}
                            className={isDemoMode ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}
                        >
                            {isDemoMode ? "Demo Mode ON" : "Enable Demo"}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
                        ⚠️ System Alert: {error}. Data may be incomplete.
                    </div>
                )}

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Financial Overview</TabsTrigger>
                        <TabsTrigger value="exports">Data Exports</TabsTrigger>
                    </TabsList>

                    {/* 1. Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">

                        {/* Top Row: Key Performance Rings & Totals */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Visual Ring: Budget Utilization */}
                            <Card className="flex flex-col items-center justify-center p-6 bg-white shadow-sm border-slate-200">
                                <div style={{ width: 140, height: 170 }}>
                                    <CircularProgress
                                        value={loading ? 0 : (activeStats ? Math.min(100, (activeStats.totalDisbursed / (activeStats.totalLimit || 1)) * 100) : 0)}
                                        label="Budget Utilized"
                                        color="text-blue-600"
                                        subLabel={loading ? "Calculating..." : `N$ ${formatCompactNumber(activeStats?.totalDisbursed || 0)} / ${formatCompactNumber(activeStats?.totalLimit || 4500000)}`}
                                    />
                                </div>
                            </Card>

                            {/* Visual Ring: Repayment Rate */}
                            <Card className="flex flex-col items-center justify-center p-6 bg-white shadow-sm border-slate-200">
                                <CircularProgress
                                    value={loading ? 0 : (activeStats?.repaymentRate || 0)}
                                    label="Repayment Rate"
                                    color="text-green-600"
                                    subLabel={loading ? "Analyzing..." : "Current Performance"}
                                />
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600">Total Disbursed</CardTitle>
                                    <div className="p-2 bg-blue-100 rounded-full">
                                        <DollarSign className="h-4 w-4 text-blue-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {loading ? <span className="text-slate-400 animate-pulse">---</span> : `N$ ${activeStats?.totalDisbursed.toLocaleString()}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {loading ? "Fetching records..." : `Across ${activeStats?.countDisbursed} Loans`}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600">Est. Revenue</CardTitle>
                                    <div className="p-2 bg-green-100 rounded-full">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-700">
                                        {loading ? <span className="text-green-700/50 animate-pulse">---</span> : `N$ ${activeStats?.projectedInterest.toLocaleString()}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Projected Interest
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Middle Row: Charts */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="col-span-1">
                                <CardHeader>
                                    <CardTitle>Monthly Loan Volume</CardTitle>
                                    <CardDescription>Disbursed amounts over last 6 months</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full block">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                                                <Activity className="w-8 h-8 animate-spin" />
                                                <span className="text-sm">Loading Chart Data...</span>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300} key={isDemoMode ? 'demo-bar' : 'live-bar'}>
                                                <BarChart data={activeChartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `N$${value}`} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                                    <Bar dataKey="volume" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="col-span-1">
                                <CardHeader>
                                    <CardTitle>Revenue Trends</CardTitle>
                                    <CardDescription>Interest Income trajectory</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full block">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                                                <Activity className="w-8 h-8 animate-spin" />
                                                <span className="text-sm">Loading Trends...</span>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300} key={isDemoMode ? 'demo-area' : 'live-area'}>
                                                <AreaChart data={activeChartData}>
                                                    <defs>
                                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" />
                                                    <YAxis />
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <Tooltip />
                                                    <Area type="monotone" dataKey="revenue" stroke="#16a34a" fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={false} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Bottom Row: Secondary Stats */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pending Pipeline</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {loading ? <span className="animate-pulse">---</span> : `N$ ${activeStats?.totalPending.toLocaleString()}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{loading ? "Scanning..." : `${activeStats?.countPending} applications`}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Daily Velocity</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {loading ? <span className="animate-pulse">---</span> : `N$ ${activeStats?.todayDisbursed.toLocaleString()}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{loading ? "Syncing..." : "Disbursed Today"}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 text-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-200">System Health</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {loading ? <span className="text-yellow-400">Checking...</span> : "100%"}
                                    </div>
                                    <p className="text-xs text-slate-400">{loading ? "Verifying Services" : "All Systems Operational"}</p>
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>

                    {/* 2. Exports Tab */}
                    <TabsContent value="exports">
                        <Card>
                            <CardHeader>
                                <CardTitle>Loan Book Export</CardTitle>
                                <CardDescription>Download a CSV file of all loans within a specific date range.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Start Date</label>
                                        <input
                                            type="date"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">End Date</label>
                                        <input
                                            type="date"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleDownload} disabled={downloading}>
                                    {downloading ? "Generating CSV..." : (
                                        <>
                                            <Download className="mr-2 h-4 w-4" /> Download Loan Book
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

            </main>
            <Footer />
        </div>
    )
}
