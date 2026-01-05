import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function PrivacyPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        Omari Finance is committed to protecting your personal information.
                    </p>

                    <h3 className="text-xl font-semibold">This Privacy Policy explains:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>What data we collect</li>
                        <li>How your data is used</li>
                        <li>How your data is stored and protected</li>
                        <li>Your rights regarding your personal information</li>
                    </ul>

                    <p>
                        We only collect information necessary for lawful and responsible lending purposes.
                    </p>
                    {/* Placeholder. Kept brief as per user input. */}
                </div>
            </main>
            <Footer />
        </div>
    )
}
