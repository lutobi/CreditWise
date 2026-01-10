"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, AlertCircle } from "lucide-react"

type LoanApplication = {
    id: string
    amount: number
    duration_months: number
    status: string
    created_at: string
    documents: {
        id_url: string
        payslip_url: string
        selfie_url?: string
    } | null
    profiles: {
        full_name: string
        national_id: string
    }
    application_data: {
        verificationData?: {
            estimatedIncome: number
            incomeConfidence: number
            success: boolean
        }
        monthlyIncome?: string // From Step 2
    }
}

type VerificationRequest = {
    user_id: string
    employer_name: string
    monthly_income: number
    is_employed: boolean
    credit_score: number
    employment_type?: string // Added field
    profiles: {
        full_name: string
        national_id: string
    }
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


export default function AdminPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState<LoanApplication[]>([])
    const [verifications, setVerifications] = useState<VerificationRequest[]>([])
    const [loading, setLoading] = useState(true)
    // Credit Report State
    const [viewingReport, setViewingReport] = useState<CreditReport | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            // Check for admin role
            if (!user || user.app_metadata?.role !== 'admin') {
                // Make sure to handle the case where user might be null (not logged in)
                // or logged in but not admin. 
                // For now, simple redirect is fine.
                if (user?.app_metadata?.role !== 'admin') {
                    // create a check to avoid infinite redirect if on login
                    router.push('/');
                }
            }
            fetchAdminData()
        }
    }, [user, authLoading])

    const fetchAdminData = async () => {
        try {
            // Fetch pending loans
            const { data: loansData } = await supabase
                .from('loans')
                .select('*, profiles(full_name, national_id)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (loansData) setLoans(loansData as unknown as LoanApplication[])

            // Fetch pending verifications
            const { data: verifData } = await supabase
                .from('verifications')
                .select('*, profiles(full_name, national_id)')
                .eq('is_employed', false)
                .not('employer_name', 'is', null)

            if (verifData) setVerifications(verifData as unknown as VerificationRequest[])

        } catch (error) {
            console.error("Error fetching admin data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLoanAction = async (id: string, status: 'approved' | 'rejected') => {
        let reason = '';
        if (status === 'rejected') {
            const input = prompt("Enter Rejection Reason:", "Did not meet affordability criteria");
            if (input === null) return;
            reason = input;
        }

        if (!window.confirm(`Are you sure you want to ${status.toUpperCase()} this loan? This will notify the user.`)) return;

        try {
            const res = await fetch('/api/admin/status-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loanId: id, status, reason })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Loan ${status} successfully and email sent.`);
                fetchAdminData();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e: any) {
            console.error(e);
            alert('Request failed: ' + e.message);
        }
    }

    const handleViewDocument = async (url?: string) => {
        if (!url) return;
        try {
            const response = await fetch('/api/admin/document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
                },
                body: JSON.stringify({ url })
            })
            const data = await response.json()
            if (data.signedUrl) {
                window.open(data.signedUrl, '_blank')
            } else {
                alert('Failed to generate secure link: ' + (data.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error viewing document:', error)
            alert('Error viewing document')
        }
    }

    const handleVerifyUser = async (userId: string, income: number, employmentType: string, nationalId?: string) => {
        try {
            // 1. Calculate Score via API
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
                },
                body: JSON.stringify({
                    income: income.toString(),
                    employmentType: employmentType
                })
            })

            const result = await response.json();

            if (result.success) {
                // 2. Update Supabase
                await supabase.from('verifications').update({
                    is_employed: true,
                    credit_score: result.data.score
                }).eq('user_id', userId)

                // Refresh Data
                fetchAdminData()

                // 3. Show Full Report immediately if we have ID
                if (nationalId) {
                    await handleCreditCheck(nationalId); // Re-use logic to fetch & show modal
                } else {
                    alert(`User Verified! Score: ${result.data.score}`);
                }
            } else {
                alert('Verification Failed')
            }

        } catch (error) {
            console.error('Verification error:', error)
        }
    }

    const handleCreditCheck = async (nationalId: string) => {
        setReportLoading(true);
        try {
            const res = await fetch('/api/credit-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId })
            });
            const data = await res.json();
            if (data.success) {
                setViewingReport(data.data);
            } else {
                alert('Failed to fetch credit report: ' + data.error);
            }
        } catch (e: any) {
            alert('Error fetching report: ' + e.message);
        } finally {
            setReportLoading(false);
        }
    }

    const handleVerifyFace = async (loanId: string, idDocUrl: string, selfieUrl?: string) => {
        if (!idDocUrl || !selfieUrl) {
            alert("Missing ID or Selfie for this application.");
            return;
        }

        const confirmVerify = window.confirm("Run AWS Face Verification for this applicant? This incurs a cost.");
        if (!confirmVerify) return;

        try {
            // 1. Robust Path Extraction (Shared Logic)
            const getPath = (fullUrl: string) => {
                if (!fullUrl) return '';
                try {
                    const urlObj = new URL(fullUrl);
                    const pathParts = urlObj.pathname.split('/documents/');
                    if (pathParts.length > 1) return decodeURIComponent(pathParts[1]);
                    return '';
                } catch (e) { return '' }
            }

            const idPath = getPath(idDocUrl);
            const selfiePath = getPath(selfieUrl);

            if (!idPath || !selfiePath) throw new Error("Could not extract file paths.");

            // 2. Generate Signed URLs (Admin Context)
            const { data: idSigned } = await supabase.storage.from('documents').createSignedUrl(idPath, 60);
            const { data: selfieSigned } = await supabase.storage.from('documents').createSignedUrl(selfiePath, 60);

            // 3. Call Verification API
            const response = await fetch('/api/verify-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
                },
                body: JSON.stringify({
                    idUrl: idSigned?.signedUrl || idDocUrl,
                    selfieUrl: selfieSigned?.signedUrl || selfieUrl
                })
            })

            const result = await response.json();

            if (!response.ok) {
                alert(`Verification Failed: ${result.error || result.details || 'Unknown Error'}`);
                return;
            }

            if (result.isMatch) {
                alert(`✅ IDENTITY VERIFIED!\nConfidence: ${result.similarity.toFixed(1)}%`);
                // Optional: Update loan status or store verification result?
            } else {
                alert(`❌ MISMATCH WARNING.\nSimilarity: ${result.similarity?.toFixed(1) || 0}%.\nFaces do not match.`);
            }

        } catch (error: any) {
            console.error('Verification error:', error)
            alert(`Error running verification: ${error.message}`)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <h1 className="text-3xl font-bold tracking-tight mb-8">Admin Portal</h1>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Loan Applications */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Pending Loans</h2>
                        {loans.length === 0 ? (
                            <p className="text-muted-foreground">No pending applications.</p>
                        ) : (
                            loans.map(loan => (
                                <Card key={loan.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex justify-between">
                                            <span>{loan.profiles?.full_name || 'Unknown User'}</span>
                                            <span className="text-primary">N$ {loan.amount}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground mb-4">
                                            <p>ID: {loan.profiles?.national_id}</p>
                                            <p>Duration: {loan.duration_months} Month{loan.duration_months !== 1 ? 's' : ''}</p>
                                            <p className="mt-1">Stated Income: <strong>N$ {loan.application_data?.monthlyIncome || 'N/A'}</strong></p>

                                            {/* Bank Statement Verification Badge */}
                                            {loan.application_data?.verificationData && (
                                                <div className={`text-xs p-2 rounded mt-2 border ${Math.abs((loan.application_data.verificationData.estimatedIncome || 0) - parseFloat(loan.application_data.monthlyIncome || '0')) < 2000
                                                    ? "bg-green-50 border-green-200 text-green-700"
                                                    : "bg-yellow-50 border-yellow-200 text-yellow-700"
                                                    }`}>
                                                    <p className="font-bold flex items-center gap-1">
                                                        {Math.abs((loan.application_data.verificationData.estimatedIncome || 0) - parseFloat(loan.application_data.monthlyIncome || '0')) < 2000
                                                            ? <Check className="w-3 h-3" />
                                                            : <AlertCircle className="w-3 h-3" />
                                                        }
                                                        Statement Analyzed
                                                    </p>
                                                    <p>Parsed: N$ {loan.application_data.verificationData.estimatedIncome}</p>
                                                </div>
                                            )}
                                            {loan.documents && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewDocument(loan.documents?.id_url)}>
                                                            View ID
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleViewDocument(loan.documents?.payslip_url)}>
                                                            View Payslip
                                                        </Button>
                                                        {loan.documents?.selfie_url && (
                                                            <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleViewDocument(loan.documents?.selfie_url)}>
                                                                View Selfie
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Admin Verification Action */}
                                                    {loan.documents?.selfie_url && loan.documents?.id_url && (
                                                        <Button size="sm" variant="secondary" className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 mt-2" onClick={() => handleVerifyFace(loan.id, loan.documents!.id_url, loan.documents?.selfie_url)}>
                                                            🔍 Verify Face Identity
                                                        </Button>
                                                    )}

                                                    {/* Credit Report Button */}
                                                    <Button size="sm" variant="outline" className="w-full mt-2 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => handleCreditCheck(loan.profiles.national_id)}>
                                                        {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "📄 View Full Credit Report"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleLoanAction(loan.id, 'approved')}>
                                                <Check className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" className="w-full" onClick={() => handleLoanAction(loan.id, 'rejected')}>
                                                <X className="mr-2 h-4 w-4" /> Reject
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Verifications */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Pending Verifications</h2>
                        {verifications.length === 0 ? (
                            <p className="text-muted-foreground">No pending verifications.</p>
                        ) : (
                            verifications.map(verif => (
                                <Card key={verif.user_id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">
                                            {verif.profiles?.full_name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground mb-4">
                                            <p>Employer: {verif.employer_name}</p>
                                            <p>Income: N$ {verif.monthly_income}</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Button size="sm" onClick={() => handleVerifyUser(verif.user_id, verif.monthly_income, verif.employment_type || 'Unknown', verif.profiles?.national_id)}>
                                                Verify & View Report
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div >
            </main >

            <Footer />

            {/* Credit Report Modal Overlay */}
            {viewingReport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
                            <div>
                                <CardTitle>Credit Report Analysis</CardTitle>
                                <p className="text-sm text-muted-foreground">ID: {viewingReport.nationalId}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setViewingReport(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">

                            {/* Score & Risk */}
                            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-primary">{viewingReport.score}</div>
                                    <div className="text-sm font-medium text-muted-foreground">Credit Score</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${viewingReport.riskBand === 'Very High' ? 'text-red-600' :
                                        viewingReport.riskBand === 'High' ? 'text-orange-600' :
                                            viewingReport.riskBand === 'Medium' ? 'text-yellow-600' :
                                                'text-green-600'
                                        }`}>
                                        {viewingReport.riskBand} Risk
                                    </div>
                                    <div className="text-sm text-muted-foreground">Risk Assessment</div>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-50 p-3 rounded">
                                    <p className="text-xs text-muted-foreground">Total Debt</p>
                                    <p className="font-semibold">N$ {viewingReport.summary.totalDebt.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded">
                                    <p className="text-xs text-muted-foreground">Active Accounts</p>
                                    <p className="font-semibold">{viewingReport.summary.activeAccounts}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded">
                                    <p className="text-xs text-muted-foreground">Overdue</p>
                                    <p className="font-semibold text-red-500">{viewingReport.summary.overdueAccounts}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded">
                                    <p className="text-xs text-muted-foreground">Enquiries (6m)</p>
                                    <p className="font-semibold">{viewingReport.summary.enquiriesLast6Months}</p>
                                </div>
                            </div>

                            {/* Habits */}
                            <div>
                                <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Financial Habits</h3>
                                <div className="flex flex-wrap gap-2">
                                    {viewingReport.habits.map(habit => (
                                        <span key={habit} className={`px-2 py-1 rounded text-xs font-medium border ${habit.includes('Good') || habit.includes('Consistent') ? 'bg-green-50 border-green-200 text-green-700' :
                                            'bg-yellow-50 border-yellow-200 text-yellow-700'
                                            }`}>
                                            {habit}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* History Table */}
                            <div>
                                <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">External Loan History</h3>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="p-2 text-left">Provider</th>
                                                <th className="p-2 text-left">Type</th>
                                                <th className="p-2 text-right">Balance</th>
                                                <th className="p-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingReport.history.map((item, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="p-2">{item.provider}</td>
                                                    <td className="p-2 text-muted-foreground">{item.type}</td>
                                                    <td className="p-2 text-right">N$ {item.balance.toLocaleString()}</td>
                                                    <td className="p-2 text-right">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.status === 'Active' ? 'bg-blue-50 text-blue-700' :
                                                            item.status === 'Paid' ? 'bg-gray-100 text-gray-600' :
                                                                'bg-red-50 text-red-700'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            )}
        </div >
    )
}
