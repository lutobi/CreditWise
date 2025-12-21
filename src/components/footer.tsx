import Link from "next/link"
import { CreditCard } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t bg-muted/40">
            <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="flex flex-col gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                <CreditCard className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-primary">CreditWise</span>
                                <span className="text-[9px] text-muted-foreground -mt-1">by Omari Finance</span>
                            </div>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Empowering Namibia with smart financial solutions.
                        </p>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Products</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary">Personal Loans</Link></li>
                            <li><Link href="#" className="hover:text-primary">Payday Loans</Link></li>
                            <li><Link href="#" className="hover:text-primary">Credit Check</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Company</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary">About Us</Link></li>
                            <li><Link href="#" className="hover:text-primary">Careers</Link></li>
                            <li><Link href="#" className="hover:text-primary">Contact</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                            <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} CreditWise by Omari Finance. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
