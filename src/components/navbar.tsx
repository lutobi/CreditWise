"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X, CreditCard, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)
    const { user, signOut } = useAuth()

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link className="flex items-center justify-center gap-2" href="/">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">
                                O
                            </div>
                            <span className="text-xl font-bold tracking-tighter">Omari Finance</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">
                            Features
                        </Link>
                        <Link href="/#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
                            How it Works
                        </Link>

                        {user ? (
                            <>
                                <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                                    Dashboard
                                </Link>
                                <div className="flex items-center gap-2 ml-2">
                                    <div className="flex items-center gap-2 mr-2 text-sm font-medium text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span className="max-w-[100px] truncate">{user.user_metadata?.full_name || 'User'}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => signOut()}>
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Sign Out
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">Log In</Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm">Get Started</Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden border-t bg-background p-4 shadow-lg animate-in slide-in-from-top-5">
                    <div className="flex flex-col space-y-4">
                        <Link
                            href="/#features"
                            className="text-sm font-medium hover:text-primary"
                            onClick={() => setIsOpen(false)}
                        >
                            Features
                        </Link>
                        <Link
                            href="/#how-it-works"
                            className="text-sm font-medium hover:text-primary"
                            onClick={() => setIsOpen(false)}
                        >
                            How it Works
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-sm font-medium hover:text-primary"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <div className="pt-2 border-t">
                                    <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span>{user.user_metadata.full_name || 'User'}</span>
                                    </div>
                                    <Button variant="destructive" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>
                                        Sign Out
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-2 pt-2">
                                <Link href="/login" onClick={() => setIsOpen(false)}>
                                    <Button variant="outline" className="w-full">Log In</Button>
                                </Link>
                                <Link href="/signup" onClick={() => setIsOpen(false)}>
                                    <Button className="w-full">Get Started</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
