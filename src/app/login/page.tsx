"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Eye, EyeOff } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { supabase } from "@/lib/supabase"
import { loginSchema, type LoginFormData } from "@/lib/validation"

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})
    const router = useRouter()

    const validate = () => {
        try {
            loginSchema.parse(formData)
            setErrors({})
            return true
        } catch (err: any) {
            const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {}
            err.errors.forEach((error: any) => {
                const field = error.path[0] as keyof LoginFormData
                fieldErrors[field] = error.message
            })
            setErrors(fieldErrors)
            return false
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsLoading(true)
        setError(null)

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (signInError) {
                // Provide more helpful error messages
                if (signInError.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email before logging in. Check your inbox for the verification link.')
                } else if (signInError.message.includes('Invalid')) {
                    throw new Error('Invalid email or password. Please try again.')
                }
                throw signInError
            }

            if (data.user) {
                // Check if user is admin
                if (data.user.app_metadata?.role === 'admin') {
                    router.push("/admin")
                } else {
                    router.push("/dashboard")
                }
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
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
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your Omari Finance account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`flex h-10 w-full rounded-md border ${errors.email ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                placeholder="name@example.com"
                                disabled={isLoading}
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium leading-none">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`flex h-10 w-full rounded-md border ${errors.password ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm pr-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
                            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                        </div>
                        <Button className="w-full" size="lg" disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2" size="sm" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <div className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-medium text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
