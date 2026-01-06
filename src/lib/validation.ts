import { z } from 'zod'

// Signup validation schema
export const signupSchema = z.object({
    fullName: z.string()
        .trim()
        .min(3, 'Full name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

// Login validation schema
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

// Password reset request schema
export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
})

// Password reset schema
export const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

// Loan application validation schemas

// Section 1: Personal Details
export const personalDetailsSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    nationalId: z.string().min(5, 'Valid National ID is required'),
    dob: z.string().min(1, 'Date of birth is required'),
    gender: z.enum(['Male', 'Female', 'Other']),
    nationality: z.string().min(2, 'Nationality is required'),
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Separated']),
    address: z.string().min(5, 'Residential address is required'),
    phone: z.string().regex(/^(\+?264|0)\s?\d{2}\s?\d{3}\s?\d{4}$/, 'Invalid Namibian phone number'),
    altPhone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
})

// Section 2: Employment & Income
export const employmentDetailsSchema = z.object({
    employerName: z.string().min(2, 'Employer name is required'),
    jobTitle: z.string().min(2, 'Job title is required'),
    employerPhone: z.string().min(5, 'Employer contact number is required'),
    employmentStartDate: z.string().min(1, 'Start date is required'),
    employmentType: z.enum(['Permanent', 'Contract', 'Temporary', 'Government']),
    hrName: z.string().min(2, 'HR Representative name is required'),
    hrEmail: z.string().email('Valid HR email is required'),
    hrPhone: z.string().min(5, 'HR contact number is required'),
    monthlyIncome: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Valid income is required'),
})

// Section 3: Banking Details
export const bankingDetailsSchema = z.object({
    bankName: z.string().min(2, 'Bank name is required'),
    accountHolder: z.string().min(2, 'Account holder name is required'),
    accountNumber: z.string().min(5, 'Account number is required'),
    accountType: z.enum(['Savings', 'Cheque/Current']),
    branchCode: z.string().min(3, 'Branch code is required'),
})

// Section 4: Loan Details
export const loanDetailsSchema = z.object({
    loanType: z.enum(['payday', 'term']),
    loanAmount: z.number().min(1000).max(50000),
    repaymentPeriod: z.number().min(1).max(36),
    loanPurpose: z.string().min(5, 'Please specify the purpose of the loan'),
    repaymentMethod: z.enum(['Debit Order', 'EFT', 'Cash Deposit']),
})

// Section 7: References (Skipping 5/6 numbering to match user prompt logic, but mapping to logical steps)
export const referencesSchema = z.object({
    nextOfKinName: z.string().min(2, 'Next of kin name is required'),
    nextOfKinRelationship: z.string().min(2, 'Relationship is required'),
    nextOfKinContact: z.string().min(5, 'Contact number is required'),
    nextOfKinAddress: z.string().min(5, 'Physical address is required'),
})

// Documents (Existing)
export const documentUploadSchema = z.object({
    idDocument: z.string().min(1, 'ID Document is required'),
    payslip: z.string().min(1, 'Payslip is required'),
    selfie: z.string().min(1, 'Live Selfie is required'),
})

// Section 8: Declarations
export const declarationSchema = z.object({
    termsAccepted: z.literal(true, { message: 'You must review and accept the terms and conditions' }),
    signatureName: z.string().min(2, 'Please type your full name as signature'),
    declarationDate: z.string().min(1, 'Date is required'),
})

// Type exports
export type SignupFormData = z.infer<typeof signupSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>
export type EmploymentDetailsFormData = z.infer<typeof employmentDetailsSchema>
export type BankingDetailsFormData = z.infer<typeof bankingDetailsSchema>
export type LoanDetailsFormData = z.infer<typeof loanDetailsSchema>
export type ReferencesFormData = z.infer<typeof referencesSchema>
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>
export type DeclarationFormData = z.infer<typeof declarationSchema>
