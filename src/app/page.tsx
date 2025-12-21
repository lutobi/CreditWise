"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Banknote, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useState } from "react"

function LoanCalculatorWidget() {
  const [amount, setAmount] = useState(5000)
  const [months, setMonths] = useState(6)
  const [loanType, setLoanType] = useState<'term' | 'payday'>('term')

  // Calculate based on loan type
  const calculateLoan = () => {
    if (loanType === 'payday') {
      // Payday Loan: 30% flat fee (for loans ≤5 months)
      const fee = amount * 0.30
      const totalRepayment = amount + fee
      const monthlyPayment = totalRepayment / months
      return { totalRepayment, monthlyPayment, effectiveAPR: 30 }
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
        <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">Loan Calculator</CardTitle>
        <CardDescription className="text-base font-medium text-slate-600 dark:text-slate-300">
          Compare our loan options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loan Type Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setLoanType('term')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${loanType === 'term'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Term Loan
          </button>
          <button
            onClick={() => setLoanType('payday')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${loanType === 'payday'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Payday Loan
          </button>
        </div>

        {/* Info Badge */}
        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
          {loanType === 'term' ? (
            <span>📊 <strong>18% p.a.</strong> + 15% initiation fee + N$50/month service fee</span>
          ) : (
            <span>⚡ <strong>30% flat fee</strong> for quick loans (max 5 months)</span>
          )}
        </div>

        {/* Amount Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Amount</span>
            <span className="text-primary text-lg">N$ {amount.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>N$ 1,000</span>
            <span>N$ 50,000</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Duration</span>
            <span className="text-primary font-bold text-lg">{months} Months</span>
          </div>
          <input
            type="range"
            min={loanType === 'payday' ? 1 : 3}
            max={loanType === 'payday' ? 5 : 36}
            step="1"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-secondary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{loanType === 'payday' ? '1 Month' : '3 Months'}</span>
            <span>{loanType === 'payday' ? '5 Months' : '36 Months'}</span>
          </div>
        </div>

        {/* Result Display */}
        <div className="rounded-xl bg-primary/10 p-4 space-y-2 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payment</span>
            <span className="text-3xl font-bold text-primary">N$ {Math.ceil(monthlyPayment).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-primary/10">
            <span>Total Repayment</span>
            <span className="font-semibold">N$ {Math.ceil(totalRepayment).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Effective APR</span>
            <span className="font-semibold">{effectiveAPR.toFixed(1)}%</span>
          </div>
        </div>

        <Link href={`/signup?amount=${amount}&months=${months}&type=${loanType}`} className="w-full block">
          <Button className="w-full text-lg font-semibold h-12 shadow-lg hover:shadow-xl transition-all" size="lg">
            Apply for N$ {amount.toLocaleString()}
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
                  Get instant access to loans, verify your credit score, and manage your financial health with CreditWise. Simple, fast, and secure.
                </p>
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
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Instant approval
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
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Why Choose CreditWise?</h2>
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
                  <CardTitle>Fast & Easy Loans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Apply online in minutes and get approved instantly. Funds are transferred directly to your bank account.
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
                    Check your credit score instantly and understand your financial standing with our built-in tools.
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
                    Secure verification of your employment status to speed up loan approvals and build trust.
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
              Join thousands of Namibians who trust CreditWise for their financial needs.
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
