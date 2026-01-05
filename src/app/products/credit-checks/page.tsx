import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function CreditChecksPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Credit Checks</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        As part of our responsible lending practices, Omari Finance conducts credit checks through registered credit bureaus, subject to customer consent.
                    </p>

                    <h3 className="text-xl font-semibold">Credit checks help us to:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Assess affordability and repayment capacity</li>
                        <li>Prevent over-indebtedness</li>
                        <li>Offer loan products that are appropriate to a customer’s financial circumstances</li>
                    </ul>

                    <h3 className="text-xl font-semibold mt-8">Customer value-added service:</h3>
                    <p>
                        As a once-off value-added service, customers who apply for a loan will be provided with a copy of their credit report, subject to consent and applicable credit bureau rules. This is intended to help customers better understand their credit profile.
                    </p>
                    <p>
                        All personal and credit information is handled securely and in accordance with applicable data protection and privacy laws.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
