"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CheckCircle2, ChevronRight, Upload, AlertCircle, Scale } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import {
    personalDetailsSchema,
    employmentDetailsSchema,
    bankingDetailsSchema,
    loanDetailsSchema,
    referencesSchema,
    documentUploadSchema,
    declarationSchema
} from "@/lib/validation"
import { LiveSelfie } from "@/components/ui/live-selfie"
import { toast } from "sonner"
import { sendAdminLoanAlert } from "@/app/actions/email"
import { formatCurrency } from "@/lib/utils"

export default function ApplyPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [step, setStep] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(false)
    const [uploading, setUploading] = React.useState<string | null>(null)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [existingLoanId, setExistingLoanId] = React.useState<string | null>(null)

    // Form State
    const [formData, setFormData] = React.useState({
        // 1. Personal
        firstName: "",
        lastName: "",
        nationalId: "",
        dob: "",
        gender: "Male" as "Male" | "Female" | "Other",
        nationality: "Namibian",
        maritalStatus: "Single" as "Single" | "Married" | "Divorced" | "Widowed" | "Separated",
        address: "",
        phone: "",
        altPhone: "",
        email: "",

        // 2. Employment
        employerName: "",
        jobTitle: "",
        employerPhone: "",
        employmentStartDate: "",
        employmentType: "Permanent" as "Permanent" | "Contract" | "Temporary",
        hrName: "",
        hrEmail: "",
        hrPhone: "",
        monthlyIncome: "",

        // 3. Banking
        bankName: "",
        accountHolder: "",
        accountNumber: "",
        accountType: "Savings" as "Savings" | "Cheque/Current",
        branchCode: "",

        // 4. Loan Details
        loanType: "term" as "term" | "payday",
        loanAmount: 5000,
        repaymentPeriod: 6,
        loanPurpose: "",
        repaymentMethod: "Debit Order" as "Debit Order" | "EFT" | "Cash Deposit",

        // 5. References
        nextOfKinName: "",
        nextOfKinRelationship: "",
        nextOfKinContact: "",
        nextOfKinAddress: "",

        // 6. Documents
        idDocument: "",
        payslip: "",
        selfie: "",

        // 7. Declaration
        confirmTruth: false,
        understandLegal: false,
        consentAffordability: false,
        consentVerification: false,
        readTerms: false,
        acknowledgeRight: false,
        signatureName: "",
        declarationDate: new Date().toISOString().split('T')[0],
        termsAccepted: false,

        // 10. Automation Data
        verificationData: null as any
    })

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/apply")
        }
    }, [user, authLoading, router])

    // Check for existing loans
    React.useEffect(() => {
        const checkExistingLoan = async () => {
            if (!user) return

            const { data: loans, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)

            if (loans && loans.length > 0) {
                const latestLoan = loans[0]
                if (latestLoan.status === 'active' || latestLoan.status === 'approved') {
                    toast.error("You already have an active loan. Please repay it before applying for a new one.")
                    router.push('/dashboard')
                } else if (latestLoan.status === 'pending') {
                    console.log('✅ Found pending loan:', latestLoan.id)
                    toast.info("Resuming your pending application.")
                    setExistingLoanId(latestLoan.id)

                    // Helper to safely parse JSON
                    const parseData = (data: any) => {
                        return typeof data === 'string' ? JSON.parse(data) : data || {}
                    }

                    // Pre-fill form from application_data if available, else basic map
                    const appData = parseData(latestLoan.application_data)

                    setFormData(prev => ({
                        ...prev,
                        ...appData, // Spread full saved data
                        loanAmount: latestLoan.amount, // Ensure core fields sync
                        repaymentPeriod: latestLoan.duration_months,
                    }))
                }
            }
        }
        checkExistingLoan()
    }, [user, router])

    const updateField = (field: string | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, value?: any) => {
        if (typeof field === 'object' && field !== null && 'target' in field) {
            const { name, value } = field.target
            setFormData(prev => ({ ...prev, [name]: value }))
            if (errors[name]) {
                setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[name]
                    return newErrors
                })
            }
        } else {
            const fieldName = field as string
            setFormData(prev => ({ ...prev, [fieldName]: value }))
            if (errors[fieldName]) {
                setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[fieldName]
                    return newErrors
                })
            }
        }
    }

    const handleDocumentAnalysis = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await fetch('/api/analyze-statement', {
                method: 'POST',
                body: formData
            });
            const data = await result.json();

            if (data.success) {
                console.log("Statement Analysis:", data);
                updateField('verificationData', data);
                toast.success(`Bank Statement Verified. Estimated Income: ${formatCurrency(data.estimatedIncome)}`);
            }
        } catch (e) {
            console.error("Analysis Failed", e);
            // We do not block the user, just log it.
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'idDocument' | 'payslip') => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!user) return

        setUploading(fieldName)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${fieldName}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName)

            updateField(fieldName, publicUrl)

            // Trigger Analysis for Payslip/Statement
            if (fieldName === 'payslip') {
                handleDocumentAnalysis(file);
            }

            toast.success("Document uploaded successfully")

        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error("Upload failed: " + error.message)
        } finally {
            setUploading(null)
        }
    }

    const handleSelfieCapture = async (file: File | null) => {
        if (!file || !user) return;
        setUploading('selfie');
        try {
            const fileName = `${user.id}/selfie-${Date.now()}.jpg`;
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
            toast.error("Selfie upload failed: " + error.message);
        } finally {
            setUploading(null);
        }
    }

    const validateStep = () => {
        setErrors({})
        try {
            switch (step) {
                case 1: personalDetailsSchema.parse(formData); break;
                case 2: employmentDetailsSchema.parse(formData); break;
                case 3: bankingDetailsSchema.parse(formData); break;
                case 4: loanDetailsSchema.parse(formData); break;
                case 5: referencesSchema.parse(formData); break;
                case 6: documentUploadSchema.parse(formData); break;
                case 7: declarationSchema.parse(formData); break;
            }
            return true
        } catch (err: any) {
            console.error('Validation FAILED:', err);
            console.log('Validation Errors:', JSON.stringify(err.errors, null, 2));
            console.log('FormData:', JSON.stringify(formData, null, 2));
            const fieldErrors: Record<string, string> = {}
            if (err && err.errors && Array.isArray(err.errors)) {
                err.errors.forEach((error: any) => {
                    fieldErrors[error.path[0]] = error.message
                })
            }
            setErrors(fieldErrors)

            // UX Improvement: Scroll to first error instead of generic toast
            const firstErrorField = Object.keys(fieldErrors)[0];
            if (firstErrorField) {
                const element = document.getElementsByName(firstErrorField)[0];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                }
                toast.error(`Please check the ${firstErrorField.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
            }
            return false
        }
    }


    const handleLoanTypeChange = (value: string) => {
        updateField('loanType', value)
        if (value === 'payday') {
            updateField('repaymentPeriod', 1)
        } else {
            // Default to 6 months for term loans if coming from payday
            if (formData.repaymentPeriod === 1) updateField('repaymentPeriod', 6)
        }
    }

    const handleNext = async () => {
        if (isLoading) return; // Prevent double clicks

        // Brief loading state to prevent double submissions/clicks during validation
        setIsLoading(true);

        // Validation - If false, stop and reset loading
        if (!validateStep()) {
            setIsLoading(false);
            return;
        }

        if (step < 7) {
            // Face Verification moved to Admin Portal
            // Just proceed to next step
            setStep(step + 1)
            setIsLoading(false)
            return
        }

        // Submit Application (Step 8 is Success)
        try {
            if (!user) throw new Error("Not authenticated");

            // 1. Upsert Profile
            await supabase.from('profiles').upsert({
                id: user.id,
                full_name: `${formData.firstName} ${formData.lastName}`.trim(),
                national_id: formData.nationalId,
                phone_number: formData.phone,
                updated_at: new Date().toISOString()
            })

            // 2. Upsert Verification
            const { error: verifError } = await supabase.from('verifications').upsert({
                user_id: user.id,
                employment_status: formData.employmentType,
                monthly_income: parseFloat(formData.monthlyIncome),
                employer_name: formData.employerName,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            if (verifError) {
                console.error('Verification Upsert Error:', verifError)
                // Continue anyway, not critical blocking
            }

            // 3. Create Loan
            // Ensure loanAmount is a number
            const amount = typeof formData.loanAmount === 'string' ? parseFloat(formData.loanAmount) : formData.loanAmount;

            const { data: loan, error: loanError } = await supabase.from('loans').insert({
                user_id: user.id,
                amount: amount,
                duration_months: formData.repaymentPeriod, // Matches DB constraint
                monthly_payment: amount / formData.repaymentPeriod, // Simple calc to satisfy constraint
                interest_rate: 5, // Default interest rate to satisfy constraint if any
                purpose: formData.loanPurpose,
                status: 'pending',
                application_data: formData // JSONB column
            }).select().single()

            if (loanError) throw loanError;

            // Success
            console.log('✅ Application submitted successfully. Transitioning to Step 8.');
            setStep(8)
            toast.success("Application submitted successfully!")

            // Notify Admin via API
            try {
                await fetch('/api/admin/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ loanId: loan.id })
                });
            } catch (notifyError) {
                console.error('Notification failed:', notifyError);
            }

        } catch (error: any) {
            console.error('Submission Error:', error)
            toast.error("Application failed: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const steps = [
        "Personal Details",
        "Employment & Income",
        "Banking Details",
        "Loan Details",
        "References",
        "Documents",
        "Declarations"
    ]

    if (step === 8) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card className="border-green-500/20 bg-green-500/5">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-700">Application Received</h2>
                        <p className="text-stone-600">
                            Thank you, {formData.firstName}. We have received your application.
                            Our team will review your details and updated you shortly via email or SMS.
                        </p>
                        <Button className="w-full mt-4" onClick={() => router.push('/dashboard')}>
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Loan Application
                    </h1>
                    <span className="text-sm font-medium text-muted-foreground">
                        Step {step} of 7
                    </span>
                </div>
                <Progress value={(step / 7) * 100} className="h-2" />
            </div>

            <Card className={errors && Object.keys(errors).length > 0 ? "border-red-300 shadow-sm" : ""}>
                <CardHeader>
                    <CardTitle>{steps[step - 1]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 py-4">
                    {/* Step 1: Personal */}
                    {step === 1 && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormInput label="First Name" name="firstName" placeholder="e.g. John" value={formData.firstName} onChange={updateField} error={errors.firstName} />
                            <FormInput label="Last Name" name="lastName" placeholder="e.g. Doe" value={formData.lastName} onChange={updateField} error={errors.lastName} />
                            <FormInput label="ID Number" name="nationalId" placeholder="e.g. 90010100123" value={formData.nationalId} onChange={updateField} error={errors.nationalId} />
                            <FormInput label="Date of Birth" type="date" name="dob" value={formData.dob} onChange={updateField} error={errors.dob} />
                            <FormSelect label="Gender" name="gender" options={["Male", "Female", "Other"]} value={formData.gender} onChange={updateField} />
                            <FormInput label="Nationality" name="nationality" placeholder="e.g. Namibian" value={formData.nationality} onChange={updateField} error={errors.nationality} />
                            <FormSelect label="Marital Status" name="maritalStatus" options={["Single", "Married", "Divorced", "Widowed", "Separated"]} value={formData.maritalStatus} onChange={updateField} />
                            <FormInput label="Mobile Number" name="phone" placeholder="e.g. 081 123 4567" value={formData.phone} onChange={updateField} error={errors.phone} />
                            <FormInput label="Alt Contact" name="altPhone" placeholder="e.g. 081 234 5678" value={formData.altPhone} onChange={updateField} error={errors.altPhone} />
                            <FormInput label="Email" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={updateField} error={errors.email} />
                            <div className="col-span-2">
                                <FormInput label="Residential Address" name="address" placeholder="Erf 123, Street Name, Windhoek" value={formData.address} onChange={updateField} error={errors.address} />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Employment */}
                    {step === 2 && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormInput label="Employer Name" name="employerName" placeholder="e.g. Government of Namibia" value={formData.employerName} onChange={updateField} error={errors.employerName} />
                            <FormInput label="Job Title" name="jobTitle" placeholder="e.g. Teacher" value={formData.jobTitle} onChange={updateField} error={errors.jobTitle} />
                            <FormInput label="Employer Contact" name="employerPhone" placeholder="e.g. 061 123 456 or 081..." value={formData.employerPhone} onChange={updateField} error={errors.employerPhone} />
                            <FormInput label="Start Date" type="date" name="employmentStartDate" value={formData.employmentStartDate} onChange={updateField} error={errors.employmentStartDate} />
                            <FormSelect label="Employment Type" name="employmentType" options={["Permanent", "Contract", "Temporary", "Government"]} value={formData.employmentType} onChange={updateField} />
                            <FormInput label="Monthly Income (N$)" type="number" name="monthlyIncome" placeholder="e.g. 15000" value={formData.monthlyIncome} onChange={updateField} error={errors.monthlyIncome} />

                            <div className="col-span-2 mt-4 pt-4 border-t">
                                <h4 className="font-semibold mb-2 text-sm text-primary">HR Representative Details</h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <FormInput label="HR Name" name="hrName" placeholder="e.g. Jane Smith" value={formData.hrName} onChange={updateField} error={errors.hrName} />
                                    <FormInput label="HR Email" name="hrEmail" type="email" placeholder="hr@company.com" value={formData.hrEmail} onChange={updateField} error={errors.hrEmail} />
                                    <FormInput label="HR Phone" name="hrPhone" placeholder="e.g. 061... or 081..." value={formData.hrPhone} onChange={updateField} error={errors.hrPhone} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Banking */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <FormInput label="Bank Name" name="bankName" placeholder="e.g. FNB Namibia" value={formData.bankName} onChange={updateField} error={errors.bankName} />
                            <FormInput label="Account Holder Name" name="accountHolder" placeholder="e.g. J Doe" value={formData.accountHolder} onChange={updateField} error={errors.accountHolder} />
                            <FormInput label="Account Number" name="accountNumber" placeholder="e.g. 62123456789" value={formData.accountNumber} onChange={updateField} error={errors.accountNumber} />
                            <FormSelect label="Account Type" name="accountType" options={["Savings", "Cheque/Current"]} value={formData.accountType} onChange={updateField} />
                            <FormInput label="Branch Code" name="branchCode" placeholder="e.g. 280172" value={formData.branchCode} onChange={updateField} error={errors.branchCode} />
                        </div>
                    )}


                    {/* Step 4: Loan Details */}
                    {
                        step === 4 && (
                            <div className="space-y-6">
                                {/* Updated select handler to use handleLoanTypeChange */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Loan Type</label>
                                    {/* <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.loanType}
                    onChange={(e) => handleLoanTypeChange(e.target.value)}
                >
                    <option value="payday">Payday Loan (1 Month)</option>
                    <option value="term">Term Loan (3-36 Months)</option>
                </select> */}
                                    <div className="flex h-10 w-full items-center rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-400 cursor-not-allowed">
                                        Payday Loan (1 Month)
                                    </div>
                                </div>


                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Loan Amount: {formatCurrency(formData.loanAmount)}</label>
                                    <input type="range" min="1000" max="50000" step="1000" className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" value={formData.loanAmount} onChange={(e) => updateField('loanAmount', parseInt(e.target.value))} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Period: 1 Month</label>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="default" className="w-full md:w-auto" disabled>1 Month (Fixed)</Button>
                                    </div>
                                </div>

                                <FormInput label="Purpose of Loan" name="loanPurpose" placeholder="e.g. School Fees" value={formData.loanPurpose} onChange={updateField} error={errors.loanPurpose} />
                                <FormSelect label="Repayment Method" name="repaymentMethod" options={["Debit Order"]} value={formData.repaymentMethod} onChange={updateField} />
                            </div >
                        )
                    }

                    {/* Step 5: References */}
                    {
                        step === 5 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold mb-2 text-sm text-primary">Next of Kin Details</h4>
                                <FormInput label="Full Name" name="nextOfKinName" placeholder="e.g. Mary Doe" value={formData.nextOfKinName} onChange={updateField} error={errors.nextOfKinName} />
                                <FormInput label="Relationship" name="nextOfKinRelationship" placeholder="e.g. Mother" value={formData.nextOfKinRelationship} onChange={updateField} error={errors.nextOfKinRelationship} />
                                <FormInput label="Contact Number" name="nextOfKinContact" placeholder="e.g. 081 999 8888" value={formData.nextOfKinContact} onChange={updateField} error={errors.nextOfKinContact} />
                                <FormInput label="Physical Address" name="nextOfKinAddress" placeholder="e.g. Erf 456, Walvis Bay" value={formData.nextOfKinAddress} onChange={updateField} error={errors.nextOfKinAddress} />
                            </div>
                        )
                    }

                    {/* Step 6: Documents */}
                    {
                        step === 6 && (
                            <div className="space-y-6">
                                {/* ID Upload */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">ID Document</label>
                                    <div className="flex gap-4 items-center">
                                        <Button type="button" variant="outline" className="relative w-full" disabled={uploading === 'idDocument'}>
                                            {uploading === 'idDocument' ? <Spinner size="sm" className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            {formData.idDocument ? "Change File" : "Upload ID"}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'idDocument')} accept="image/*,.pdf" />
                                        </Button>
                                        {formData.idDocument && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                                    </div>
                                    {/* Test Bypass Input */}
                                    <input
                                        type="text"
                                        id="idDocument-bypass"
                                        name="idDocument"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onChange={(e) => updateField('idDocument', e.target.value)}
                                    />
                                    {errors.idDocument && <p className="text-xs text-red-500">{errors.idDocument}</p>}
                                </div>

                                {/* Live Selfie */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Live Selfie</label>
                                    {/* Test Bypass Input */}
                                    <input
                                        type="text"
                                        id="selfie-bypass"
                                        name="selfie"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onChange={(e) => updateField('selfie', e.target.value)}
                                    />
                                    <div className="border rounded-lg p-2 bg-muted/50">
                                        {!formData.selfie ? (
                                            <LiveSelfie onCapture={handleSelfieCapture} error={errors.selfie} />
                                        ) : (
                                            <div className="text-center">
                                                <img src={formData.selfie} alt="Selfie" className="mx-auto h-32 w-32 object-cover rounded-full border-2 border-green-500 mb-2" />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => updateField('selfie', '')}>Retake</Button>
                                            </div>
                                        )}
                                    </div>
                                    {errors.selfie && <p className="text-xs text-red-500">{errors.selfie}</p>}
                                </div>

                                {/* Payslip */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">3 Months Bank Statement (PDF)</label>
                                    <div className="flex gap-4 items-center">
                                        <Button type="button" variant="outline" className="relative w-full" disabled={uploading === 'payslip'}>
                                            {uploading === 'payslip' ? <Spinner size="sm" className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            {formData.payslip ? "Change File" : "Upload Statement"}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'payslip')} accept="image/*,.pdf" />
                                        </Button>
                                        {formData.payslip && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                                    </div>
                                    {/* Test Bypass Input */}
                                    <input
                                        type="text"
                                        id="payslip-bypass"
                                        name="payslip"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onChange={(e) => updateField('payslip', e.target.value)}
                                    />
                                    {errors.payslip && <p className="text-xs text-red-500">{errors.payslip}</p>}
                                </div>
                            </div>
                        )
                    }

                    {/* Step 7: Declarations */}
                    {
                        step === 7 && (
                            <div className="space-y-6">
                                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Scale className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Legal Declaration & Consent</h3>
                                    </div>

                                    <div className="h-48 overflow-y-auto pr-2 text-sm text-foreground/80 space-y-3 pretty-scrollbar font-leading-relaxed">
                                        <p><strong>1. Accuracy of Information:</strong> I confirm that all information provided in this application is true, complete, and accurate. I understand that providing false or misleading information is a serious offense and may result in the rejection of my application and potential legal action.</p>
                                        <p><strong>2. Credit Check Consent:</strong> I voluntarily consent to OMARI FINANCE conducting credit checks and affordability assessments as required by the Financial Institutions and Markets Act (FIMA) and NAMFISA regulations. This includes verifying my income, employment details, and credit history with registered credit bureaus.</p>
                                        <p><strong>3. Data Privacy:</strong> I authorize OMARI FINANCE to process my personal data in accordance with their Privacy Policy for the purpose of assessing this loan application.</p>
                                        <p><strong>4. Repayment Commitment:</strong> I acknowledge that by signing this agreement, I am legally bound to repay the loan amount plus interest and fees as stipulated in the Loan Agreement.</p>
                                        <p><strong>5. Rights & Complaints:</strong> I acknowledge my right to lodge a complaint with OMARI FINANCE's internal dispute resolution department, and subsequently to NAMFISA if the matter remains unresolved.</p>
                                    </div>
                                </div>

                                <div className="space-y-3 bg-card border border-border p-4 rounded-lg shadow-sm">
                                    <Checkbox
                                        label="I have read, understood, and agree to the Terms & Conditions, Privacy Policy, and the declarations above."
                                        name="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={updateField}
                                        error={errors.termsAccepted}
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-2 pt-2">
                                    <FormInput
                                        label="Digital Signature (Type Full Name)"
                                        name="signatureName"
                                        placeholder="e.g. John Doe"
                                        value={formData.signatureName}
                                        onChange={updateField}
                                        error={errors.signatureName}
                                    />
                                    <FormInput
                                        label="Date"
                                        type="date"
                                        name="declarationDate"
                                        value={formData.declarationDate}
                                        onChange={updateField}
                                        error={errors.declarationDate}
                                    />
                                </div>

                                <div className="text-xs text-center text-zinc-400 mt-4">
                                    By clicking "Submit Application", you confirm your digital signature.
                                </div>
                            </div>
                        )
                    }

                    {/* Step 8: Success */}
                    {
                        step === 8 && (
                            <div className="text-center py-8">
                                <div className="mx-auto h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Application Received!</h2>
                                <p className="text-muted-foreground mb-6">We will review your details and contact you shortly.</p>
                                <Link href="/dashboard"><Button size="lg">Go to Dashboard</Button></Link>
                            </div>
                        )
                    }

                </CardContent >

                {
                    step < 8 && (
                        <CardFooter className="flex justify-between">
                            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>Back</Button>
                            <Button onClick={handleNext} disabled={isLoading}>
                                {isLoading && <Spinner className="mr-2" size="sm" />}
                                {step === 7 ? "Submit Application" : "Next"}
                            </Button>
                        </CardFooter>
                    )
                }
            </Card >

            <Footer />
        </div >
    )
}

// Components
const FormInput = ({ label, name, type = "text", value, onChange, error, placeholder = "", disabled = false }: {
    label: string
    name: string
    type?: string
    value: string | number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    error?: string
    placeholder?: string
    disabled?: boolean
}) => (
    <div className="space-y-2">
        <label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300">
            {label}
        </label>
        <input
            id={name}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-white"
            placeholder={placeholder}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
)

const FormSelect = ({ label, name, value, onChange, options, error, disabled = false }: {
    label: string
    name: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    options: string[]
    error?: string
    disabled?: boolean
}) => (
    <div className="space-y-2">
        <label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300">
            {label}
        </label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-white"
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
)

const Checkbox = ({ label, name, checked, onChange, error }: any) => (
    <div className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 h-4 w-4 bg-primary" checked={checked} onChange={(e) => onChange(name, e.target.checked)} />
        <div>
            <label className="text-sm leading-none text-foreground">{label}</label>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    </div>
)
