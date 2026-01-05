import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PersonalLoansPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Personal Loans</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        Omari Finance offers fixed-term personal loans designed to help manage planned or unexpected expenses in a responsible and transparent manner.
                    </p>

                    <h3 className="text-xl font-semibold">Key features:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Fixed repayment terms</li>
                        <li>Transparent interest rates and fees</li>
                        <li>Interest rates structured to be competitive within the micro-lending market</li>
                        <li>Clear monthly instalments</li>
                        <li>No hidden charges</li>
                    </ul>
                    <p>
                        All personal loans are subject to affordability assessments and approval in line with responsible lending regulations.
                    </p>
                    <div className="mt-8">
                        <Link href="/apply?type=term">
                            <Button size="lg" className="font-bold">Apply for Personal Loan</Button>
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
