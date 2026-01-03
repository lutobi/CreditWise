"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Loader2, ArrowLeft, Calendar, CreditCard, DollarSign } from "lucide-react"

export default function LoanDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { id } = params
    const [loan, setLoan] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchLoanDetails()
    }, [id])

    const fetchLoanDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setLoan(data)
        } catch (error) {
            console.error("Error fetching loan:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!loan) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p>Loan not found.</p>
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12 flex justify-center">
                <Card className="w-full max-w-lg border-none shadow-xl">
                    <CardHeader>
                        <Button variant="ghost" size="sm" className="w-fit mb-4 pl-0 hover:bg-transparent" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <CardTitle className="text-2xl font-bold">Loan Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount</p>
                                    <p className="text-xl font-bold">N$ {loan.amount}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                }`}>
                                {loan.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm">Duration</span>
                                </div>
                                <p className="font-medium">{loan.duration_months} Months</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="text-sm">Monthly</span>
                                </div>
                                <p className="font-medium">N$ {loan.monthly_payment}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Application Date</span>
                                <span>{new Date(loan.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Loan ID</span>
                                <span className="font-mono text-xs">{loan.id.slice(0, 8)}...</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    )
}
