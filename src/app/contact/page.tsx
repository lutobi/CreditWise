import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function ContactPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Contact Us</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        If you have any questions or require assistance, please get in touch:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Email:</strong> <a href="mailto:support@omarifinance.com" className="text-primary hover:underline">support@omarifinance.com</a></li>
                        <li><strong>Phone:</strong> [Insert number]</li>
                        <li><strong>Office Hours:</strong> Monday – Friday, 08:00 – 17:00</li>
                        <li><strong>Location:</strong> Namibia</li>
                    </ul>
                    <p>
                        We aim to respond to all enquiries as promptly as possible.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
