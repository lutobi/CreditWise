import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"

export default function ComplaintsPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Complaints & Dispute Resolution</h1>
                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p>
                        Omari Finance is committed to treating customers fairly and resolving complaints promptly and transparently.
                        If you are dissatisfied with our service or have a complaint, you may follow the process below:
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">Step 1: Contact Us</h2>
                        <p>Please submit your complaint using one of the following channels:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Email: <a href="mailto:complaints@omarifinance.com" className="text-primary hover:underline">complaints@omarifinance.com</a></li>
                            <li>Phone: [Insert Phone Number]</li>
                        </ul>
                        <p className="mt-4">Please include:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Your full name</li>
                            <li>Contact details</li>
                            <li>Loan reference number (if applicable)</li>
                            <li>A clear description of your complaint</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">Step 2: Internal Review</h2>
                        <p>
                            We will acknowledge receipt of your complaint and investigate the matter fairly and objectively.
                            We aim to resolve complaints within a reasonable timeframe, and we will keep you informed of progress where necessary.
                        </p>
                        <h3 className="text-xl font-semibold mt-4">Our Commitment</h3>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Complaints are handled confidentially</li>
                            <li>Customers are treated fairly and respectfully</li>
                            <li>There is no penalty for lodging a complaint</li>
                        </ul>
                        <p className="mt-2">We value feedback as it helps us improve our services and maintain high standards of customer care.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">Step 3: Escalation</h2>
                        <p>
                            If you are not satisfied with the outcome of your complaint after it has been reviewed internally, you may request that the matter be escalated for further consideration.
                        </p>
                        <p className="mt-2">
                            You also have the right to refer your complaint to the Namibia Financial Institutions Supervisory Authority (NAMFISA), which oversees registered micro-lenders in Namibia.
                        </p>

                        <div className="bg-muted p-6 rounded-lg mt-4">
                            <h3 className="font-bold mb-2">NAMFISA Complaints Contact Details:</h3>
                            <ul className="space-y-1 text-sm">
                                <li><strong>Authority:</strong> Namibia Financial Institutions Supervisory Authority (NAMFISA)</li>
                                <li><strong>Email:</strong> <a href="mailto:complaints@namfisa.com.na" className="text-primary hover:underline">complaints@namfisa.com.na</a></li>
                                <li><strong>Telephone:</strong> +264 61 290 5000</li>
                                <li><strong>Website:</strong> <a href="https://www.namfisa.com.na" target="_blank" className="text-primary hover:underline">www.namfisa.com.na</a></li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-4">
                                Please note that NAMFISA may require proof that you have first attempted to resolve the complaint directly with Omari Finance before reviewing the matter.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}
