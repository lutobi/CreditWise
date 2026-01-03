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

type VerificationData = {
    is_employed: boolean
    employer_name: string | null
    monthly_income: number | null
    credit_score: number
}

type LoanData = {
    id: string
    amount: number
    status: string
    created_at: string
}

export default function Dashboard() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [verification, setVerification] = useState<VerificationData | null>(null)
    const [activeLoan, setActiveLoan] = useState<LoanData | null>(null)
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
        } else if (user) {
            fetchUserData()
        }
    }, [user, authLoading, router])

    const fetchUserData = async () => {
        try {
            // Fetch verification status
            const { data: verifData, error: verifError } = await supabase
                .from('verifications')
                .select('*')
                .eq('user_id', user!.id)
                .maybeSingle()

            if (verifError) console.error('Error fetching verification:', verifError)

            if (verifData) {
                setVerification(verifData)
            } else {
                // Initialize defaults if no verification record exists yet
                setVerification({
                    is_employed: false,
                    credit_score: 0,
                    employer_name: null,
                    monthly_income: null
                } as any)
            }

            // Fetch active loan (Real Data Connection)
            const { data: loanData, error: loanError } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (loanError) console.error('Error fetching loan:', loanError)

            if (loanData) {
                setActiveLoan(loanData)
            } else {
                setActiveLoan(null)
            }

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoadingData(false)
        }
    }

    if (authLoading || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) return null // Will redirect

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.user_metadata.full_name || user.email}</h1>
                    <p className="text-muted-foreground">Here's an overview of your financial health.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Credit Score Card */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-primary/5 to-background">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-primary mb-2">
                                {verification?.credit_score || "---"}
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${((verification?.credit_score || 0) / 850) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {verification?.credit_score && verification.credit_score > 650
                                    ? "Excellent. You qualify for our lowest interest rates."
                                    : "Build your score to unlock better rates."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Employment Verification Card */}
                    <Card className="border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Employment Status</CardTitle>
                            <Briefcase className="h-4 w-4 text-secondary" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl font-bold">
                                    {verification?.is_employed ? "Verified" : "Pending"}
                                </span>
                                {verification?.is_employed ? (
                                    <BadgeCheck className="h-6 w-6 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                                {verification?.employer_name
                                    ? `Verified at ${verification.employer_name}`
                                    : "Please complete your profile to verify employment."}
                            </p>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/apply')}>Update Details</Button>
                        </CardContent>
                    </Card>

                    {/* Active Loan Card */}
                    <Card className="border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Loan</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {activeLoan ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-bold">N$ {activeLoan.amount}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${activeLoan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            activeLoan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {activeLoan.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Applied on {new Date(activeLoan.created_at).toLocaleDateString()}
                                    </p>
                                    <Button className="w-full" variant="outline" onClick={() => router.push(`/loans/${activeLoan.id}`)}>View Details</Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="text-2xl font-bold text-muted-foreground">No Active Loans</div>
                                    <p className="text-xs text-muted-foreground">
                                        You are eligible for a loan up to N$ 50,000.
                                    </p>
                                    <Button className="w-full" onClick={() => router.push('/apply')}>Apply Now</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    )
}
