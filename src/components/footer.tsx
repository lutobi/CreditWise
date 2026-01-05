import Link from "next/link"
import { CreditCard } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t bg-muted/40">
            <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                O
                            </div>
                            Omari Finance
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Empowering Namibia with smart financial solutions.
                        </p>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Products</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/products/personal-loans" className="hover:text-primary">Personal Loans</Link></li>
                            <li><Link href="/products/payday-loans" className="hover:text-primary">Payday Loans</Link></li>
                            <li><Link href="/products/credit-checks" className="hover:text-primary">Credit Check</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Company</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                            <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
                            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/legal/responsible-lending" className="hover:text-primary">Responsible Lending</Link></li>
                            <li><Link href="/legal/complaints" className="hover:text-primary">Complaints & Disputes</Link></li>
                            <li><Link href="/legal/terms" className="hover:text-primary">Terms of Service</Link></li>
                            <li><Link href="/legal/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground space-y-2">
                    <p>
                        Omari Finance (Pty) Ltd is registered with the Namibia Financial Institutions Supervisory Authority (NAMFISA) as a micro-lender.
                    </p>
                    <p>
                        © {new Date().getFullYear()} Omari Finance. All rights reserved.
                    </p>
                </div>
            </div>
        </footer >
    )
}
