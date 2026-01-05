import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PaydayLoansPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Payday Loans</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        Omari Finance payday loans provide short-term financial assistance intended to be repaid on your next salary date. These loans are designed to support temporary cash-flow needs and are not intended for long-term borrowing.
                    </p>

                    <h3 className="text-xl font-semibold">Key features:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Short repayment period (typically up to 30 days)</li>
                        <li>Clearly disclosed interest rates and fees</li>
                        <li>Single, one-off repayment on the agreed due date</li>
                        <li>Designed for short-term, unforeseen expenses</li>
                        <li>Extensions may be considered subject to payment of accrued interest and further assessment</li>
                    </ul>
                    <p>
                        Payday loans are offered responsibly and are subject to affordability assessments and approval in line with responsible lending regulations.
                    </p>
                    <div className="mt-8">
                        <Link href="/apply?type=payday">
                            <Button size="lg" className="font-bold">Apply for Payday Loan</Button>
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
