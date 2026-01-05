import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        These Terms of Service govern the use of the Omari Finance website and services.
                    </p>
                    <p>
                        By accessing or using our services, you agree to comply with these terms, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Loan application procedures</li>
                        <li>Repayment obligations</li>
                        <li>User responsibilities</li>
                        <li>Limitations of liability</li>
                    </ul>
                    <p className="font-medium text-lg">
                        Please read these terms carefully before applying for any loan.
                    </p>
                    {/* Placeholder for full legal text usually requires scrolling or distinct sections. Kept brief as per user input. */}
                </div>
            </main>
            <Footer />
        </div>
    )
}
