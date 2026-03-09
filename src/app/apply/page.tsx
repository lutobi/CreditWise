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
import { FastTrackWizard } from "@/components/apply/fast-track-wizard"
import { LiveSelfie } from "@/components/ui/live-selfie"
import { toast } from "sonner"
import { sendAdminLoanAlert } from "@/app/actions/email"
import { formatCurrency } from "@/lib/utils"
import { BankSelect } from "@/components/realpay/bank-verification"
import { useAccountVerification, useRealpayFeatures } from "@/lib/realpay-hooks"

export default function ApplyPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [step, setStep] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(false)
    const [uploading, setUploading] = React.useState<string | null>(null)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [existingLoanId, setExistingLoanId] = React.useState<string | null>(null)
    const [capturedSelfiePreview, setCapturedSelfiePreview] = React.useState<string | null>(null)
    const [showPrefillPrompt, setShowPrefillPrompt] = React.useState(false)
    const [useFastTrack, setUseFastTrack] = React.useState(false)
    const [previousLoanData, setPreviousLoanData] = React.useState<any>(null)

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
        loanType: "payday" as "term" | "payday",
        loanAmount: 5000,
        repaymentPeriod: 1,
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
        recentPayslip: "",
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

    // Load draft from LocalStorage on mount (if no existing loan found)
    const [hasActiveLoanError, setHasActiveLoanError] = React.useState(false);

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

                // Calculate if loan is fully paid
                const INTEREST_RATE = 0.25;
                const totalRepayment = latestLoan.amount * (1 + INTEREST_RATE * latestLoan.duration_months);
                const amountPaid = latestLoan.amount_paid || 0;
                const isFullyPaid = amountPaid >= totalRepayment;

                // Allow re-application if loan is fully paid OR rejected OR completed
                if ((latestLoan.status === 'active' || latestLoan.status === 'approved') && !isFullyPaid) {
                    // Show graceful inline error instead of redirecting
                    setHasActiveLoanError(true);
                    return;
                } else if (latestLoan.status === 'pending') {
                    console.log('✅ Found pending loan:', latestLoan.id)
                    toast.info("Resuming your pending application.")
                    setExistingLoanId(latestLoan.id)
                    // ... (rest of details) ...
                } else {
                    // Loan is historical (Paid/Completed/Rejected)
                    if (latestLoan.status === 'rejected') {
                        const daysSince = (new Date().getTime() - new Date(latestLoan.created_at).getTime()) / (1000 * 3600 * 24);
                        if (daysSince < 30) {
                            console.log('⛔ Re-application blocked: Recent rejection');
                            // Use a distinct state for Rejection vs Active
                            setHasActiveLoanError(true);
                            // We will handle the UI logic in render based on 'latestLoan.status'
                            // For simplicity, store the status or rejection flag
                            // Store the status or rejection flag in state correctly
                            setFormData(prev => ({
                                ...prev,
                                verificationData: {
                                    ...(prev.verificationData || {}),
                                    blocked: true,
                                    rejectionReason: latestLoan.application_data?.status_val || "Policy"
                                }
                            }));
                            return;
                        }
                    }

                    // Offer Pre-fill
                    console.log('📜 Found historical loan:', latestLoan.id)
                    try {
                        const parseData = (data: any) => typeof data === 'string' ? JSON.parse(data) : data || {}
                        const appData = parseData(latestLoan.application_data)
                        if (appData && appData.firstName) {
                            setPreviousLoanData(appData)
                            setShowPrefillPrompt(true)
                        }
                    } catch (e) {
                        console.error("Error parsing historical data", e)
                    }
                }
            } else {
                // No existing loan, check for local draft
                const savedDraft = localStorage.getItem('nomad_loan_draft');
                if (savedDraft) {
                    try {
                        const parsedDraft = JSON.parse(savedDraft);
                        // Merge draft with default state to ensure structure integrity
                        setFormData(prev => ({ ...prev, ...parsedDraft }));
                        console.log('📝 Restored draft from local storage');
                    } catch (e) {
                        console.error('Failed to parse draft', e);
                    }
                }
            }
        }
        checkExistingLoan()
    }, [user?.id, router])

    const applyPrefill = () => {
        if (!previousLoanData) return;

        // Filter out sensitive or dynamic fields
        const {
            documents, idDocument, payslip, recentPayslip, selfie,
            loanAmount, repaymentPeriod, loanPurpose,
            confirmTruth, understandLegal, consentAffordability, consentVerification, termsAccepted, declarationDate, signatureName,
            ...safeData
        } = previousLoanData;

        setFormData(prev => ({
            ...prev,
            ...safeData,
            // Ensure defaults for reset fields
            loanAmount: 5000,
            repaymentPeriod: 1,
            confirmTruth: false,
            termsAccepted: false
        }));

        setShowPrefillPrompt(false);
        toast.success("Welcome back! Your details have been pre-filled.");
    }

    // Auto-Save to LocalStorage
    React.useEffect(() => {
        if (formData) {
            const timeoutId = setTimeout(() => {
                localStorage.setItem('nomad_loan_draft', JSON.stringify(formData));
            }, 1000); // Debounce save by 1s
            return () => clearTimeout(timeoutId);
        }
    }, [formData]);

    const updateField = (field: string | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, value?: any) => {
        if (typeof field === 'object' && field !== null && 'target' in field) {
            const target = field.target as HTMLInputElement
            const name = target.name
            const val = target.type === 'checkbox' ? target.checked : target.value

            setFormData(prev => ({ ...prev, [name]: val }))
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

    const handleDocumentAnalysis = async (file: File, documentType: string) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', documentType);

            const result = await fetch('/api/analyze-statement', {
                method: 'POST',
                body: formData
            });
            const data = await result.json();

            if (data.success) {
                console.log(`${documentType} Analysis:`, data);
                updateField('verificationData', data);
                toast.success(`${documentType === 'payslip' ? 'Payslip' : 'Bank Statement'} Verified. Estimated Income: ${formatCurrency(data.estimatedIncome)}`);
            }
        } catch (e) {
            console.error("Analysis Failed", e);
            // We do not block the user, just log it.
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'idDocument' | 'payslip' | 'recentPayslip') => {
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
                handleDocumentAnalysis(file, 'payslip');
            } else if (fieldName === 'recentPayslip') {
                // Determine type based on your business logic; usually recentPayslip is the 3-mon statement in this UI context
                handleDocumentAnalysis(file, 'bank_statement');
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

        // Immediately show preview using local blob URL
        const previewUrl = URL.createObjectURL(file);
        setCapturedSelfiePreview(previewUrl);

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
            // Clear preview on failure
            setCapturedSelfiePreview(null);
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
            const nextStep = step + 1;
            setStep(nextStep)
            setIsLoading(false)

            // Fire-and-forget: track which step the user reached (for drop-off analytics)
            if (user) {
                fetch('/api/track-step', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                    },
                    body: JSON.stringify({ step: nextStep })
                }).catch(() => { }); // Silently ignore errors
            }
            return
        }

        // Submit Application (Step 8 is Success)
        // Submit Application (Step 8 is Success)
        try {
            if (!user) throw new Error("Not authenticated");

            // Read CSRF token from cookie for double-submit pattern
            const csrfToken = document.cookie
                .split(';')
                .map(c => c.trim())
                .find(c => c.startsWith('csrf_token='))
                ?.split('=')
                .slice(1)
                .join('=') || '';

            // We now submit via API to capture IP and User Agent for electronic signature traceability
            const response = await fetch('/api/loans/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'x-csrf-token': csrfToken,
                },
                body: JSON.stringify({
                    ...formData,
                    // Send explicit client user agent as backup
                    clientUserAgent: navigator.userAgent
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Submission failed");
            }

            // Success
            console.log('✅ Application submitted successfully via API. Transitioning to Step 8.');
            setStep(8)
            toast.success("Application submitted successfully!")

            // Clear draft
            localStorage.removeItem('nomad_loan_draft');

        } catch (error: any) {
            console.error('Submission Error:', error)
            toast.error("Application failed: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFastTrackSubmit = async (fastTrackData: any) => {
        try {
            if (!user) throw new Error("Not authenticated");
            const response = await fetch('/api/loans/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(fastTrackData)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Submission failed");

            setStep(8);
            setUseFastTrack(false);
            toast.success("Fast-Track Application submitted successfully!");
            localStorage.removeItem('nomad_loan_draft');
        } catch (error: any) {
            console.error('Fast-Track Submission Error:', error);
            toast.error("Application failed: " + error.message);
        }
    };

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

    // Show active loan error banner
    // Show active loan error banner
    if (hasActiveLoanError) {
        // High Contrast & Logic Check
        const isRejection = formData.verificationData?.blocked;

        if (isRejection) {
            return (
                <div className="container max-w-3xl mx-auto py-8 px-4">
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div>
                                    <CardTitle className="text-lg text-red-800">Application Declined</CardTitle>
                                    <p className="text-sm text-red-600 font-medium">Policy Restriction Active</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-red-700">
                                Your recent application was declined. As per our responsible lending policy, you may re-apply 30 days after your last application date.
                            </p>
                            <Button onClick={() => router.push('/dashboard')} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
                                Return to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return (
            <div className="container max-w-3xl mx-auto py-8 px-4">
                <Card className="border-amber-300 bg-amber-50 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-lg text-amber-900">Active Loan in Progress</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-amber-900 font-medium">
                            You currently have an active loan that hasn't been fully repaid. To apply for a new loan, please complete your current loan repayment first.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => router.push('/dashboard')}
                                className="bg-amber-700 hover:bg-amber-800 text-white border-none"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View My Loan
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/')}
                                className="border-amber-400 text-amber-800 hover:bg-amber-100"
                            >
                                Back to Home
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
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

            {/* Return User Pre-fill Prompt (Only on Step 1) */}
            {step === 1 && showPrefillPrompt && !useFastTrack && (
                <div className="mb-6 bg-omari/10 border border-omari/20 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex gap-3 items-center">
                        <div className="bg-omari/20 p-2 rounded-full">
                            <span className="text-xl">⚡</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-omari-900 dark:text-omari-100">Welcome back, {previousLoanData?.firstName}!</h4>
                            <p className="text-xs text-omari-800 dark:text-omari-200/80">You qualify for a 1-Click Fast-Track loan. Apply in 45 seconds.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-omari-800 dark:text-omari-200" onClick={() => setShowPrefillPrompt(false)}>Standard Application</Button>
                        <Button size="sm" className="bg-omari hover:bg-omari-dark text-white" onClick={() => { setShowPrefillPrompt(false); setUseFastTrack(true); }}>Use Fast-Track</Button>
                    </div>
                </div>
            )}

            {useFastTrack ? (
                <FastTrackWizard
                    previousData={previousLoanData}
                    onSubmit={handleFastTrackSubmit}
                    onCancel={() => { setUseFastTrack(false); setShowPrefillPrompt(true); }}
                />
            ) : (
                <Card className={errors && Object.keys(errors).length > 0 ? "border-red-300 shadow-sm" : ""}>
                    <CardHeader>
                        <CardTitle>{steps[step - 1]}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 py-4">
                        {/* Step 1: Personal */}
                        {step === 1 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput label="First Name" name="firstName" placeholder="e.g. John" value={formData.firstName} onChange={updateField} error={errors.firstName} autoComplete="given-name" />
                                <FormInput label="Last Name" name="lastName" placeholder="e.g. Doe" value={formData.lastName} onChange={updateField} error={errors.lastName} autoComplete="family-name" />
                                <FormInput label="ID Number" name="nationalId" placeholder="e.g. 90010100123" value={formData.nationalId} onChange={updateField} error={errors.nationalId} />
                                <FormInput label="Date of Birth" type="date" name="dob" value={formData.dob} onChange={updateField} error={errors.dob} autoComplete="bday" />
                                <FormSelect label="Gender" name="gender" options={["Male", "Female", "Other"]} value={formData.gender} onChange={updateField} />
                                <FormInput label="Nationality" name="nationality" placeholder="e.g. Namibian" value={formData.nationality} onChange={updateField} error={errors.nationality} autoComplete="country-name" />
                                <FormSelect label="Marital Status" name="maritalStatus" options={["Single", "Married", "Divorced", "Widowed", "Separated"]} value={formData.maritalStatus} onChange={updateField} />
                                <FormInput label="Mobile Number" name="phone" placeholder="e.g. 081 123 4567" value={formData.phone} onChange={updateField} error={errors.phone} autoComplete="tel" />
                                <FormInput label="Alt Contact" name="altPhone" placeholder="e.g. 081 234 5678" value={formData.altPhone} onChange={updateField} error={errors.altPhone} autoComplete="tel" />
                                <FormInput label="Email" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={updateField} error={errors.email} autoComplete="email" />
                                <div className="col-span-2">
                                    <FormInput label="Residential Address" name="address" placeholder="Erf 123, Street Name, Windhoek" value={formData.address} onChange={updateField} error={errors.address} autoComplete="street-address" />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Employment */}
                        {step === 2 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput label="Employer Name" name="employerName" placeholder="e.g. Government of Namibia" value={formData.employerName} onChange={updateField} error={errors.employerName} autoComplete="organization" />
                                <FormInput label="Job Title" name="jobTitle" placeholder="e.g. Teacher" value={formData.jobTitle} onChange={updateField} error={errors.jobTitle} autoComplete="organization-title" />
                                <FormInput label="Employer Contact" name="employerPhone" placeholder="e.g. 061 123 456 or 081..." value={formData.employerPhone} onChange={updateField} error={errors.employerPhone} autoComplete="tel-work" />
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Bank</label>
                                    <BankSelect
                                        value={formData.bankName}
                                        onChange={(bank) => {
                                            updateField('bankName', bank.name)
                                            updateField('branchCode', bank.branchCode)
                                        }}
                                    />
                                    {errors.bankName && <p className="text-xs text-red-500 mt-1">{errors.bankName}</p>}
                                </div>
                                <FormInput label="Account Holder Name" name="accountHolder" placeholder="e.g. J Doe" value={formData.accountHolder} onChange={updateField} error={errors.accountHolder} />
                                <FormInput label="Account Number" name="accountNumber" placeholder="e.g. 62123456789" value={formData.accountNumber} onChange={updateField} error={errors.accountNumber} />
                                <FormSelect label="Account Type" name="accountType" options={["Savings", "Cheque/Current"]} value={formData.accountType} onChange={updateField} />
                                <FormInput label="Branch Code" name="branchCode" placeholder="e.g. 280172" value={formData.branchCode} onChange={updateField} error={errors.branchCode} disabled={!!formData.bankName} />

                                {/* Bank Verification Status */}
                                {formData.verificationData?.bankVerified && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700">Bank account verified successfully</span>
                                    </div>
                                )}
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
                                        <div className="flex h-11 w-full items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-500 cursor-not-allowed">
                                            Payday Loan (1 Month)
                                        </div>
                                    </div>


                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-semibold leading-none text-slate-900">Loan Amount (N$)</label>
                                            <input
                                                type="number"
                                                className="w-24 px-2 py-1 text-right text-lg font-bold border rounded-md"
                                                value={formData.loanAmount}
                                                onChange={(e) => {
                                                    let val = parseInt(e.target.value) || 0;
                                                    if (val > 50000) val = 50000;
                                                    updateField('loanAmount', val);
                                                }}
                                                min="1000" max="50000"
                                            />
                                        </div>
                                        <input type="range" name="loanAmount" min="1000" max="50000" step="50" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" value={formData.loanAmount} onChange={(e) => updateField('loanAmount', parseInt(e.target.value))} />
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>N$ 1,000</span>
                                            <span>N$ 50,000</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold leading-none text-slate-900">Period: 1 Month</label>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" className="w-full md:w-auto border-slate-300 text-slate-500 bg-slate-50" disabled>1 Month (Fixed)</Button>
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
                                            {(!formData.selfie && !capturedSelfiePreview) ? (
                                                <LiveSelfie onCapture={handleSelfieCapture} error={errors.selfie} />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={capturedSelfiePreview || formData.selfie || ''}
                                                            alt="Selfie"
                                                            className="mx-auto h-32 w-32 object-cover rounded-full border-2 border-green-500 mb-2"
                                                        />
                                                        {uploading === 'selfie' && (
                                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                                                <Spinner size="sm" className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-green-600 mb-1">
                                                        {uploading === 'selfie' ? 'Uploading...' : '✓ Captured'}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            updateField('selfie', '');
                                                            setCapturedSelfiePreview(null);
                                                        }}
                                                        disabled={uploading === 'selfie'}
                                                    >
                                                        Retake
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        {errors.selfie && <p className="text-xs text-red-500">{errors.selfie}</p>}
                                    </div>

                                    {/* Bank Statement (Renamed Label) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Recent 3 Months Stamped Bank Statement (PDF)</label>
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

                                    {/* Most Recent Payslip (New Section) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Most Recent Payslip (PDF/Image)</label>
                                        <div className="flex gap-4 items-center">
                                            <Button type="button" variant="outline" className="relative w-full" disabled={uploading === 'recentPayslip'}>
                                                {uploading === 'recentPayslip' ? <Spinner size="sm" className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                                {formData.recentPayslip ? "Change File" : "Upload Payslip"}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'recentPayslip')} accept="image/*,.pdf" />
                                            </Button>
                                            {formData.recentPayslip && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                                        </div>
                                        {/* Test Bypass Input */}
                                        <input
                                            type="text"
                                            id="recentPayslip-bypass"
                                            name="recentPayslip"
                                            className="sr-only"
                                            tabIndex={-1}
                                            onChange={(e) => updateField('recentPayslip', e.target.value)}
                                        />
                                        {errors.recentPayslip && <p className="text-xs text-red-500">{errors.recentPayslip}</p>}
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
                                            <h3 className="text-lg font-semibold text-slate-900">Legal Declaration & Consent</h3>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-900 mb-2">
                                            <p className="font-bold mb-1">Mandatory Acknowledgement:</p>
                                            <p>By proceeding, you explicitly acknowledge that the Loan Agreement has been completed in full <strong>prior to you applying your signature</strong>.</p>
                                        </div>

                                        <div className="h-48 overflow-y-auto pr-2 text-sm text-slate-600 space-y-3 pretty-scrollbar font-leading-relaxed">
                                            <p><strong>1. Financial Terms:</strong> I understand that this is a short-term loan strictly limited to 1 month. The interest rate is fixed at 30%, and penalty interest of 5% per month applies to any arrears (capped at the capital amount).</p>
                                            <p><strong>2. Affordability:</strong> I confirm that I have truthfully disclosed all my financial obligations and that I can afford the total repayment amount without experiencing financial hardship.</p>
                                            <p><strong>3. Authority to Debit:</strong> I hereby authorize OMARI FINANCE to issue debit payment instructions against my bank account for the repayment amount. I understand that I am liable for any bank charges resulting from failed deductions due to insufficient funds.</p>
                                            <p><strong>4. Truth & Accuracy:</strong> I declare that all information provided in this application is true and correct. I understand that providing false information constitutes fraud.</p>
                                            <p><strong>5. Dispute Resolution:</strong> I have been informed of the internal complaint resolution procedures and my right to escalate unresolved complaints to NAMFISA.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-card border border-border p-4 rounded-lg shadow-sm">
                                        <Checkbox
                                            label="I confirm the loan agreement was fully completed before I signed it, and I agree to the Terms & Conditions and Privacy Policy."
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
                                        By clicking "Submit Application", you legally sign this agreement.
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
            )}

            <Footer />
        </div >
    )
}

// Components
const FormInput = ({ label, name, type = "text", value, onChange, error, placeholder = "", disabled = false, autoComplete }: {
    label: string
    name: string
    type?: string
    value: string | number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    error?: string
    placeholder?: string
    disabled?: boolean
    autoComplete?: string
}) => (
    <div className="space-y-2">
        <label htmlFor={name} className="text-sm font-semibold leading-none text-slate-900">
            {label}
        </label>
        <input
            id={name}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            autoComplete={autoComplete}
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
            placeholder={placeholder}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
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
        <label htmlFor={name} className="text-sm font-semibold leading-none text-slate-900">
            {label}
        </label>
        <div className="relative">
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="flex h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
            <ChevronRight className="absolute right-3 top-3 h-4 w-4 rotate-90 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
)

const Checkbox = ({ label, name, checked, onChange, error }: any) => (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
        <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
            checked={checked}
            onChange={(e) => {
                // Return a structure that mimics a standard event so updateField can consume it generically
                // property 'target' with 'name', 'type', 'checked'
                onChange({
                    target: {
                        name: name,
                        type: 'checkbox',
                        checked: e.target.checked,
                        value: e.target.checked ? 'on' : 'off'
                    }
                } as any)
            }}
        />
        <div>
            <label className="text-sm leading-relaxed text-slate-700 font-medium cursor-pointer" onClick={() => {
                onChange({
                    target: {
                        name: name,
                        type: 'checkbox',
                        checked: !checked,
                        value: !checked ? 'on' : 'off'
                    }
                } as any)
            }}>{label}</label>
            {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
        </div>
    </div>
)
