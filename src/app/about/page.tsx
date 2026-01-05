import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">About Omari Finance</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        Omari Finance (Pty) Ltd is a Namibian registered micro-lending company authorized and registered with the Namibia Financial Institutions Supervisory Authority (NAMFISA).
                    </p>
                    <p>
                        We are committed to ethical, transparent, and responsible credit provision in accordance with applicable laws and regulatory requirements.
                    </p>
                    <p>
                        Our mission is to provide accessible financial solutions while protecting our customers’ long-term financial wellbeing. We aim to support short-term financial needs without encouraging over-indebtedness.
                    </p>

                    <h2 className="text-2xl font-bold mt-8">Our Values</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Transparency in pricing, terms, and communication</li>
                        <li>Fair treatment of customers</li>
                        <li>Responsible lending practices</li>
                        <li>Regulatory compliance and good governance</li>
                    </ul>
                </div>
            </main>
            <Footer />
        </div>
    )
}
