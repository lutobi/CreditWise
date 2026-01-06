"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Banknote, TrendingUp, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useState } from "react"
import { formatCurrency } from "@/lib/utils"

// Custom Simple Accordion
function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border-b border-primary/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 font-semibold text-left transition-all hover:text-primary"
      >
        {question}
        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90 text-primary" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 pb-4" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden text-sm text-muted-foreground">
          {answer}
        </div>
      </div>
    </div>
  )
}

function LoanCalculatorWidget() {
  const [amount, setAmount] = useState(5000)
  const [months, setMonths] = useState(1) // Default to 1 for Payday
  const [loanType, setLoanType] = useState<'term' | 'payday'>('payday') // Default to Payday

  // Calculate based on loan type
  const calculateLoan = () => {
    if (loanType === 'payday') {
      // Payday Loan: 25% flat fee (for loans ≤5 months)
      const fee = amount * 0.25
      const totalRepayment = amount + fee
      const monthlyPayment = totalRepayment / months
      return { totalRepayment, monthlyPayment, effectiveAPR: 25 }
    } else {
      // Term Loan: 18% p.a. + 15% initiation fee + N$50/month service fee
      const annualRate = 0.18
      const initiationFee = amount * 0.15
      const monthlyServiceFee = 50
      const monthlyInterest = (amount * annualRate) / 12

      // Simple interest calculation
      const totalInterest = monthlyInterest * months
      const totalServiceFees = monthlyServiceFee * months
      const totalRepayment = amount + totalInterest + initiationFee + totalServiceFees
      const monthlyPayment = totalRepayment / months

      // Calculate effective APR
      const effectiveAPR = ((totalRepayment - amount) / amount) * (12 / months) * 100

      return { totalRepayment, monthlyPayment, effectiveAPR }
    }
  }

  const { totalRepayment, monthlyPayment, effectiveAPR } = calculateLoan()

  return (
    <Card className="relative border-2 border-primary/20 shadow-2xl bg-white dark:bg-slate-950 z-10">
      <CardHeader>
        <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">Payday Loan Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loan Type Toggle - HIDDEN FOR PAYDAY FOCUS */}
        {/* 
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => {
              setLoanType('term')
              setMonths(6)
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${loanType === 'term'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Term Loan
          </button>
          <button
            onClick={() => {
              setLoanType('payday')
              setMonths(1)
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${loanType === 'payday'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Payday Loan
          </button>
        </div>
        */}
        {/* End Toggle */}

        {/* Info Badge Removed */}
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg opacity-0 h-0 p-0 m-0 overflow-hidden">
          {/* Hidden to preserve layout if needed, or just remove. Better to remove. */}
        </div>

        {/* Amount Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Amount</span>
            <span className="text-primary text-lg">{formatCurrency(amount)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground w-12 text-right">N$ 1k</span>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs font-medium text-muted-foreground w-12">N$ 50k</span>
          </div>
        </div>

        {/* Duration Display (Static) */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Duration</span>
            <span className="text-primary font-bold text-lg">1 Month</span>
          </div>
          <div className="w-full bg-muted rounded-lg p-3 text-center text-sm font-medium text-muted-foreground">
            Payday Loan (Fixed Term)
          </div>
        </div>

        {/* Result Display */}
        <div className="rounded-xl bg-primary/10 p-4 space-y-2 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Total Repayment</span>
            <span className="text-3xl font-bold text-primary">{formatCurrency(Math.ceil(totalRepayment))}</span>
          </div>
        </div>

        <Link href={`/signup?amount=${amount}&months=${months}&type=${loanType}`} className="w-full block">
          <Button className="w-full text-lg font-semibold h-12 shadow-lg hover:shadow-xl transition-all" size="lg">
            Apply for {formatCurrency(amount)}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 items-center">
              <div className="flex flex-col gap-6 animate-in slide-in-from-left-5 duration-700">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary w-fit">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Now Live in Namibia
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-foreground">
                  Unlock Your <span className="text-primary">Financial Potential</span>
                </h1>
                <p className="text-lg text-muted-foreground md:text-xl max-w-[500px]">
                  Get fast access to loans, check your application status, and manage your financial health with Omari Finance. Simple, responsible, and secure.
                </p>
                <div className="text-xs text-muted-foreground border-l-2 border-primary/50 pl-3">
                  Lending decisions are subject to credit, affordability, and verification checks. Terms, fees, and interest apply.
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                      Get Started <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg">
                      How it Works
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> No hidden fees
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Fast online application
                  </div>
                </div>
              </div>

              {/* Hero Image / Widget Placeholder */}
              <div className="relative mx-auto w-full max-w-[500px] animate-in slide-in-from-right-5 duration-700 delay-200">
                <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-secondary/20 blur-3xl"></div>
                <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>

                <LoanCalculatorWidget />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Why Choose Omari Finance?</h2>
              <p className="text-lg text-muted-foreground max-w-[700px] mx-auto">
                We provide the tools you need to take control of your financial future in Namibia.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle>Fast & Easy Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Submit your application quickly online. Once approved, funds are transferred promptly to your bank account.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <CardTitle>Credit Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    View your credit report as part of the application process (with your consent) to understand your financial standing.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4 text-accent-foreground">
                    <Banknote className="h-6 w-6" />
                  </div>
                  <CardTitle>Employment Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Employment and income information is verified where provided as part of our affordability assessment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 items-center">
              <div className="order-2 md:order-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-3xl opacity-20 transform rotate-3"></div>
                  <img
                    src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop"
                    alt="Happy customer using phone"
                    className="relative rounded-3xl shadow-2xl w-full object-cover h-[500px]"
                  />
                </div>
              </div>
              <div className="order-1 md:order-2 flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">How It Works</h2>
                  <p className="text-lg text-muted-foreground">
                    Getting financial help shouldn't be complicated. We've simplified the process into 3 easy steps.
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">1</div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Create an Account</h3>
                      <p className="text-muted-foreground">Sign up in seconds with your basic details. It's free and secure.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">2</div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Verify Your Profile</h3>
                      <p className="text-muted-foreground">Use our automated tools to verify your employment and check your credit score.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">3</div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Get Funded</h3>
                      <p className="text-muted-foreground">Choose your loan amount and get funds transferred to your account instantly.</p>
                    </div>
                  </div>
                </div>

                <Link href="/apply">
                  <Button size="lg" className="w-fit">Start Your Application</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">Ready to get started?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-[600px] mx-auto">
              Join thousands of Namibians who trust Omari Finance for their financial needs.
            </p>
            <Link href="/apply">
              <Button size="lg" variant="secondary" className="text-lg px-8 font-bold">
                Apply Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
