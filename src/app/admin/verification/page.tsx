"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, AlertCircle, Camera, UserCheck, RefreshCw } from "lucide-react"

type VerificationItem = {
    loan_id: string
    user_id: string
    amount: number
    duration_months: number
    status: string
    created_at: string
    full_name: string
    national_id: string
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
        selfie_url?: string
        previous_selfie_url?: string // Added for diff view
    } | null
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

    const [error, setError] = useState<string | null>(null)
    const [checkingFaceId, setCheckingFaceId] = useState<string | null>(null)
    const [verificationResults, setVerificationResults] = useState<Record<string, any>>({})

    const handleRunFaceCheck = async (item: VerificationItem) => {
        if (!item.documents?.id_url || !item.documents?.selfie_url) {
            alert("Error: Missing ID or Selfie documents.")
            return
        }

        if (!confirm(`Run AWS Rekognition analysis for ${item.full_name}?`)) return

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
                    details: data.details || "",
                    timestamp: new Date().toLocaleTimeString()
                }
            }))

            if (data.success) {
                fetchQueue()
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

    const handleRequestRetake = async (item: VerificationItem, type: 'id' | 'selfie' | 'bank_statement') => {
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
                fetchQueue()
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
            const res = await fetch('/api/admin/verification-queue')

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
                alert(`User Verified! Score: ${data.similarity?.toFixed(1) || 'N/A'}%`)
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

    const handleClearItem = async (loanId: string) => {
        if (!confirm("Force remove this item from the queue? Only do this if it is a stale test record.")) return;
        try {
            await fetch('/api/admin/status-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loanId, status: 'rejected', reason: 'Admin Manual Clear' })
            });
            fetchQueue();
        } catch (e) { alert("Failed to clear"); }
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
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:text-white" onClick={() => handleViewDocument(item.documents?.id_url)}>
                                                            View ID Doc
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:text-white" onClick={() => handleViewDocument(item.documents?.payslip_url)}>
                                                            View Bank St.
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
                                                    <div className="text-sm text-slate-500 font-mono flex gap-2">
                                                        <span>ID: {item.national_id}</span>
                                                        {item.reference_id && (
                                                            <span className="bg-slate-200 px-1 rounded text-xs py-0.5 flex items-center">
                                                                {item.reference_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 mt-4 text-right">
                                                    <Button variant="link" className="h-auto p-0 text-purple-600 justify-end" onClick={() => handleViewReport(item.national_id)}>
                                                        View Credit Report
                                                    </Button>
                                                    <Button variant="link" className="h-auto p-0 text-slate-500 justify-end" onClick={() => handleViewHistory(item.loan_id)}>
                                                        View Audit History
                                                    </Button>
                                                    {process.env.NODE_ENV === 'development' && (
                                                        <Button variant="link" className="h-auto p-0 text-red-400 text-xs justify-end" onClick={() => handleClearItem(item.loan_id)}>
                                                            [Dev] Force Clear
                                                        </Button>
                                                    )}
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
                                                        {item.documents?.payslip_url && item.requests?.['bank_statement']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="Statement: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Statement: Missing / Update Requested" />}
                                                        {item.documents?.selfie_url && item.requests?.['selfie']?.status !== 'pending' ? <div className="w-2 h-2 rounded-full bg-green-500" title="Selfie: Received" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Selfie: Missing / Update Requested" />}
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
        </div>
    )
}
