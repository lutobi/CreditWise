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
        selfie_url?: string
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
    employment_type?: string // Added field
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
                .select('*, profiles(full_name)')
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
        await supabase.from('loans').update({ status }).eq('id', id)
        fetchAdminData() // Refresh
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

    const handleVerifyUser = async (userId: string, income: number, employmentType: string) => {
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
                    employmentType: employmentType // Assuming this comes from the record? Wait, `verifications` table has employer_name, monthly_income but maybe not 'employment_type'?
                    // Let's check the type definition at the top of the file
                })
            })

            const result = await response.json();

            if (result.success) {
                // 2. Update Supabase with the calculated score
                await supabase.from('verifications').update({
                    is_employed: true,
                    credit_score: result.data.score
                }).eq('user_id', userId)

                // Refresh Data
                fetchAdminData()
                alert(`User Verified! System Calculated Score: ${result.data.score}`)
            } else {
                alert('Verification Failed')
            }

        } catch (error) {
            console.error('Verification error:', error)
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
                                            <p>Duration: {loan.duration_months} months</p>
                                            {loan.documents && (
                                                <div className="flex gap-2 mt-2">
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
                                            <Button size="sm" onClick={() => handleVerifyUser(verif.user_id, verif.monthly_income, verif.employment_type || 'Unknown')}>
                                                Verify & Calculate Score
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
