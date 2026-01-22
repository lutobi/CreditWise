"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Loader2, DollarSign, Users, TrendingUp, CheckCircle, CreditCard, X, History } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ActiveLoan = {
    id: string
    user_id: string
    customer_name: string
    national_id: string
    phone: string
    loan_amount: number
    duration_months: number
    total_repayment: number
    monthly_payment: number
    amount_paid: number
    outstanding: number
    payment_status: 'unpaid' | 'partial' | 'paid'
    created_at: string
    completed_at?: string
}

type Summary = {
    total_active: number
    total_outstanding: number
    total_collected: number
    fully_paid: number
}

export default function ActiveLoansPage() {
    const { user, session, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [loans, setLoans] = useState<ActiveLoan[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('eft')
    const [referenceNumber, setReferenceNumber] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')

    // Filter loans based on tab
    const activeLoans = loans.filter(l => l.payment_status !== 'paid')
    const completedLoans = loans.filter(l => l.payment_status === 'paid')

    useEffect(() => {
        if (!authLoading && session) {
            checkAccess()
        }
    }, [user, session, authLoading])

    const checkAccess = () => {
        if (!user) return router.push('/login')
        const role = user.app_metadata?.role
        if (role !== 'admin' && role !== 'admin_approver' && role !== 'super_admin') {
            alert("Access Denied")
            router.push('/')
        } else {
            fetchLoans()
        }
    }

    const fetchLoans = async () => {
        try {
            setLoading(true)
            const headers: HeadersInit = {}
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }

            console.log('[ActiveLoans] Fetching with token:', session?.access_token ? 'YES' : 'NO')

            const res = await fetch('/api/admin/active-loans', { headers })
            const data = await res.json()

            console.log('[ActiveLoans] API Response:', data)

            if (data.success) {
                setLoans(data.data)
                setSummary(data.summary)
            } else {
                console.error('[ActiveLoans] Error:', data.error)
            }
        } catch (error) {
            console.error('[ActiveLoans] Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRecordPayment = async () => {
        if (!selectedLoan || !paymentAmount) return

        setIsRecording(true)
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' }
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const res = await fetch('/api/admin/record-payment', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    loanId: selectedLoan.id,
                    amount: parseFloat(paymentAmount),
                    paymentMethod,
                    referenceNumber: referenceNumber || null
                })
            })

            const data = await res.json()
            if (data.success) {
                alert(`Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully!`)
                setSelectedLoan(null)
                setPaymentAmount('')
                setReferenceNumber('')
                fetchLoans()
            } else {
                alert('Error: ' + data.error)
            }
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setIsRecording(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-purple-900">Active Loans</h1>
                        <p className="text-slate-600">Manage disbursed loans and record payments</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/admin')}>
                        ← Back to Dashboard
                    </Button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-8 h-8 text-purple-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{summary.total_active}</p>
                                        <p className="text-xs text-muted-foreground">Active Loans</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-8 h-8 text-red-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{formatCurrency(summary.total_outstanding)}</p>
                                        <p className="text-xs text-muted-foreground">Outstanding</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-8 h-8 text-green-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{formatCurrency(summary.total_collected)}</p>
                                        <p className="text-xs text-muted-foreground">Collected</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-8 h-8 text-blue-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{summary.fully_paid}</p>
                                        <p className="text-xs text-muted-foreground">Fully Paid</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs for Active Loans vs Loan History */}
                <Tabs defaultValue="active" className="mb-8">
                    <TabsList className="mb-4">
                        <TabsTrigger value="active" className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Active Loans ({activeLoans.length})
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Loan History ({completedLoans.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active">
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Loan Portfolio</CardTitle>
                                <CardDescription>Loans awaiting full repayment</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {activeLoans.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No active loans found</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="text-left p-3 font-medium">Customer</th>
                                                    <th className="text-left p-3 font-medium">Loan Amount</th>
                                                    <th className="text-left p-3 font-medium">Monthly</th>
                                                    <th className="text-left p-3 font-medium">Total Due</th>
                                                    <th className="text-left p-3 font-medium">Paid</th>
                                                    <th className="text-left p-3 font-medium">Outstanding</th>
                                                    <th className="text-left p-3 font-medium">Status</th>
                                                    <th className="text-left p-3 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loans.map((loan) => (
                                                    <tr key={loan.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-3">
                                                            <div>
                                                                <p className="font-medium">{loan.customer_name}</p>
                                                                <p className="text-xs text-muted-foreground">{loan.national_id}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-medium">{formatCurrency(loan.loan_amount)}</td>
                                                        <td className="p-3 text-purple-700 font-semibold">{formatCurrency(loan.monthly_payment)}</td>
                                                        <td className="p-3">{formatCurrency(loan.total_repayment)}</td>
                                                        <td className="p-3 text-green-600 font-medium">{formatCurrency(loan.amount_paid)}</td>
                                                        <td className="p-3 text-red-600 font-medium">{formatCurrency(loan.outstanding)}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${loan.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                                loan.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {loan.payment_status.charAt(0).toUpperCase() + loan.payment_status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {loan.payment_status !== 'paid' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedLoan(loan)
                                                                        setPaymentAmount(loan.monthly_payment.toString())
                                                                    }}
                                                                >
                                                                    <CreditCard className="w-4 h-4 mr-1" />
                                                                    Record Payment
                                                                </Button>
                                                            )}
                                                            {loan.payment_status === 'paid' && (
                                                                <span className="text-green-600 flex items-center gap-1">
                                                                    <CheckCircle className="w-4 h-4" /> Completed
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Loan History Tab */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>Loan History</CardTitle>
                                <CardDescription>Fully repaid loans</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {completedLoans.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No completed loans yet</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="text-left p-3 font-medium">Customer</th>
                                                    <th className="text-left p-3 font-medium">Loan Amount</th>
                                                    <th className="text-left p-3 font-medium">Total Repaid</th>
                                                    <th className="text-left p-3 font-medium">Duration</th>
                                                    <th className="text-left p-3 font-medium">Completed</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {completedLoans.map((loan) => (
                                                    <tr key={loan.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-3">
                                                            <div>
                                                                <p className="font-medium">{loan.customer_name}</p>
                                                                <p className="text-xs text-muted-foreground">{loan.national_id}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">{formatCurrency(loan.loan_amount)}</td>
                                                        <td className="p-3 text-green-600 font-medium">{formatCurrency(loan.amount_paid)}</td>
                                                        <td className="p-3">{loan.duration_months} Months</td>
                                                        <td className="p-3">
                                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                                                                <CheckCircle className="w-3 h-3" /> Paid
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Record Payment Modal */}
                {selectedLoan && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Record Payment</CardTitle>
                                    <CardDescription>{selectedLoan.customer_name}</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedLoan(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Monthly Due</p>
                                        <p className="font-bold text-purple-700">{formatCurrency(selectedLoan.monthly_payment)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Outstanding</p>
                                        <p className="font-bold text-red-600">{formatCurrency(selectedLoan.outstanding)}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Amount Received</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 p-2 border rounded-md"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Payment Method</label>
                                    <select
                                        className="w-full mt-1 p-2 border rounded-md"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="eft">EFT / Bank Transfer</option>
                                        <option value="cash">Cash</option>
                                        <option value="direct_debit">Direct Debit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Reference Number (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 p-2 border rounded-md"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        placeholder="Bank reference or receipt number"
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleRecordPayment}
                                    disabled={isRecording || !paymentAmount}
                                >
                                    {isRecording ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    {isRecording ? 'Recording...' : 'Confirm Payment'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}
