"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BadgeCheck, Briefcase, CreditCard, TrendingUp, AlertCircle, Loader2, Camera, FileText, Upload } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

import { LiveSelfie } from "@/components/ui/live-selfie"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type VerificationData = {
    is_employed: boolean
    employer_name: string | null
    monthly_income: number | null
    credit_score: number | null
}

type LoanData = {
    id: string
    amount: number
    status: string
    created_at: string
    duration_months: number
    rejection_reason?: string
    application_data?: any // Added for retake details
    documents?: any
    // Repayment fields
    total_repayment?: number
    amount_paid?: number
    payment_status?: 'unpaid' | 'partial' | 'paid'
}

export default function DashboardPage() {
    const { user, session, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState<LoanData[]>([])
    const [verification, setVerification] = useState<VerificationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showPayModal, setShowPayModal] = useState(false)
    const [retakeFile, setRetakeFile] = useState<File | null>(null)
    const [isRetakeUploading, setIsRetakeUploading] = useState(false)
    const [showReupload, setShowReupload] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/dashboard')
        } else if (user) {
            fetchLoans()
            fetchVerification()
        }
    }, [user, authLoading, router])

    const fetchLoans = async () => {
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })

            if (data) {
                // Calculate repayment amounts for each loan
                const INTEREST_RATE = 0.25; // 25% interest
                const loansWithRepayment = data.map(loan => {
                    const totalRepayment = loan.amount * (1 + INTEREST_RATE * loan.duration_months);
                    const amountPaid = loan.amount_paid || 0;
                    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
                    if (amountPaid >= totalRepayment) {
                        paymentStatus = 'paid';
                    } else if (amountPaid > 0) {
                        paymentStatus = 'partial';
                    }
                    return {
                        ...loan,
                        total_repayment: totalRepayment,
                        amount_paid: amountPaid,
                        payment_status: paymentStatus
                    };
                });
                setLoans(loansWithRepayment);
            }
        } catch (error) {
            console.error('Error fetching loans:', error)
        } finally {
            setLoading(false)
        }
    }
    const fetchVerification = async () => {
        try {
            const { data, error } = await supabase
                .from('verifications')
                .select('*')
                .eq('user_id', user!.id)
                .single()

            if (data) setVerification(data)
        } catch (error) {
            console.error('Error fetching verification:', error)
        }
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

            if (!res.ok) throw new Error("Failed to generate contract");

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

    const handleRetakeSubmit = async () => {
        if (!retakeFile || !activeLoan) return;
        setIsRetakeUploading(true);

        try {
            // 1. Upload File
            const fileExt = retakeFile.name.split('.').pop();
            const fileName = `${activeLoan.id}/retake_selfie_${Date.now()}.${fileExt}`;
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('documents')
                .upload(fileName, retakeFile, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL (or just path if using signed urls, usually we store path or public url)
            // Assuming we store relative path or public url. Let's check other logic. 
            // Usually we store the path and sign it later, OR public url.
            // Let's assume path for consistency with apply page logic (or verify later).
            // Actually, apply/page.tsx usually does:
            // const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
            // Let's use the path for now, consistent with assumption. Or better, get result.

            // Wait, looking at Verification Page, it generates signed URL from the stored path.
            // So storing the path `fileName` is likely correct/sufficient if we store `documents` object.

            const newDocs = {
                ...activeLoan.documents,
                selfie_url: fileName
            };

            // 3. Update Loan via Secure API
            // Determine type: specific selection OR fallback to single pending OR default to selfie
            const submissionType = activeActionType || (pendingRequests.length > 0 ? pendingRequests[0].type : 'selfie');

            const response = await fetch('/api/user/submit-retake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loan_id: activeLoan.id,
                    file_path: fileName,
                    user_id: user?.id,
                    type: submissionType
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to submit retake');
            }

            alert("Submission received! Updating your dashboard...");
            setRetakeFile(null);

            // Graceful State Update
            setActiveActionType(null); // Return to list view
            setShowReupload(false);

            // Force re-fetch and wait for it
            await fetchLoans();

        } catch (error: any) {
            console.error("Retake Upload Error:", error);
            alert("Upload failed: " + error.message);
        } finally {
            setIsRetakeUploading(false);
        }
    };

    // Active loan is the most recent non-completed and non-paid loan
    // If all loans are completed or paid, show "Apply Now" to allow re-application
    const activeLoan = loans.find(l => l.status !== 'completed' && l.payment_status !== 'paid');
    const hasCompletedLoan = loans.some(l => l.payment_status === 'paid' || l.status === 'completed');
    const canApplyAgain = !activeLoan && hasCompletedLoan;

    // Effect to generate signed URL for preview when retake is submitted
    useEffect(() => {
        const getSignedUrl = async () => {
            // Only fetch if we have a document URL and we are in "resubmitted" state (or just generally if user wants to see it)
            // Prioritize selfie for retake flow
            const docPath = activeLoan?.documents?.selfie_url;
            if (!docPath) return;

            // If it's a full URL already (e.g. from some other source), use it, otherwise sign it
            if (docPath.startsWith('http')) {
                setPreviewUrl(docPath);
                return;
            }

            try {
                const { data } = await supabase.storage.from('documents').createSignedUrl(docPath, 3600);
                if (data?.signedUrl) setPreviewUrl(data.signedUrl);
            } catch (e) {
                console.error("Error signing URL:", e);
            }
        }

        if (activeLoan) getSignedUrl();
    }, [activeLoan?.documents?.selfie_url, activeLoan?.id]);

    const requests = activeLoan?.application_data?.requests || {};
    const pendingRequests = Object.entries(requests)
        .filter(([_, val]: any) => val.status === 'pending')
        .map(([key, val]: any) => ({ type: key, ...val }));

    // Fallback for legacy single request
    if (pendingRequests.length === 0 && activeLoan?.application_data?.status_detail === 'retake_requested') {
        pendingRequests.push({
            type: activeLoan.application_data.retakeType || 'selfie',
            reason: activeLoan.application_data.retakeReason || 'Update required'
        });
    }

    const isRetakeRequested = pendingRequests.length > 0;
    const isRetakeSubmitted = activeLoan?.application_data?.status_detail === 'resubmitted';

    // Track which item user is fixing
    const [activeActionType, setActiveActionType] = useState<string | null>(null);

    // Auto-select if single item, otherwise wait for user
    useEffect(() => {
        if (pendingRequests.length === 1 && !activeActionType) {
            setActiveActionType(pendingRequests[0].type);
        }
    }, [pendingRequests.length]); // specific dep to avoid loop

    const handleLiveCapture = (file: File | null) => {
        setRetakeFile(file);
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }


    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* Stats Cards (Unchanged ideally, simplified here for brevity if needed, but keeping original content) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(loans.filter(l => ['approved', 'disbursed', 'completed'].includes(l.status) || l.payment_status === 'paid').reduce((acc, loan) => acc + loan.amount, 0))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loans.filter(l => l.status === 'approved' && l.payment_status !== 'paid').length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {verification?.credit_score ? verification.credit_score : '--'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {verification?.credit_score
                                    ? (verification.credit_score > 700 ? 'Excellent' : verification.credit_score > 600 ? 'Good' : 'Fair')
                                    : 'Pending Verification'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Repayment Status</CardTitle>
                            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {loans.some(l => l.status === 'approved' && l.payment_status !== 'paid') ? 'Active' : 'No Active Loans'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Retake Success Banner */}
                {/* Verification Snapshot (Collapsible State) */}
                {isRetakeSubmitted && !showReupload && (
                    <VerificationStatusSnapshot previewUrl={previewUrl} onRetake={() => setShowReupload(true)} />
                )}

                {/* Retake Banner */}
                {(isRetakeRequested || showReupload) && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-amber-900">
                                    {isRetakeSubmitted ? 'Update Your Submission' : `Action Required${pendingRequests.length > 1 ? ` (${pendingRequests.length} Items)` : ''}`}
                                </h3>

                                {/* Multi-Item Checklist */}
                                {!isRetakeSubmitted && pendingRequests.length > 1 && !activeActionType && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm text-amber-800 mb-2">Please update the following documents:</p>
                                        {pendingRequests.map((req: any) => (
                                            <div key={req.type} className="flex items-center justify-between bg-white p-3 rounded border border-amber-100 shadow-sm">
                                                <div>
                                                    <span className="font-semibold text-sm block capitalize text-slate-900">{req.type === 'id' ? 'ID Document' : req.type === 'bank_statement' ? 'Bank Statement' : 'Selfie'}</span>
                                                    <span className="text-xs text-amber-700">Reason: "{req.reason}"</span>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => setActiveActionType(req.type)} className="text-amber-700 border-amber-200 hover:bg-amber-50 h-8">
                                                    Update
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Single Item / Selected Item / Header Text */}
                                {(!isRetakeSubmitted && pendingRequests.length === 1) && (
                                    <p className="text-amber-800 mt-1">
                                        Admin Reason: <span className="font-medium">"{pendingRequests[0].reason}"</span>
                                    </p>
                                )}
                                {isRetakeSubmitted && (
                                    <p className="text-amber-800 mt-1">
                                        You can upload a different photo if you're not satisfied with the one you just sent.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Upload UI - Only show if activeActionType is selected OR implied (single item) OR re-upload mode */}
                        {((activeActionType || pendingRequests.length === 1 || showReupload) && !isRetakeSubmitted) && (
                            <div className="bg-white p-6 rounded-lg border border-amber-100 shadow-sm transition-all duration-300">

                                {/* Header (Back Button) for Multi-step */}
                                {pendingRequests.length > 1 && activeActionType && (
                                    <div className="mb-4 flex items-center justify-between border-b pb-2">
                                        <span className="text-sm font-medium text-slate-500">Updating: <span className="text-slate-900 font-bold capitalize">{activeActionType === 'id' ? 'ID Document' : activeActionType === 'bank_statement' ? 'Bank Statement' : 'Selfie'}</span></span>
                                        <Button variant="ghost" size="sm" onClick={() => setActiveActionType(null)} className="h-8 text-xs text-slate-500 hover:text-slate-900">
                                            ← Back to List
                                        </Button>
                                    </div>
                                )}

                                {/* Content Switcher based on Type */}
                                {(activeActionType === 'selfie' || (!activeActionType && pendingRequests[0]?.type === 'selfie') || (showReupload && pendingRequests.length === 0)) ? (
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-amber-800 text-center font-medium">
                                                Active Liveness Check Required
                                            </p>
                                            <p className="text-xs text-amber-700 text-center mt-1">
                                                Please take a live selfie to verify your identity. Uploads are not permitted for security.
                                            </p>
                                        </div>

                                        <LiveSelfie onCapture={handleLiveCapture} />

                                        {retakeFile && (
                                            <div className="flex justify-center mt-4">
                                                <Button
                                                    onClick={() => handleRetakeSubmit()}
                                                    disabled={isRetakeUploading}
                                                    className="bg-amber-600 hover:bg-amber-700 w-full max-w-sm"
                                                >
                                                    {isRetakeUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                    Submit This Selfie
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (

                                    // ID or Bank Statement Upload
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                                            <FileText className="w-8 h-8 text-slate-400 mb-4" />
                                            <label className="block text-sm font-medium mb-2">
                                                {activeActionType === 'bank_statement' ? 'Upload Bank Statement' : 'Upload your ID Document'}
                                            </label>
                                            <p className="text-xs text-slate-500 mb-4">
                                                {activeActionType === 'bank_statement' ? 'Recent 3 months statement (PDF preferred).' : "Passport, National ID, or Driver's License."}
                                            </p>

                                            <input
                                                type="file"
                                                accept={activeActionType === 'bank_statement' ? ".pdf,image/*" : "image/*,.pdf"}
                                                id="doc-upload"
                                                className="hidden"
                                                onChange={(e) => setRetakeFile(e.target.files?.[0] || null)}
                                            />
                                            <label htmlFor="doc-upload" className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                                Select Document
                                            </label>

                                            {retakeFile && (
                                                <div className="mt-4 w-full max-w-xs">
                                                    <div className="flex items-center gap-2 p-2 bg-slate-50 border rounded text-sm mb-4">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                        <span className="truncate flex-1">{retakeFile.name}</span>
                                                    </div>
                                                    <Button
                                                        onClick={() => {
                                                            handleRetakeSubmit();
                                                        }}
                                                        disabled={isRetakeUploading}
                                                        className="w-full bg-amber-600 hover:bg-amber-700"
                                                    >
                                                        {isRetakeUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                        {activeActionType === 'bank_statement' ? 'Upload Statement' : 'Upload ID'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                )}

                {/* Active Loan Section */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{activeLoan?.status === 'approved' ? 'Active Loan' : 'Application Status'}</CardTitle>
                        <CardDescription>
                            {activeLoan?.status === 'approved'
                                ? 'Manage your current repayment'
                                : 'Track your recent application'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeLoan ? (
                            <div className="space-y-6">
                                {/* Application Tracker */}
                                <div className="relative">
                                    <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2 bg-background px-2">
                                            <div className={`w-3 h-3 rounded-full ${['pending', 'under_review', 'approved', 'rejected'].includes(activeLoan.status) ? 'bg-primary' : 'bg-muted'}`} />
                                            <span className={['pending', 'under_review', 'approved', 'rejected'].includes(activeLoan.status) ? 'text-primary' : ''}>Received</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 bg-background px-2">
                                            <div className={`w-3 h-3 rounded-full ${['under_review', 'approved', 'rejected'].includes(activeLoan.status) ? 'bg-primary' : 'bg-muted'}`} />
                                            <span className={['under_review', 'approved', 'rejected'].includes(activeLoan.status) ? 'text-primary' : ''}>Under Review</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 bg-background px-2">
                                            <div className={`w-3 h-3 rounded-full ${['approved', 'rejected'].includes(activeLoan.status) ? 'bg-primary' : 'bg-muted'}`} />
                                            <span className={['approved', 'rejected'].includes(activeLoan.status) ? 'text-primary' : ''}>Decision</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold">{formatCurrency(activeLoan.amount)}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${activeLoan.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                        activeLoan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            activeLoan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {activeLoan.payment_status === 'paid' ? '✓ Completed' : activeLoan.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Repayment Info - Only show for approved loans */}
                                {activeLoan.status === 'approved' && (
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Total Repayment</p>
                                            <p className="text-lg font-bold text-purple-700">{formatCurrency(activeLoan.total_repayment || 0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Amount Paid</p>
                                            <p className="text-lg font-bold text-green-600">{formatCurrency(activeLoan.amount_paid || 0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Repayment Status</p>
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${activeLoan.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                activeLoan.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {activeLoan.payment_status === 'paid' ? '✓ Fully Paid' : activeLoan.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Rejection Reason Box */}
                                {activeLoan.status === 'rejected' && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
                                        <p className="font-semibold mb-1">Application Declined</p>
                                        <p>{activeLoan.rejection_reason || "Unfortunately, your application did not meet our current lending criteria. You may apply again in 30 days."}</p>
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    Applied on {new Date(activeLoan.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>

                                <div className="flex gap-2">
                                    {activeLoan.status === 'pending' && !isRetakeRequested && (
                                        <Button variant="outline" className="flex-1" onClick={() => router.push('/apply')}>
                                            Edit Application
                                        </Button>
                                    )}

                                    {/* Retake Action (Redirect Removed, Handled Inline Above) */}
                                    {/* Link to Edit full application is still useful though */}

                                    {/* Show Pay Now only if not fully paid */}
                                    {activeLoan.payment_status !== 'paid' && (
                                        <Button className="flex-1" onClick={() => {
                                            if (activeLoan.status === 'approved') {
                                                setShowPayModal(true)
                                            } else if (isRetakeRequested) {
                                                // Scroll to top or highlight retake box
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            } else {
                                                router.push(`/loans/${activeLoan.id}`)
                                            }
                                        }}>
                                            {activeLoan.status === 'approved' ? 'Pay Now' : (isRetakeRequested ? 'Upload Document' : 'View Details')}
                                        </Button>
                                    )}
                                </div>

                                {activeLoan.status === 'approved' && activeLoan.payment_status !== 'paid' && (
                                    <Button variant="outline" className="w-full mt-2" onClick={() => handleDownloadContract(activeLoan.id)}>
                                        <FileText className="w-4 h-4 mr-2" /> Download Loan Agreement
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {canApplyAgain ? (
                                    <>
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                                            <div className="text-2xl font-bold text-green-700 mb-1">🎉 Congratulations!</div>
                                            <p className="text-sm text-green-600">
                                                You have successfully repaid your previous loan. You are now eligible to apply for a new loan.
                                            </p>
                                        </div>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push('/apply')}>
                                            Apply for New Loan
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold text-muted-foreground">No Active Loans</div>
                                        <p className="text-xs text-muted-foreground">
                                            You are eligible for a loan up to {formatCurrency(50000)}.
                                        </p>
                                        <Button className="w-full" onClick={() => router.push('/apply')}>Apply Now</Button>
                                    </>
                                )}
                            </div>
                        )
                        }
                    </CardContent>
                </Card>

                {/* Loan History Section */}
                {
                    loans.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl font-semibold mb-4">Loan History</h2>
                            <div className="space-y-4">

                                {loans.filter(l => l.id !== activeLoan?.id).map((loan) => (
                                    <Card key={loan.id} className="border-none shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold">{formatCurrency(loan.amount)}</span>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-bold text-muted-foreground">Loan Term:</span>
                                                        <span>{loan.duration_months} Month{loan.duration_months !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(loan.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${loan.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {loan.payment_status === 'paid' ? '✓ Completed' : loan.status.replace('_', ' ')}
                                                    </span>
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/loans/${loan.id}`)}>
                                                        View
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Repayment Info Row */}
                                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Repayment</p>
                                                    <p className="font-semibold text-purple-700">{formatCurrency(loan.total_repayment || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                                                    <p className="font-semibold text-green-600">{formatCurrency(loan.amount_paid || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Repayment Status</p>
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${loan.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        loan.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {loan.payment_status === 'paid' ? '✓ Fully Paid' : loan.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Payment Modal */}
                {
                    showPayModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <Card className="w-full max-w-md">
                                <CardHeader>
                                    <CardTitle className="text-xl">Repayment Instructions</CardTitle>
                                    <CardDescription>Please make an EFT to the following account.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-slate-100 p-4 rounded-lg space-y-2 text-sm">
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Bank</span>
                                            <span className="font-semibold">FNB Namibia</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Account Name</span>
                                            <span className="font-semibold">Omari Finance CC</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Account Number</span>
                                            <span className="font-semibold">6225 123 4567</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Branch Code</span>
                                            <span className="font-semibold">280172</span>
                                        </div>
                                        <div className="flex justify-between pt-2">
                                            <span className="text-muted-foreground">Reference</span>
                                            <span className="font-bold text-primary">{user?.user_metadata?.national_id || "Your ID Number"}</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-800">
                                        <strong>Important:</strong> Please try to use your National ID number as the reference.
                                        Payments may take up to 24 hours to reflect on your dashboard.
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button onClick={() => setShowPayModal(false)}>Close</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }
            </main >

            <Footer />
        </div >
    )
}

function VerificationStatusSnapshot({ previewUrl, onRetake }: { previewUrl: string | null, onRetake: () => void }) {
    return (
        <div className="flex items-center gap-4 bg-white border border-slate-200 shadow-sm rounded-full pr-6 pl-2 py-2 mb-6 w-fit animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-10 w-10 relative rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 flex-shrink-0 group cursor-pointer">
                {previewUrl ? (
                    <img src={previewUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">IMG</div>
                )}
                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent w-full h-full -translate-y-full animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900">Verification Pending</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    AI Analyzing...
                </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button onClick={onRetake} className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline">
                Edit / Retake
            </button>
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
             `}</style>
        </div>
    )
}
