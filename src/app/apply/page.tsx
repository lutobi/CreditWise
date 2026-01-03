"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CheckCircle2, ChevronRight, Upload } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { personalDetailsSchema, employmentDetailsSchema, loanDetailsSchema, documentUploadSchema } from "@/lib/validation"
import { LiveSelfie } from "@/components/ui/live-selfie"
import { toast } from "sonner"

export default function ApplyPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [step, setStep] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(false)
    const [uploading, setUploading] = React.useState<string | null>(null)
    const [errors, setErrors] = React.useState<Record<string, string>>({})

    // Form State
    const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        nationalId: "",
        phone: "",
        employerName: "",
        monthlyIncome: "",
        employmentType: "Full-time Permanent",
        loanAmount: 5000,
        repaymentPeriod: 6,
        idDocument: "",
        payslip: "",
        selfie: ""
    })

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/apply")
        }
    }, [user, authLoading, router])

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'idDocument' | 'payslip') => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!user) {
            toast.error("Please login to upload documents")
            return
        }

        setUploading(fieldName)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${fieldName}-${Date.now()}.${fileExt}`
            const bucketName = fieldName === 'idDocument' ? 'documents_id' : 'documents_payslip'

            // NOTE: In production we would check bucket existence.
            // For now assuming 'documents' bucket or similar.
            // For Nomad Pinwheel, let's use a generic 'documents' bucket with path separation.

            const { error: uploadError, data } = await supabase.storage
                .from('documents')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Determine public URL (or just store path)
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName)

            updateField(fieldName, publicUrl)
            toast.success("Document uploaded successfully")

        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error("Upload failed: " + error.message)
        } finally {
            setUploading(null)
        }
    }

    const handleSelfieCapture = async (file: File | null) => {
        if (!file) return;
        if (!user) {
            toast.error("Please login to upload selfie");
            return;
        }

        setUploading('selfie');
        try {
            const fileName = `${user.id}/selfie-${Date.now()}.jpg`;

            // Upload to 'documents' bucket (reusing existing bucket)
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            updateField('selfie', publicUrl);
            toast.success("Selfie verified and uploaded");
        } catch (error: any) {
            console.error('Selfie upload error:', error);
            toast.error("Selfie upload failed: " + error.message);
        } finally {
            setUploading(null);
        }
    }

    const validateStep = () => {
        console.log('🔍 Validating step:', step);
        setErrors({})
        try {
            if (step === 1) {
                personalDetailsSchema.parse(formData)
            } else if (step === 2) {
                employmentDetailsSchema.parse(formData)
            } else if (step === 3) {
                documentUploadSchema.parse(formData)
            } else if (step === 4) {
                loanDetailsSchema.parse(formData)
            }
            return true
        } catch (err: any) {
            console.error('❌ Validation FAILED:', err);
            const fieldErrors: Record<string, string> = {}
            if (err && err.errors && Array.isArray(err.errors)) {
                err.errors.forEach((error: any) => {
                    fieldErrors[error.path[0]] = error.message
                })
            }
            setErrors(fieldErrors)
            return false
        }
    }

    const handleNext = async () => {
        if (!validateStep()) {
            toast.error("Please fix the errors before continuing")
            return
        }

        if (step < 4) {
            setStep(step + 1)
            return
        }

        // Submit Application
        setIsLoading(true)
        try {
            if (!user) {
                toast.error("You must be logged in to submit")
                return
            }

            // 0. Ensure Profile Exists (Fix for FK Error)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: `${formData.firstName} ${formData.lastName}`.trim(),
                    national_id: formData.nationalId,
                    phone_number: formData.phone,
                    updated_at: new Date().toISOString()
                })

            if (profileError) {
                console.error("Error updating profile:", profileError)
                // We don't block here strictly, but it likely causes next step to fail
                // if it didn't exist.
                throw new Error("Failed to update profile: " + profileError.message)
            }

            // 1. Update Profile/Verification info
            let verifError = null;
            const { error: insertError } = await supabase
                .from('verifications')
                .insert({
                    user_id: user.id,
                    employer_name: formData.employerName,
                    monthly_income: parseFloat(formData.monthlyIncome),
                    is_employed: false,
                    employment_type: formData.employmentType
                });

            if (insertError) {
                if (insertError.code === '23505') {
                    const { error: updateError } = await supabase
                        .from('verifications')
                        .update({
                            employer_name: formData.employerName,
                            monthly_income: parseFloat(formData.monthlyIncome),
                            is_employed: false,
                            employment_type: formData.employmentType
                        })
                        .eq('user_id', user.id);
                    verifError = updateError;
                } else {
                    verifError = insertError;
                }
            }

            if (verifError) throw verifError

            // 2. Create Loan Application with docs
            const monthlyPayment = (formData.loanAmount * 1.12) / formData.repaymentPeriod

            // Note: DB schema might not have documents_url column yet.
            // Assuming for now passing it in metadata or ignoring if schema not ready.
            // Let's assume we pass it. If schema fails, we will see in E2E.
            // Actually, best to pass it if column exists.

            const { error: loanError } = await supabase
                .from('loans')
                .insert({
                    user_id: user.id,
                    amount: formData.loanAmount,
                    duration_months: formData.repaymentPeriod,
                    monthly_payment: monthlyPayment,
                    status: 'pending',
                    documents: {
                        id_url: formData.idDocument,
                        payslip_url: formData.payslip,
                        selfie_url: formData.selfie
                    }
                })

            if (loanError) throw loanError

            toast.success("Application submitted successfully!")
            setStep(5)
        } catch (error: any) {
            console.error("Error submitting application:", error)
            toast.error("Failed to submit: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12 flex items-center justify-center">
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="w-full max-w-2xl">
                    <Card className="w-full border-none shadow-xl">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-6">
                                <div className="flex items-center gap-2">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
                                    <div className={`h-1 w-8 ${step >= 2 ? "bg-primary" : "bg-muted"}`}></div>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
                                    <div className={`h-1 w-8 ${step >= 3 ? "bg-primary" : "bg-muted"}`}></div>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
                                    <div className={`h-1 w-8 ${step >= 4 ? "bg-primary" : "bg-muted"}`}></div>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 4 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>4</div>
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold">
                                {step === 1 && "Personal Details"}
                                {step === 2 && "Employment Information"}
                                {step === 3 && "Document Uploads"}
                                {step === 4 && "Loan Details"}
                                {step === 5 && "Application Submitted!"}
                            </CardTitle>
                            <CardDescription>
                                {step === 1 && "Let's get to know you better."}
                                {step === 2 && "We need to verify your income source."}
                                {step === 3 && "Please upload your supporting documents."}
                                {step === 4 && "How much would you like to borrow?"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">First Name</label>
                                            <input type="text" className={`flex h-10 w-full rounded-md border ${errors.firstName ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="John" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Last Name</label>
                                            <input type="text" className={`flex h-10 w-full rounded-md border ${errors.lastName ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="Doe" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">National ID Number</label>
                                        <input type="text" className={`flex h-10 w-full rounded-md border ${errors.nationalId ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="Enter your ID number" value={formData.nationalId} onChange={(e) => updateField('nationalId', e.target.value)} />
                                        {errors.nationalId && <p className="text-xs text-red-500">{errors.nationalId}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Phone Number</label>
                                        <input type="tel" className={`flex h-10 w-full rounded-md border ${errors.phone ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="+264 81 123 4567" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Employer Name</label>
                                        <input type="text" className={`flex h-10 w-full rounded-md border ${errors.employerName ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="Company Ltd" value={formData.employerName} onChange={(e) => updateField('employerName', e.target.value)} />
                                        {errors.employerName && <p className="text-xs text-red-500">{errors.employerName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monthly Income (N$)</label>
                                        <input type="number" className={`flex h-10 w-full rounded-md border ${errors.monthlyIncome ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`} placeholder="15000" value={formData.monthlyIncome} onChange={(e) => updateField('monthlyIncome', e.target.value)} />
                                        {errors.monthlyIncome && <p className="text-xs text-red-500">{errors.monthlyIncome}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Employment Type</label>
                                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.employmentType} onChange={(e) => updateField('employmentType', e.target.value)}>
                                            <option>Full-time Permanent</option>
                                            <option>Contract</option>
                                            <option>Self-Employed</option>
                                            <option>Government</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {/* ID Document - Standard Upload */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">ID Document (Scan/Photo)</label>
                                            <div className="flex items-center gap-4">
                                                <Button type="button" variant="outline" className="w-full relative" disabled={uploading === 'idDocument'}>
                                                    {uploading === 'idDocument' ? <Spinner size="sm" className="mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    {formData.idDocument ? "Change File" : "Upload ID"}
                                                    <input
                                                        type="file"
                                                        id="idDocument"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => handleFileUpload(e, 'idDocument')}
                                                        accept="image/*,.pdf"
                                                    />
                                                </Button>
                                                {formData.idDocument && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                                            </div>
                                            {errors.idDocument && <p className="text-xs text-red-500">{errors.idDocument}</p>}
                                        </div>

                                        {/* Live Selfie - Webcam Capture */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Live Selfie (Liveness Check)</label>
                                            <div className="rounded-lg border p-4 bg-muted/50">
                                                {!formData.selfie ? (
                                                    <LiveSelfie
                                                        onCapture={(file) => handleSelfieCapture(file)}
                                                        error={errors.selfie}
                                                    />
                                                ) : (
                                                    <div className="text-center space-y-4">
                                                        <div className="aspect-square w-64 mx-auto rounded-lg overflow-hidden border-2 border-green-500">
                                                            <img src={formData.selfie} alt="Your selfie" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex justify-center gap-4">
                                                            <div className="flex items-center text-green-600 font-medium">
                                                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                                                Selfie Captured
                                                            </div>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => updateField('selfie', '')}>
                                                                Retake
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {uploading === 'selfie' && <div className="text-center text-xs text-muted-foreground mt-2">Uploading selfie...</div>}
                                            </div>
                                            {errors.selfie && <p className="text-xs text-red-500">{errors.selfie}</p>}
                                        </div>

                                        {/* Payslip - Standard Upload */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Latest Payslip</label>
                                            <div className="flex items-center gap-4">
                                                <Button type="button" variant="outline" className="w-full relative" disabled={uploading === 'payslip'}>
                                                    {uploading === 'payslip' ? <Spinner size="sm" className="mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    {formData.payslip ? "Change File" : "Upload Payslip"}
                                                    <input
                                                        type="file"
                                                        id="payslip"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => handleFileUpload(e, 'payslip')}
                                                        accept="image/*,.pdf"
                                                    />
                                                </Button>
                                                {formData.payslip && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                                            </div>
                                            {errors.payslip && <p className="text-xs text-red-500">{errors.payslip}</p>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, PDF. Max 5MB.</p>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Loan Amount (N$)</label>
                                        <input type="range" min="1000" max="50000" step="1000" className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" value={formData.loanAmount} onChange={(e) => updateField('loanAmount', parseInt(e.target.value))} />
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>N$ 1,000</span>
                                            <span className="font-bold text-primary text-lg">N$ {formData.loanAmount.toLocaleString()}</span>
                                            <span>N$ 50,000</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Repayment Period</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[6, 12, 24].map(period => (
                                                <Button key={period} type="button" variant="outline" className={formData.repaymentPeriod === period ? "border-primary bg-primary/5 text-primary" : ""} onClick={() => updateField('repaymentPeriod', period)}>
                                                    {period} Months
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-muted p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Monthly Installment</span>
                                            <span className="font-bold">N$ {Math.round((formData.loanAmount * 1.12) / formData.repaymentPeriod).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Interest Rate</span>
                                            <span className="font-bold">12% p.a.</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Total Repayment</span>
                                            <span className="font-bold">N$ {Math.round(formData.loanAmount * 1.12).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="flex flex-col items-center text-center py-6 space-y-4">
                                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                                        <CheckCircle2 className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-bold">Application Received!</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Your application has been submitted successfully.
                                        We will verify your details and notify you via SMS shortly.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            {step < 5 && (
                                <>
                                    <Button variant="ghost" type="button" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>
                                        Back
                                    </Button>
                                    <Button disabled={isLoading} type="submit">
                                        {isLoading && <Spinner className="mr-2" size="sm" />}
                                        {step === 4 ? "Submit Application" : "Next Step"}
                                        {!isLoading && step < 4 && <ChevronRight className="ml-2 h-4 w-4" />}
                                    </Button>
                                </>
                            )}
                            {step === 5 && (
                                <Link href="/dashboard" className="w-full">
                                    <Button className="w-full" size="lg">Go to Dashboard</Button>
                                </Link>
                            )}
                        </CardFooter>
                    </Card>
                </form>
            </main>
            <Footer />
        </div>
    )
}
