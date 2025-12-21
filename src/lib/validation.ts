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
export const personalDetailsSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    nationalId: z.string().min(5, 'Valid National ID is required'),
    phone: z.string().regex(/^\+?264\s?\d{2}\s?\d{3}\s?\d{4}$/, 'Invalid Namibian phone number'),
})

export const employmentDetailsSchema = z.object({
    employerName: z.string().min(2, 'Employer name is required'),
    monthlyIncome: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Valid income is required'),
    employmentType: z.string().min(1, 'Employment type is required'),
})

export const loanDetailsSchema = z.object({
    loanAmount: z.number().min(1000).max(50000),
    repaymentPeriod: z.number().min(1).max(36),
})

export const documentUploadSchema = z.object({
    idDocument: z.string().min(1, 'ID Document is required'),
    payslip: z.string().min(1, 'Payslip is required'),
})

// Type exports
export type SignupFormData = z.infer<typeof signupSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type PersonalDetailsFormData = z.infer<typeof personalDetailsSchema>
export type EmploymentDetailsFormData = z.infer<typeof employmentDetailsSchema>
export type LoanDetailsFormData = z.infer<typeof loanDetailsSchema>
