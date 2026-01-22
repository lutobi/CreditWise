
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider" // Assuming context exists or use supabase direct
import { supabase } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save, Lock, User, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        nationalId: '',
        email: '',
        phone: '',
        address: '',
        nokName: '',
        nokPhone: '',
        nokRelation: ''
    })

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login')
                return
            }
            fetchProfile()
        }
    }, [user, authLoading])

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single()

            if (error) throw error

            setFormData({
                fullName: data.full_name || '',
                nationalId: data.national_id || '',
                email: user!.email || '', // From Auth
                phone: data.phone_number || '',
                address: data.address || '',
                nokName: data.next_of_kin_name || '',
                nokPhone: data.next_of_kin_phone || '',
                nokRelation: data.next_of_kin_relation || ''
            })
        } catch (error) {
            console.error(error)
            toast.error("Failed to load profile")
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formData.phone,
                    address: formData.address,
                    nokName: formData.nokName,
                    nokPhone: formData.nokPhone,
                    nokRelation: formData.nokRelation
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success("Profile updated successfully")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold tracking-tight mb-2">My Profile</h1>
                <p className="text-slate-600 mb-8">Manage your personal information and account security.</p>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Col: Read Only Identity */}
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center text-lg">
                                    <ShieldCheck className="w-5 h-5 mr-2 text-green-600" />
                                    Verified Identity
                                </CardTitle>
                                <CardDescription>These details cannot be changed.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                                    <div className="font-medium">{formData.fullName}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">National ID</Label>
                                    <div className="font-medium">{formData.nationalId}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Email Address</Label>
                                    <div className="font-medium text-sm text-slate-600">{formData.email}</div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            Need to update your Name or ID? <br />
                            <a href="/contact" className="underline font-medium">Contact Support</a>
                        </div>
                    </div>

                    {/* Right Col: Editable Form */}
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact & Personal Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Mobile Number</Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="address">Residential Address</Label>
                                            <Input
                                                id="address"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h3 className="font-medium mb-4 flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            Next of Kin
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="nokName">Full Name</Label>
                                                <Input
                                                    id="nokName"
                                                    name="nokName"
                                                    value={formData.nokName}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="nokRelation">Relationship</Label>
                                                <Input
                                                    id="nokRelation"
                                                    name="nokRelation"
                                                    value={formData.nokRelation}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Spouse, Mother"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="nokPhone">Mobile Number</Label>
                                                <Input
                                                    id="nokPhone"
                                                    name="nokPhone"
                                                    value={formData.nokPhone}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button type="submit" disabled={submitting}>
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Password Change Section - Placeholder for now or implement direct link */}
                        <div className="mt-6 flex justify-end">
                            <Button variant="outline" className="text-slate-600" onClick={() => toast.info("Password change coming in next update")}>
                                <Lock className="w-4 h-4 mr-2" /> Change Password
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
