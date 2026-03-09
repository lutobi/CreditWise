"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, AlertCircle, Camera, UserCheck, RefreshCw, Maximize2, ZoomIn, ZoomOut } from "lucide-react"

type VerificationItem = {
    loan_id: string
    user_id: string
    amount: number
    duration_months: number
    status: string
    created_at: string
    full_name: string
    national_id: string
    phone: string // Added
    monthly_income: string | number
    employer_name: string
    employment_type: string
    is_employed: boolean
    confidence: number
    face_verified?: boolean
    verified_at?: string
    reference_id?: string
    status_detail?: string // Added
    retake_reason?: string
    retake_type?: 'selfie' | 'id' | 'bank_statement' // Legacy
    requests?: Record<string, { reason: string, status: string }> // New
    documents: {
        id_url: string
        payslip_url: string
        recent_payslip_url?: string // Added
        selfie_url?: string
        previous_selfie_url?: string // Added for diff view
    } | null
    // HR & Kin
    hr_name?: string
    hr_email?: string
    hr_phone?: string
    hr_verification_requested?: boolean
    hr_verification_requested_at?: string
    kin_name?: string
    kin_relationship?: string
    kin_contact?: string
    kin_address?: string
    ai_analysis?: {
        estimatedIncome: number;
        employerName: string;
        incomeConfidence: number;
        fraudProbability?: number;
        fraudFlags?: string[];
        verificationSource: string;
    } | null;
    risk_flags?: string[];
    inspected?: boolean // Added for UI state
}

type AuditLog = {
    id: string
    action: string
    details: any
    created_at: string
}

export default function VerificationPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [queue, setQueue] = useState<VerificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [viewingHistory, setViewingHistory] = useState<string | null>(null)
    const [borrowerHistory, setBorrowerHistory] = useState<any[]>([]);
    const [viewingBorrower, setViewingBorrower] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null)
    const [checkingFaceId, setCheckingFaceId] = useState<string | null>(null)
    const [verificationResults, setVerificationResults] = useState<Record<string, any>>({})
    const [inspectingItem, setInspectingItem] = useState<VerificationItem | null>(null);
    const [verifyingHRId, setVerifyingHRId] = useState<string | null>(null);

    const handleVerifyEmployment = async (item: VerificationItem) => {
        if (!item.hr_email || item.hr_email === 'N/A') {
            alert('No HR email provided for this application.');
            return;
        }

        if (!confirm(`Send employment verification email to ${item.hr_email}? The applicant will be CC'd.`)) return;

        setVerifyingHRId(item.loan_id);
        try {
            const res = await fetch('/api/admin/verify-employment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ loanId: item.loan_id })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ ${data.message}`);
                fetchQueue(); // Refresh to show updated status
            } else {
                alert('❌ Failed: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Network Error');
        } finally {
            setVerifyingHRId(null);
        }
    };

    const handleRunFaceCheck = async (item: VerificationItem) => {
        // ... (keep existing handleRunFaceCheck logic if possible, but for replace_file_content brevity I am replacing the surrounding block. 
        // Wait, handleRunFaceCheck is long. I should target smaller chunks.)
        if (!item.documents?.id_url || !item.documents?.selfie_url) {
            alert("Error: Missing ID or Selfie documents.")
            return
        }

        if (!confirm(`Run AWS Rekognition analysis for ${item.full_name}?`)) return

        // ... (rest of function)
        setCheckingFaceId(item.loan_id)
        try {
            const res = await fetch('/api/verify-face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idUrl: item.documents.id_url,
                    selfieUrl: item.documents.selfie_url,
                    userId: item.user_id
                })
            })

            const data = await res.json()
            const score = data.similarity?.toFixed(1) || "0"

            setVerificationResults(prev => ({
                ...prev,
                [item.loan_id]: {
                    success: data.success,
                    score: score,
                    isMatch: data.isMatch,
                    msg: data.success
                        ? (data.isMatch ? `✅ Verified (${score}%)` : `⚠️ Low Match (${score}%)`)
                        : `❌ Error: ${data.message || data.error || "Unknown"}`,
                    details: (typeof data.details === 'object' ? JSON.stringify(data.details) : data.details) || "",
                    timestamp: new Date().toLocaleTimeString()
                }
            }))

            if (data.success) {
                // fetchQueue() // Don't refetch whole queue, just update state if needed
            } else {
                console.error("AWS Check Failed:", data)
            }
        } catch (e) {
            console.error(e)
            alert("System Error: Could not connect to verification server.")
        } finally {
            setCheckingFaceId(null)
        }
    }

    // New Function for Local Inspection Pass
    const handlePassInspection = (item: VerificationItem) => {
        setQueue(prev => prev.map(q => q.loan_id === item.loan_id ? { ...q, inspected: true } : q));
        setInspectingItem(null);
    }



    const handleRequestRetake = async (item: VerificationItem, type: 'id' | 'selfie' | 'bank_statement' | 'payslip') => {
        // UI State Sync: Check if request already pending
        if (item.requests?.[type]?.status === 'pending') {
            alert(`A ${type.replace('_', ' ')} retake has already been requested for this applicant.`);
            return;
        }

        const reason = prompt(`Reason for requesting new ${type.toUpperCase()}? (e.g. 'Blurry', 'Glare', 'Cut off')`)
        if (!reason) return

        try {
            const res = await fetch('/api/admin/request-retake', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ loanId: item.loan_id, reason, type })
            })

            const data = await res.json()
            if (data.success) {
                alert(`Request for new ${type.toUpperCase()} sent to ${item.full_name}.`)

                // UI State Sync: Immediately update local state for faster feedback
                setQueue(prev => prev.map(q =>
                    q.loan_id === item.loan_id
                        ? {
                            ...q,
                            requests: {
                                ...q.requests,
                                [type]: { reason, status: 'pending' }
                            }
                        }
                        : q
                ));
                // Also update inspecting item if open
                if (inspectingItem?.loan_id === item.loan_id) {
                    setInspectingItem(prev => prev ? {
                        ...prev,
                        requests: {
                            ...prev.requests,
                            [type]: { reason, status: 'pending' }
                        }
                    } : null);
                }
            } else {
                alert("Error: " + data.error)
            }
        } catch (e) {
            console.error(e)
            alert("Network Error")
        }
    }

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            router.push('/login')
            return
        }

        if (user.id) {
            checkAccess()
            fetchQueue()
        }
    }, [user?.id, authLoading])

    const checkAccess = () => {
        if (!user) return router.push('/login')
        const role = user.app_metadata?.role
        if (role !== 'admin' && role !== 'admin_verifier' && role !== 'super_admin') {
            console.error("Access Denied: You need the Verifier Role.")
            router.push('/')
        }
    }

    const fetchQueue = async () => {
        setLoading(true)
        setError(null)
        try {
            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch('/api/admin/verification-queue', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            })

            const contentType = res.headers.get("content-type")
            if (contentType && contentType.indexOf("application/json") === -1) {
                const text = await res.text()
                if (text.includes('Sign In') || text.includes('Login')) {
                    throw new Error("Session expired. Please refresh to log in again.")
                }
                throw new Error(`API returned unexpected response (Not JSON). Status: ${res.status}`)
            }

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to fetch queue')
            }

            const responseData = await res.json()
            const data = responseData.data || []

            setQueue(data)

            // Hydrate persistent results from DB
            const initialResults: Record<string, any> = {}
            data.forEach((item: any) => {
                if (item.confidence > 0 || item.face_verified !== undefined || item.verified_at) {
                    const isMatch = item.confidence >= 85 && item.face_verified !== false
                    initialResults[item.loan_id] = {
                        success: true, // DB entry exists
                        score: item.confidence.toFixed(1),
                        isMatch: isMatch,
                        msg: isMatch ? `✅ Verified (${item.confidence.toFixed(1)}%)` : `⚠️ Low Match / Failed (${item.confidence.toFixed(1)}%)`,
                        details: "Loaded from previous check",
                        timestamp: item.verified_at ? new Date(item.verified_at).toLocaleString() : ""
                    }
                }
            })
            setVerificationResults(prev => ({ ...prev, ...initialResults }))

        } catch (error: any) {
            console.error("Admin: Fetch Queue Error", error)
            setError(error.message || "Failed to load queue")
        } finally {
            setLoading(false)
        }
    }

    const handleViewDocument = (url?: string) => {
        if (!url) {
            alert("No document URL available.")
            return
        }
        window.open(url, '_blank')
    }

    const handleVerifyUser = async (item: VerificationItem) => {
        if (!confirm(`Confirm identity for ${item.full_name}? This will move them to the Approval Queue.`)) return

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    loanId: item.loan_id,
                    income: item.monthly_income,
                    employmentType: item.employment_type
                })
            })

            const data = await res.json()
            if (data.success) {
                // Show Credit Score if available, otherwise "Verified"
                alert(`User Verified! Score: ${data.data?.score || 'Check Logs'}`)
            } else {
                alert("Verification Result: " + data.error)
            }
            // Always refresh queue to show the persistent result (even if failed)
            fetchQueue()
        } catch (e) {
            alert("Network Error")
        }
    }

    const handleViewHistory = async (loanId: string) => {
        setViewingHistory(loanId)
        setAuditLogs([])
        try {
            const res = await fetch(`/api/admin/audit?loanId=${loanId}`)
            const data = await res.json()
            if (data.success) {
                setAuditLogs(data.data || [])
            } else {
                alert("Failed to load history")
            }
        } catch (e) { console.error(e) }
    }

    const handleViewBorrowerHistory = async (userId: string, fullName: string) => {
        setViewingBorrower(fullName);
        setBorrowerHistory([]); // clear

        try {
            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch(`/api/admin/borrower-history?userId=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            if (res.status === 401) {
                alert("Session stale or unauthorized. Please Log Out and Log In to refresh permissions.");
                return;
            }

            const result = await res.json();

            if (result.success && result.data) {
                setBorrowerHistory(result.data);
            } else {
                console.error("Failed to load history:", result.error);
            }
        } catch (e) {
            console.error("History fetch error:", e);
        }
    }
    const [viewingReport, setViewingReport] = useState<any | null>(null);

    const handleViewReport = async (nationalId: string) => {
        if (!nationalId || nationalId === 'Unknown') {
            alert("National ID missing.");
            return;
        }
        try {
            const res = await fetch('/api/credit-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId })
            });
            const data = await res.json();
            if (data.success) setViewingReport(data.data);
            else alert("Failed to fetch report: " + data.error);
        } catch (e) { alert("Network Error"); }
    }

    const handleRejectApplication = async (item: VerificationItem) => {
        const reason = prompt(`Reject application for ${item.full_name}? Enter reason (e.g. 'Fraud', 'Affordability', 'Document Mismatch'):`);
        if (!reason) return; // User cancelled

        if (!confirm(`Are you sure you want to REJECT this application?\nReason: ${reason}\n\nThis will send a rejection email to the user.`)) return;

        try {
            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch('/api/admin/status-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ loanId: item.loan_id, status: 'rejected', reason })
            });

            if (res.status === 401) {
                alert("Session stale or unauthorized. Please Log Out and Log In to refresh permissions.");
                return;
            }

            const data = await res.json();

            if (data.success) {
                alert("Application Rejected.");
                fetchQueue();
            } else {
                alert("Failed to reject: " + data.error);
            }
        } catch (e) { alert("Network Error"); }
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-blue-900">Verification Queue</h1>
                        <p className="text-slate-600">Review Identity & Employment Documents</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loading} className="gap-2">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        {loading ? (
                            <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse"></div>
                        ) : (
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                {queue.length} Pending
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Error:</span> {error}
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchQueue} className="bg-white border-red-200 hover:bg-red-50 text-red-700">
                            Try Again
                        </Button>
                    </div>
                )}

                <div className="grid gap-6">
                    {loading ? (
                        [1, 2].map((i) => (
                            <Card key={i} className="overflow-hidden border-l-4 border-slate-200 shadow-sm opacity-70">
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-3 h-64">
                                        <div className="bg-slate-800 p-6 animate-pulse"></div>
                                        <div className="p-6 md:col-span-2 space-y-4">
                                            <div className="h-8 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-4 w-full bg-slate-100 rounded"></div>
                                                <div className="h-4 w-full bg-slate-100 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : queue.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <h3 className="text-lg font-medium">All Caught Up!</h3>
                            <p>No pending verifications.</p>
                        </div>
                    ) : (
                        queue.map(item => (
                            <Card key={item.loan_id} className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-3">
                                        {/* 1. Identity Evidence (Left) */}
                                        <div className="bg-slate-900 text-white p-6 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-semibold text-blue-200 mb-4 flex items-center gap-2">
                                                    <Camera className="w-4 h-4" /> Identity Evidence
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 group cursor-pointer" onClick={() => handleViewDocument(item.documents?.selfie_url)}>
                                                        {item.documents?.selfie_url ? (
                                                            <img
                                                                src={item.documents.selfie_url}
                                                                alt="Selfie"
                                                                className="w-full h-full object-cover"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.border = "2px solid red"
                                                                    e.currentTarget.alt = "Failed to Load Image"
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                                                No Selfie
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span>View Full Size</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className={`w-full gap-2 ${item.inspected ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 border'}`}
                                                        onClick={(e) => { e.stopPropagation(); setInspectingItem(item); }}
                                                    >
                                                        {item.inspected ? <Check className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                        {item.inspected ? 'Inspected' : 'Inspect & Verify'}
                                                    </Button>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:text-white" onClick={() => handleViewDocument(item.documents?.id_url)}>
                                                            View ID Doc
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:text-white" onClick={() => handleViewDocument(item.documents?.payslip_url)}>
                                                            View 3-Month St.
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:text-white col-span-2" onClick={() => handleViewDocument(item.documents?.recent_payslip_url)}>
                                                            View Payslip
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-slate-700">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs text-slate-400 uppercase tracking-wider">AWS Confidence</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRunFaceCheck(item) }}
                                                            disabled={checkingFaceId === item.loan_id}
                                                            className={`text-xs underline ${checkingFaceId === item.loan_id ? 'text-slate-500 cursor-wait' : 'text-blue-400 hover:text-blue-300'}`}
                                                        >
                                                            {checkingFaceId === item.loan_id ? "Analyzing..." : (verificationResults[item.loan_id] || item.confidence > 0 ? "Re-run Check" : "Run Check")}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Logic to determine what to show */}
                                                {(() => {
                                                    const freshResult = verificationResults[item.loan_id];
                                                    // Show if freshwater result OR stored result (check verified_at)
                                                    const showResult = freshResult || (item.confidence > 0) || (item.verified_at);

                                                    if (!showResult) return null;

                                                    const isMatch = freshResult ? freshResult.isMatch : (item.face_verified ?? (item.confidence >= 85));
                                                    const score = freshResult ? freshResult.score : item.confidence.toFixed(1);
                                                    const msg = freshResult
                                                        ? freshResult.msg
                                                        : (isMatch ? `✅ Verified (${score}%)` : `⚠️ Low Match / Failed (${score}%)`);
                                                    const timestamp = freshResult
                                                        ? freshResult.timestamp
                                                        : (item.verified_at ? new Date(item.verified_at).toLocaleString() : "Previously checked");
                                                    const style = isMatch
                                                        ? 'bg-green-900/30 border-green-700 text-green-200'
                                                        : 'bg-red-900/30 border-red-700 text-red-200';

                                                    return (
                                                        <div className={`mt-2 mb-2 p-2 rounded text-xs border ${style}`}>
                                                            <div className="font-bold flex justify-between">
                                                                <span>{msg}</span>
                                                                <span className="text-[10px] opacity-70">{timestamp}</span>
                                                            </div>
                                                            {freshResult?.details && (
                                                                <div className="mt-1 opacity-80 truncate" title={freshResult.details}>
                                                                    {freshResult.details}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${verificationResults[item.loan_id]?.score || item.confidence}%` }}></div>
                                                    </div>
                                                    <span className={`text-sm font-mono ${(verificationResults[item.loan_id]?.score || item.confidence) > 85 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        {(verificationResults[item.loan_id]?.score || item.confidence) > 0 ? `${(verificationResults[item.loan_id]?.score || item.confidence)}%` : 'Not run'}
                                                    </span>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRequestRetake(item, 'selfie') }}
                                                        disabled={item.requests?.['selfie']?.status === 'pending'}
                                                        className={`text-xs border rounded px-2 py-1 ${item.requests?.['selfie']?.status === 'pending' ? 'text-slate-500 border-slate-700 cursor-not-allowed' : 'text-red-400 hover:text-red-300 border-slate-600'}`}
                                                    >
                                                        {item.requests?.['selfie']?.status === 'pending' ? 'Selfie Pending' : 'Request New Selfie'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRequestRetake(item, 'id') }}
                                                        disabled={item.requests?.['id']?.status === 'pending'}
                                                        className={`text-xs border rounded px-2 py-1 ${item.requests?.['id']?.status === 'pending' ? 'text-slate-500 border-slate-700 cursor-not-allowed' : 'text-red-400 hover:text-red-300 border-slate-600'}`}
                                                    >
                                                        {item.requests?.['id']?.status === 'pending' ? 'ID Pending' : 'Request New ID'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRequestRetake(item, 'bank_statement') }}
                                                        disabled={item.requests?.['bank_statement']?.status === 'pending'}
                                                        className={`col-span-2 text-xs border rounded px-2 py-1 ${item.requests?.['bank_statement']?.status === 'pending' ? 'text-slate-500 border-slate-700 cursor-not-allowed' : 'text-amber-400 hover:text-amber-300 border-slate-600'}`}
                                                    >
                                                        {item.requests?.['bank_statement']?.status === 'pending' ? 'Statement Pending' : 'Request New Bank Statement'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRequestRetake(item, 'payslip') }}
                                                        disabled={item.requests?.['payslip']?.status === 'pending'}
                                                        className={`col-span-2 text-xs border rounded px-2 py-1 ${item.requests?.['payslip']?.status === 'pending' ? 'text-slate-500 border-slate-700 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300 border-slate-600'}`}
                                                    >
                                                        {item.requests?.['payslip']?.status === 'pending' ? 'Payslip Pending' : 'Request New Payslip'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Applicant Details (Middle) */}
                                        <div className="p-6 md:col-span-2 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-xl font-bold text-slate-900">{item.full_name}</h2>
                                                        {item.status_detail === 'retake_requested' && (
                                                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-amber-200">
                                                                Retake Requested
                                                            </span>
                                                        )}
                                                        {item.status_detail === 'resubmitted' && (
                                                            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-blue-200 animate-pulse">
                                                                New {item.retake_type === 'id' ? 'ID' : 'Selfie'} Uploaded
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-mono flex gap-2 items-center">
                                                        <span>ID: {item.national_id}</span>
                                                        <span className="text-slate-300">|</span>
                                                        <a href={`tel:${item.phone}`} className="hover:text-blue-600 flex items-center gap-1">
                                                            📞 {item.phone}
                                                        </a>
                                                        {item.reference_id && (
                                                            <span className="bg-slate-200 px-1 rounded text-xs py-0.5 flex items-center">
                                                                {item.reference_id}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Risk Flags */}
                                                    {item.risk_flags && item.risk_flags.length > 0 && (
                                                        <div className="mt-2 flex flex-col gap-1">
                                                            {item.risk_flags.map((flag, idx) => (
                                                                <span key={idx} className="bg-red-100 text-red-800 text-[10px] px-2 py-1 rounded border border-red-200 font-medium">
                                                                    ⚠️ {flag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                </div>
                                                <div className="flex flex-col gap-2 mt-4 text-right">
                                                    <Button variant="link" className="h-auto p-0 text-purple-600 justify-end" onClick={() => handleViewReport(item.national_id)}>
                                                        View Credit Report
                                                    </Button>
                                                    <Button variant="link" className="h-auto p-0 text-blue-600 justify-end font-semibold" onClick={() => handleViewBorrowerHistory(item.user_id, item.full_name)}>
                                                        View Borrower History
                                                    </Button>
                                                    <Button variant="link" className="h-auto p-0 text-slate-500 justify-end" onClick={() => handleViewHistory(item.loan_id)}>
                                                        View Audit History
                                                    </Button>

                                                    <div className="font-semibold text-slate-900 mt-2">N$ {item.amount}</div>
                                                    <div className="text-xs text-slate-500">Loan Request</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Employment Status</p>
                                                    <p className="font-medium">{item.employment_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Employer</p>
                                                    <p className="font-medium">{item.employer_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Stated Income</p>
                                                    <p className="font-medium">N$ {item.monthly_income}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Docs Submitted</p>
                                                    <div className="flex gap-1 mt-1">
                                                        {item.documents?.id_url && item.requests?.['id']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="ID: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="ID: Missing / Update Requested" />}
                                                        {item.documents?.selfie_url && item.requests?.['selfie']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="Selfie: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Selfie: Missing / Update Requested" />}
                                                        {item.documents?.payslip_url && item.requests?.['bank_statement']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="Statement: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Statement: Missing / Update Requested" />}
                                                        {item.documents?.payslip_url && item.requests?.['payslip']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="Payslip: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Payslip: Missing / Update Requested" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Audit Panel */}
                                            {item.ai_analysis && (
                                                <div className="mb-8 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">AI Insight</span>
                                                        Bank Statement Audit
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs text-blue-600/70 uppercase">Estimated Income</p>
                                                            <p className="font-medium text-blue-900">
                                                                N$ {item.ai_analysis.estimatedIncome?.toLocaleString() || '0'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-blue-600/70 uppercase">Identified Employer</p>
                                                            <p className="font-medium text-blue-900 truncate" title={item.ai_analysis.employerName}>
                                                                {item.ai_analysis.employerName || 'None'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-blue-600/70 uppercase">AI Confidence</p>
                                                            <p className="font-medium text-blue-900 border-b-2 inline-block border-blue-200">
                                                                {((item.ai_analysis.incomeConfidence || 0) * 100).toFixed(0)}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* FORENSIC FRAUD ALERT */}
                                                    {item.ai_analysis.fraudProbability && item.ai_analysis.fraudProbability > 0.3 && (
                                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                                <h5 className="text-xs font-bold text-red-700 uppercase">Forensic Fraud Warning: {((item.ai_analysis.fraudProbability || 0) * 100).toFixed(0)}% Probability</h5>
                                                            </div>
                                                            {item.ai_analysis.fraudFlags && item.ai_analysis.fraudFlags.length > 0 ? (
                                                                <ul className="list-disc pl-5 text-xs text-red-800 space-y-1">
                                                                    {item.ai_analysis.fraudFlags.map((flag, i) => (
                                                                        <li key={i}>{flag}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-red-800">The AI detected mathematical anomalies or formatting artifacts suggesting this document was digitally altered.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* HR & Next of Kin Details */}
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 pt-4 border-t border-slate-100">
                                                <div className="col-span-2">
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Employment Contact (HR)</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase">HR Name</p>
                                                            <p className="font-medium">{item.hr_name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase">Contact</p>
                                                            <div className="flex flex-col">
                                                                {item.hr_phone && <a href={`tel:${item.hr_phone}`} className="text-blue-600 hover:underline text-xs">{item.hr_phone}</a>}
                                                                {item.hr_email && <a href={`mailto:${item.hr_email}`} className="text-blue-600 hover:underline text-xs">{item.hr_email}</a>}
                                                                {!item.hr_phone && !item.hr_email && <span className="text-slate-400">N/A</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleVerifyEmployment(item)}
                                                    disabled={verifyingHRId === item.loan_id || !item.hr_email || item.hr_email === 'N/A'}
                                                    className={`mt-3 text-xs border rounded px-3 py-1.5 flex items-center gap-1 ${!item.hr_email || item.hr_email === 'N/A'
                                                        ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                                                        : item.hr_verification_requested
                                                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                                            : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {verifyingHRId === item.loan_id
                                                        ? 'Sending...'
                                                        : item.hr_verification_requested
                                                            ? '🔄 Re-send Verification to HR'
                                                            : '📧 Verify Employment via HR'}
                                                </button>
                                                {item.hr_verification_requested && (
                                                    <p className="text-xs text-green-600 mt-1">✓ Verification email sent</p>
                                                )}
                                                <div className="col-span-2 mt-2">
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Next of Kin</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase">Name & Relation</p>
                                                            <p className="font-medium">{item.kin_name || 'N/A'} <span className="text-slate-500 font-normal">({item.kin_relationship || 'N/A'})</span></p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase">Contact</p>
                                                            <p className="font-medium">{item.kin_contact ? <a href={`tel:${item.kin_contact}`} className="text-blue-600 hover:underline">{item.kin_contact}</a> : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Diff View for Resubmitted Selfies - ONLY if a previous one exists */}
                                            {item.status_detail === 'resubmitted' && item.retake_type === 'selfie' && item.documents?.previous_selfie_url && (
                                                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                                    <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 text-blue-500" />
                                                        Compare Updates: Old vs New
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Left: Old (Rejected) */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                                    PREVIOUS
                                                                </span>
                                                            </div>
                                                            <div className="border-2 border-red-100 rounded-md overflow-hidden opacity-70 grayscale hover:grayscale-0 transition-all cursor-pointer bg-white">
                                                                <a href={item.documents.previous_selfie_url} target="_blank" rel="noopener noreferrer">
                                                                    <img
                                                                        src={item.documents.previous_selfie_url}
                                                                        alt="Previous Rejected Selfie"
                                                                        className="w-full h-32 object-cover"
                                                                    />
                                                                </a>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 italic truncate" title={item.retake_reason}>
                                                                Reason: {item.retake_reason}
                                                            </p>
                                                        </div>

                                                        {/* Right: New (Pending) */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 animate-pulse">
                                                                    NEW
                                                                </span>
                                                            </div>
                                                            <div className="border-2 border-green-500 rounded-md overflow-hidden shadow-md cursor-pointer bg-white">
                                                                <a href={item.documents.selfie_url} target="_blank" rel="noopener noreferrer">
                                                                    <img
                                                                        src={item.documents.selfie_url}
                                                                        alt="New Selfie Response"
                                                                        className="w-full h-32 object-cover"
                                                                    />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-auto flex justify-end gap-3 items-center">
                                                <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => handleViewHistory(item.loan_id)}>
                                                    View History
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectApplication(item)}>
                                                    Reject Application
                                                </Button>
                                                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleVerifyUser(item)}>
                                                    <UserCheck className="w-4 h-4 mr-2" />
                                                    Confirm Identity
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </main >
            <Footer />

            {/* Borrower History Modal */}
            {viewingBorrower && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center bg-slate-50 border-b py-4">
                            <div>
                                <CardTitle>Loan History: {viewingBorrower}</CardTitle>
                                <p className="text-sm text-slate-500">Past performance and repayment records</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setViewingBorrower(null)}><X className="w-5 h-5" /></Button>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Ref ID</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Repaid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {borrowerHistory.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No history found.</td></tr>
                                    ) : (
                                        borrowerHistory.map((loan) => (
                                            <tr key={loan.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-600">{new Date(loan.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-mono text-xs">{loan.application_data?.refId || loan.id.slice(0, 8)}</td>
                                                <td className="px-4 py-3 text-right font-medium">N$ {loan.amount}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>{loan.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const totalRepayable = loan.amount * 1.25;
                                                        const isRepaid = loan.status === 'completed' ||
                                                            loan.status === 'paid' ||
                                                            (loan.amount_paid >= totalRepayable - 0.1);

                                                        return (
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isRepaid ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-50 text-yellow-600'
                                                                }`}>
                                                                {isRepaid ? 'YES' : 'NO'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}
            {
                viewingReport && (
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
                                        <h4 className="font-semibold mb-2">Account History</h4>
                                        {viewingReport.history.map((h: any, i: number) => (
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
                )
            }

            {/* Audit History Modal (Improved) */}
            {
                viewingHistory && (
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
                )
            }
            {/* Manual Inspection Modal */}
            {
                inspectingItem && (
                    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col animate-in fade-in duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white border-b border-slate-700">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <UserCheck className="w-6 h-6 text-blue-400" />
                                    {inspectingItem.full_name}
                                </h2>
                                <p className="text-sm text-slate-400 font-mono mt-1">
                                    ID: {inspectingItem.national_id} &bull; Loan: {inspectingItem.loan_id.slice(0, 8)}...
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                    <Button
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2"
                                        onClick={() => handleRequestRetake(inspectingItem, 'id')}
                                    >
                                        Bad ID
                                    </Button>
                                    <div className="w-px bg-slate-700 mx-1"></div>
                                    <Button
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2"
                                        onClick={() => handleRequestRetake(inspectingItem, 'selfie')}
                                    >
                                        Bad Selfie
                                    </Button>
                                </div>
                                <Button
                                    className="bg-green-600 hover:bg-green-500 gap-2 px-6"
                                    onClick={() => {
                                        handlePassInspection(inspectingItem);
                                    }}
                                >
                                    <Check className="w-4 h-4" /> Pass Inspection
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-slate-400 hover:text-white"
                                    onClick={() => setInspectingItem(null)}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </div>

                        {/* Split View Content */}
                        <div className="flex-1 grid grid-cols-2 gap-px bg-slate-800 overflow-hidden">
                            {/* Left: ID Document */}
                            <div className="relative bg-black flex flex-col group">
                                <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md border border-white/10 font-medium">
                                    🆔 ID Document
                                </div>
                                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                                    {inspectingItem.documents?.id_url ? (
                                        <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                                            <img
                                                src={inspectingItem.documents.id_url}
                                                className="max-w-none max-h-full object-contain transition-transform duration-200 cursor-zoom-in active:scale-[2.5] active:cursor-move"
                                                alt="ID Document"
                                                title="Click and hold to Zoom"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center">
                                            <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                                            <span>No ID Document</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Live Selfie */}
                            <div className="relative bg-black flex flex-col">
                                <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md border border-white/10 font-medium">
                                    🤳 Live Selfie
                                </div>
                                {/* Hint for Zoom */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/50 text-[10px] pointer-events-none">
                                    Click &amp; Hold to Zoom
                                </div>
                                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                                    {inspectingItem.documents?.selfie_url ? (
                                        <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                                            <img
                                                src={inspectingItem.documents.selfie_url}
                                                className="max-w-none max-h-full object-contain transition-transform duration-200 cursor-zoom-in active:scale-[2.5] active:cursor-move"
                                                alt="Selfie"
                                                title="Click and hold to Zoom"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center">
                                            <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                                            <span>No Selfie</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
