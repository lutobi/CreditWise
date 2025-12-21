"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { supabase } from "@/lib/supabase"
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validation"

export default function ResetPasswordPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({})
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Check if we have a valid session from the reset link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/forgot-password')
            }
        })
    }, [router])

    const validate = () => {
        try {
            resetPasswordSchema.parse(formData)
            setErrors({})
            return true
        } catch (err: any) {
            const fieldErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {}
            err.errors.forEach((error: any) => {
                const field = error.path[0] as keyof ResetPasswordFormData
                fieldErrors[field] = error.message
            })
            setErrors(fieldErrors)
            return false
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsLoading(true)
        setError(null)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: formData.password
            })

            if (updateError) throw updateError

            setSuccess(true)
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
                <Card className="w-full max-w-md border-none shadow-xl">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Password updated!</CardTitle>
                        <CardDescription>
                            Your password has been successfully reset. Redirecting to login...
                        </CardDescription>
                    </CardHeader>
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
                    <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
                    <CardDescription>
                        Enter your new password below
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`flex h-10 w-full rounded-md border ${errors.password ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                disabled={isLoading}
                            />
                            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            <p className="text-xs text-muted-foreground">
                                Min 8 characters, 1 uppercase, 1 lowercase, 1 number
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className={`flex h-10 w-full rounded-md border ${errors.confirmPassword ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                disabled={isLoading}
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                        </div>
                        <Button className="w-full" size="lg" disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2" size="sm" />}
                            Reset Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
