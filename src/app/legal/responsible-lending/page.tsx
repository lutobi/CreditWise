import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function ResponsibleLendingPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Responsible Lending Statement</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        Omari Finance (Pty) Ltd is committed to responsible, fair, and ethical lending practices. Our goal is to provide access to credit while protecting our customers from financial harm and over-indebtedness.
                    </p>

                    <h3 className="text-xl font-semibold">We adhere to responsible lending principles by:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Conducting affordability assessments before approving any loan</li>
                        <li>Assessing income, expenses, and existing financial obligations</li>
                        <li>Providing clear and transparent information on interest rates, fees, and total cost of credit</li>
                        <li>Ensuring customers understand their repayment obligations</li>
                        <li>Avoiding reckless or irresponsible lending practices</li>
                    </ul>

                    <p>
                        We encourage customers to borrow only what they can reasonably afford to repay. Credit should support financial wellbeing, not create long-term hardship.
                    </p>

                    <p className="font-medium">
                        If you are unsure whether a loan is suitable for your circumstances, we encourage you to contact us before applying.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
