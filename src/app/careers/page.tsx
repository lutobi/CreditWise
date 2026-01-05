import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function CareersPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Careers at Omari Finance</h1>
                <div className="prose dark:prose-invert max-w-none space-y-6">
                    <p>
                        At Omari Finance, we value integrity, professionalism, and a strong commitment to customer care. We are always interested in engaging talented individuals who share our values and are passionate about ethical financial services.
                    </p>
                    <p>
                        If you are interested in career opportunities with Omari Finance, please contact us or check this page for future vacancies.
                    </p>
                    <p className="font-medium">
                        📧 <a href="mailto:careers@omarifinance.com" className="text-primary hover:underline">careers@omarifinance.com</a>
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    )
}
