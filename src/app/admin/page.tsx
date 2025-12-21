"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"

type LoanApplication = {
    id: string
    amount: number
    duration_months: number
    status: string
    created_at: string
    documents: {
        id_url: string
        payslip_url: string
    } | null
    profiles: {
        full_name: string
        national_id: string
    }
}

type VerificationRequest = {
    user_id: string
    employer_name: string
    monthly_income: number
    is_employed: boolean
    credit_score: number
    profiles: {
        full_name: string
    }
}

export default function AdminPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState<LoanApplication[]>([])
    const [verifications, setVerifications] = useState<VerificationRequest[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading) {
            // In a real app, check for admin role here
            // if (!user || user.role !== 'admin') router.push('/')
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

            if (loansData) setLoans(loansData as any)

            // Fetch pending verifications
            const { data: verifData } = await supabase
                .from('verifications')
                .select('*, profiles(full_name)')
                .eq('is_employed', false)
                .not('employer_name', 'is', null)

            if (verifData) setVerifications(verifData as any)

        } catch (error) {
            console.error("Error fetching admin data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLoanAction = async (id: string, status: 'approved' | 'rejected') => {
        await supabase.from('loans').update({ status }).eq('id', id)
        fetchAdminData() // Refresh
    }

    const handleVerifyUser = async (userId: string, creditScore: number) => {
        await supabase.from('verifications').update({
            is_employed: true,
            credit_score: creditScore
        }).eq('user_id', userId)
        fetchAdminData() // Refresh
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
                                            <p>Duration: {loan.duration_months} months</p>
                                            {loan.documents && (
                                                <div className="flex gap-2 mt-2">
                                                    <Button variant="outline" size="sm" onClick={() => window.open(loan.documents?.id_url, '_blank')}>
                                                        View ID
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => window.open(loan.documents?.payslip_url, '_blank')}>
                                                        View Payslip
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
                                            <Button size="sm" onClick={() => handleVerifyUser(verif.user_id, 750)}>
                                                Verify & Set Score 750
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
