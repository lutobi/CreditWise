"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BadgeCheck, Briefcase, CreditCard, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"


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
    rejection_reason?: string // Added
}

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState<LoanData[]>([])
    const [verification, setVerification] = useState<VerificationData | null>(null)
    const [loading, setLoading] = useState(true)

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

            if (data) setLoans(data)
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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Determine active loan (pending, approved, under_review, rejected)
    // We display the most recent one if it's not paid off/closed?
    // For now, let's just take the most recent loan.
    const activeLoan = loans[0]

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(loans.filter(l => l.status === 'approved').reduce((acc, loan) => acc + loan.amount, 0))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loans.filter(l => l.status === 'approved').length}</div>
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
                                {loans.some(l => l.status === 'approved') ? 'Active' : 'No Active Loans'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${activeLoan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        activeLoan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {activeLoan.status.replace('_', ' ')}
                                    </span>
                                </div>

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
                                    {activeLoan.status === 'pending' && (
                                        <Button variant="outline" className="flex-1" onClick={() => router.push('/apply')}>
                                            Edit Application
                                        </Button>
                                    )}
                                    <Button className="flex-1" onClick={() => {
                                        if (activeLoan.status === 'approved') {
                                            alert("Payment gateway integration coming soon!")
                                        } else {
                                            router.push(`/loans/${activeLoan.id}`)
                                        }
                                    }}>
                                        {activeLoan.status === 'approved' ? 'Repay Loan' : 'View Details'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="text-2xl font-bold text-muted-foreground">No Active Loans</div>
                                <p className="text-xs text-muted-foreground">
                                    You are eligible for a loan up to {formatCurrency(50000)}.
                                </p>
                                <Button className="w-full" onClick={() => router.push('/apply')}>Apply Now</Button>
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
                                {loans.filter(l => l.status === 'approved').map((loan) => (
                                    <Card key={loan.id} className="border-none shadow-sm">
                                        <CardContent className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
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
                                            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {loan.status}
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/loans/${loan.id}`)}>
                                                    View
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >

            <Footer />
        </div >
    )
}
