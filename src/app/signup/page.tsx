"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Eye, EyeOff } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { supabase } from "@/lib/supabase"
import { signupSchema, type SignupFormData } from "@/lib/validation"
import { checkEmailExists, createProfile } from "@/app/actions/auth"

export default function SignupPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [accountExists, setAccountExists] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({})
    const [emailSent, setEmailSent] = useState(false)

    const validate = () => {
        console.log('Validating form data:', formData) // DEBUG
        const result = signupSchema.safeParse(formData)

        console.log('Validation result:', result) // DEBUG

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {}
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof SignupFormData
                console.log('Field error:', field, issue.message) // DEBUG
                // Keep the first error per field
                if (!fieldErrors[field]) {
                    fieldErrors[field] = issue.message
                }
            })
            console.log('Setting errors state:', fieldErrors) // DEBUG
            setErrors(fieldErrors)
            return false
        }

        setErrors({})
        return true
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsLoading(true)
        setError(null)
        setAccountExists(false)

        try {
            // 1. Pre-Check: Does email exist in profiles (or Auth)?
            const exists = await checkEmailExists(formData.email)
            if (exists) {
                setAccountExists(true)
                throw new Error("This email is already registered.")
            }

            // 2. Proceed with Signup
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    },
                    emailRedirectTo: 'https://www.omarifinance.com/auth/callback',
                },
            })

            if (signUpError) throw signUpError

            if (data.user) {
                // 3. Create profile entry using Server Action (Bypassing Client RLS)
                const res = await createProfile(data.user.id, formData.fullName, formData.email)
                if (!res.success) {
                    console.error("Profile creation failed (non-blocking):", res.error)
                }
            }

            // If we have a session, it means email verification is disabled or auto-confirmed
            if (data.session) {
                // Force a hard refresh to update auth state
                window.location.href = '/dashboard'
                return
            }

            setEmailSent(true)
        } catch (err: any) {
            // Only set general error if it's NOT the account exists one (handled by UI state)
            if (err.message !== "This email is already registered.") {
                setError(err.message)
            }
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
                <Card className="w-full max-w-md border-none shadow-xl">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                        <CardDescription>
                            We&apos;ve sent a verification link to <strong>{formData.email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Click the link in the email to verify your account and get started with Omari Finance.
                        </p>
                        <Link href="/login" className="block">
                            <Button className="w-full" size="lg">Go to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <CreditCard className="h-6 w-6" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details to get started with Omari Finance
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSignup} className="space-y-4" noValidate>
                        {/* Account Exists Warning */}
                        {accountExists && (
                            <div className="p-4 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200 animate-in fade-in slide-in-from-top-2">
                                <p className="font-semibold mb-1">Account already exists</p>
                                <p className="mb-2">It looks like you already have an account with this email.</p>
                                <Link href="/forgot-password">
                                    <Button variant="outline" size="sm" className="w-full bg-white hover:bg-amber-100 text-amber-900 border-amber-300">
                                        Reset Password
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md animate-in fade-in">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium leading-none">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className={`flex h-10 w-full rounded-md border ${errors.fullName ? 'border-red-500 ring-1 ring-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                placeholder="John Doe"
                                disabled={isLoading}
                            />
                            {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value })
                                    setAccountExists(false) // Clear warning on edit
                                }}
                                className={`flex h-10 w-full rounded-md border ${errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                placeholder="name@example.com"
                                disabled={isLoading}
                            />
                            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`flex h-10 w-full rounded-md border ${errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-input'} bg-background px-3 py-2 text-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 mt-1 font-medium animate-in fade-in">
                                    {errors.password}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className={`flex h-10 w-full rounded-md border ${errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : 'border-input'} bg-background px-3 py-2 text-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-500 font-medium">{errors.confirmPassword}</p>}
                        </div>
                        <Button className="w-full" size="lg" disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2" size="sm" />}
                            {accountExists ? 'Recover Account' : 'Sign Up'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <div className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
