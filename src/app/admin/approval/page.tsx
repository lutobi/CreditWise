"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, FileText, Banknote, DollarSign } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Reuse Types
type ApprovalItem = {
    loan_id: string
    user_id: string
    amount: number
    duration_months: number
    status: string
    created_at: string
    full_name: string
    national_id: string
    monthly_income: number
    employer_name: string
    credit_score: number
    verification_date: string
    reference_id?: string
}

type CreditReport = {
    nationalId: string;
    score: number;
    riskBand: string;
    summary: {
        totalDebt: number;
        activeAccounts: number;
        overdueAccounts: number;
        enquiriesLast6Months: number;
    };
    history: Array<{
        provider: string;
        type: string;
        status: string;
        balance: number;
    }>;
    habits: string[];
}

type AuditLog = {
    id: string
    action: string
    details: any
    created_at: string
}

export default function ApprovalPage() {
    const { user, session, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [queue, setQueue] = useState<ApprovalItem[]>([])
    const [loading, setLoading] = useState(true)
    const [viewingReport, setViewingReport] = useState<CreditReport | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [viewingHistory, setViewingHistory] = useState<string | null>(null);
    const [managingRepayment, setManagingRepayment] = useState<ApprovalItem | null>(null);
    const [repaymentAmount, setRepaymentAmount] = useState('');
    const [repaymentMethod, setRepaymentMethod] = useState('cash');
    const [activeTab, setActiveTab] = useState<'queue' | 'active'>('queue');

    useEffect(() => {
        if (!authLoading) {
            checkAccess();
            fetchQueue();
        }
    }, [user, authLoading, activeTab])

    const checkAccess = () => {
        if (!user) return router.push('/login');
        const role = user.app_metadata?.role;
        // Allow 'admin' (superuser), 'admin_approver', and 'super_admin'
        if (role !== 'admin' && role !== 'admin_approver' && role !== 'super_admin') {
            alert("Access Denied: You need the Approver Role.");
            router.push('/');
        }
    }

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const url = `/api/admin/approval-queue?tab=${activeTab}`;

            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(url, { headers });
            const result = await res.json();

            if (result.success) {
                setQueue(result.data);
            } else {
                console.error("Queue Fetch Failed:", result.error);
                setQueue([]);
            }

        } catch (error) {
            console.error("Network Error fetching queue:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleLoanAction = async (id: string, status: 'approved' | 'rejected') => {
        let reason = '';
        if (status === 'rejected') {
            const input = prompt("Rejection Reason:", "Did not meet affordability criteria");
            if (input === null) return;
            reason = input;
        }

        if (!confirm(`Are you sure you want to ${status.toUpperCase()} this loan?`)) return;

        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/admin/status-update', {
                method: 'POST',
                headers,
                body: JSON.stringify({ loanId: id, status, reason })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Loan ${status} successfully.`);
                fetchQueue();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e: any) {
            alert('Request failed: ' + e.message);
        }
    }

    const handleViewReport = async (nationalId: string) => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/credit-check', {
                method: 'POST',
                headers,
                body: JSON.stringify({ nationalId })
            });
            const data = await res.json();
            if (data.success) setViewingReport(data.data);
            else alert("Failed to fetch report");
        } catch (e) { alert("Network Error"); }
    }

    const handleViewHistory = async (loanId: string) => {
        setViewingHistory(loanId);
        setAuditLogs([]); // Reset
        try {
            const headers: HeadersInit = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch(`/api/admin/audit?loanId=${loanId}`, { headers });
            const data = await res.json();
            if (data.success) {
                setAuditLogs(data.data || []);
            } else {
                alert("Failed to load history");
            }
        } catch (e) { console.error(e); }
    }

    const submitRepayment = async () => {
        if (!managingRepayment || !repaymentAmount) return;
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/admin/repay', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    loanId: managingRepayment.loan_id,
                    amount: repaymentAmount,
                    method: repaymentMethod
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Repayment of N$ ${repaymentAmount} recorded.`);
                setManagingRepayment(null);
                setRepaymentAmount('');
                // Optionally refresh queue if we were showing active loans
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) { alert('Network Error'); }
    }

    const handleDownloadContract = async (loanId: string) => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch('/api/documents/contract', {
                method: 'POST',
                headers,
                body: JSON.stringify({ loanId })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to generate contract");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Loan_Agreement_${loanId.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e: any) {
            alert('Error downloading contract: ' + e.message);
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-purple-900">Approval Queue</h1>
                        <p className="text-slate-600">Final Decision & Disbursement</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/admin/reports')}>Reports</Button>
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                            {queue.length} Ready
                        </div>
                    </div>
                </div>



                <div className="flex justify-between items-center mb-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[400px]">
                        <TabsList>
                            <TabsTrigger value="queue">Approval Queue</TabsTrigger>
                            <TabsTrigger value="active">Active Loans</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="grid gap-6">
                    {queue.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                            <Banknote className="w-12 h-12 mx-auto mb-4 text-purple-300" />
                            <h3 className="text-lg font-medium">No Loans Found</h3>
                            <p>{activeTab === 'queue' ? 'Waiting for Verified Applicants.' : 'No active loans currently.'}</p>
                        </div>
                    )}

                    {queue.map(item => (
                        <Card key={item.loan_id} className={`border-l-4 shadow-md ${activeTab === 'queue' ? 'border-l-purple-500' : 'border-l-green-500'}`}>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-4 gap-6">
                                    {/* 1. Score & Risk */}
                                    <div className="text-center md:text-left md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Credit Health</p>
                                        <div className="text-4xl font-bold text-slate-900 mb-1">{item.credit_score}</div>
                                        <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${item.credit_score > 650 ? 'bg-green-100 text-green-700' :
                                            item.credit_score > 550 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {item.credit_score > 650 ? 'Low Risk' : item.credit_score > 550 ? 'Medium Risk' : 'High Risk'}
                                        </div>
                                        <div className="flex flex-col gap-2 mt-4">
                                            <Button variant="link" className="h-auto p-0 text-purple-600" onClick={() => handleViewReport(item.national_id)}>
                                                View Credit Report
                                            </Button>
                                            <Button variant="link" className="h-auto p-0 text-slate-500" onClick={() => handleViewHistory(item.loan_id)}>
                                                View Audit History
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 2. Loan & Income Details */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg">{item.full_name}</h3>
                                                <div className="flex gap-2 text-sm text-slate-500">
                                                    <span>{item.employer_name}</span>
                                                    {item.reference_id && (
                                                        <span className="bg-slate-200 px-1 rounded text-xs py-0.5 flex items-center">
                                                            {item.reference_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-slate-900">N$ {item.amount.toLocaleString()}</div>
                                                <p className="text-xs text-slate-500">Requested for {item.duration_months} Month(s)</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg text-sm">
                                            <div>
                                                <span className="text-slate-500 block text-xs">Monthly Income</span>
                                                <span className="font-semibold">N$ {item.monthly_income.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs">Affordability Ratio</span>
                                                {/* Simple calc: Loan Payment / Income */}
                                                <span className={`font-semibold ${(item.amount / item.monthly_income) > 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {((item.amount / item.monthly_income) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Actions */}
                                    <div className="md:col-span-1 flex flex-col justify-center gap-2 pl-4 border-l border-slate-100">
                                        <Button variant="outline" className="w-full text-slate-700 border-slate-300 hover:bg-slate-50" onClick={() => handleDownloadContract(item.loan_id)}>
                                            <FileText className="w-4 h-4 mr-2" /> Agreement
                                        </Button>

                                        {activeTab === 'queue' ? (
                                            <>
                                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleLoanAction(item.loan_id, 'approved')}>
                                                    <Check className="w-4 h-4 mr-2" /> Approve
                                                </Button>
                                                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleLoanAction(item.loan_id, 'rejected')}>
                                                    <X className="w-4 h-4 mr-2" /> Reject
                                                </Button>
                                            </>
                                        ) : (
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setManagingRepayment(item)}>
                                                <DollarSign className="w-4 h-4 mr-2" /> Log Payment
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
            <Footer />

            {/* Credit Report Modal */}
            {viewingReport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-white border-b">
                            <CardTitle>Credit Report</CardTitle>
                            <Button size="icon" variant="ghost" onClick={() => setViewingReport(null)}><X className="w-4 h-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="bg-slate-100 p-4 rounded text-center">
                                    <div className="text-3xl font-bold">{viewingReport.score}</div>
                                    <div className="text-sm text-muted-foreground">{viewingReport.riskBand}</div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">History</h4>
                                    {viewingReport.history.map((h, i) => (
                                        <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                                            <span>{h.provider} ({h.type})</span>
                                            <span className={h.status === 'Active' ? 'text-blue-600' : h.status === 'Defaulted' ? 'text-red-600' : 'text-slate-500'}>{h.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Audit History Modal (Improved) */}
            {viewingHistory && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-white border-b">
                            <CardTitle>Audit Timeline</CardTitle>
                            <Button size="icon" variant="ghost" onClick={() => setViewingHistory(null)}><X className="w-4 h-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {auditLogs.length === 0 ? (
                                <p className="text-center text-slate-500">No events logged yet.</p>
                            ) : (
                                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                                    {auditLogs.map(log => (
                                        <div key={log.id} className="relative pl-6">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-blue-500"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    {new Date(log.created_at).toLocaleDateString()} &middot; {new Date(log.created_at).toLocaleTimeString()}
                                                </span>
                                                <h4 className="font-bold text-slate-800 text-sm mt-1">{log.action.replace(/_/g, ' ')}</h4>

                                                {log.details && Object.keys(log.details).length > 0 && (
                                                    <div className="mt-2 bg-slate-50 p-3 rounded-md text-xs text-slate-600 border border-slate-100">
                                                        {Object.entries(log.details).map(([key, value]) => (
                                                            <div key={key} className="flex justify-between border-b border-slate-200 last:border-0 py-1">
                                                                <span className="font-medium capitalize text-slate-500">{key}:</span>
                                                                <span className="text-slate-700 truncate max-w-[150px]">{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Repayment Modal */}
            {managingRepayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle>Log Repayment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Amount (N$)</label>
                                <input
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={repaymentAmount}
                                    onChange={(e) => setRepaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Method</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={repaymentMethod}
                                    onChange={(e) => setRepaymentMethod(e.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="direct_debit">Direct Debit</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setManagingRepayment(null)}>Cancel</Button>
                                <Button onClick={submitRepayment}>Confirm Payment</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
