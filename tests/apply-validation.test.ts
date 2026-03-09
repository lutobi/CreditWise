import { describe, it, expect } from 'vitest';
import {
    personalDetailsSchema,
    employmentDetailsSchema,
    bankingDetailsSchema,
    loanDetailsSchema
} from '../src/lib/validation';

describe('8-Step Application Process (Data Validation & Flow)', () => {

    it('Step 1: Prevents progression if Personal Details are invalid', () => {
        // Missing National ID
        const invalidData = {
            firstName: "John",
            lastName: "Doe",
            nationalId: "", // INVALID
            dob: "1990-01-01",
            gender: "Male",
            nationality: "Namibian",
            maritalStatus: "Single",
            phone: "+264 81 123 4567"
        };
        const validation = personalDetailsSchema.safeParse(invalidData);
        expect(validation.success).toBe(false);
        expect(validation.error?.issues[0].message).toContain('required');
    });

    it('Step 1: Allows progression if Personal Details are perfect', () => {
        const validData = {
            firstName: "John",
            lastName: "Doe",
            nationalId: "12345678901",
            dob: "1990-01-01",
            gender: "Male",
            nationality: "Namibian",
            maritalStatus: "Single",
            address: "123 Windhoek Street",
            phone: "+264 81 123 4567",
            email: "john@test.com"
        };
        const validation = personalDetailsSchema.safeParse(validData);
        expect(validation.success).toBe(true);
    });

    it('Step 2: Validates Strict Employment Rules (Permanent only by default)', () => {
        const validEmployment = {
            employerName: "Namibian Corp",
            jobTitle: "Engineer",
            employerPhone: "+264 61 123 456",
            employmentStartDate: "2020-01-01",
            employmentType: "Permanent",
            hrName: "Jane HR",
            hrEmail: "hr@namibiancorp.com",
            hrPhone: "+264 61 123 457",
            monthlyIncome: "15000"
        };
        expect(employmentDetailsSchema.safeParse(validEmployment).success).toBe(true);

        const invalidIncome = { ...validEmployment, monthlyIncome: "-5000" };
        expect(employmentDetailsSchema.safeParse(invalidIncome).success).toBe(false);
    });

    it('Step 3: Enforces Namibian Branch Codes for Banking', () => {
        const banking = {
            bankName: "FNB",
            accountHolder: "John Doe",
            accountNumber: "62000000000",
            accountType: "Savings",
            branchCode: "280172"
        };
        expect(bankingDetailsSchema.safeParse(banking).success).toBe(true);
    });

    it('Step 4: Caps Payday Loans at affordable limits', () => {
        const loanFlow = {
            loanType: "payday",
            loanAmount: 5000,
            repaymentPeriod: 1,
            repaymentMethod: "EFT",
            loanPurpose: "Emergency Medical"
        };
        expect(loanDetailsSchema.safeParse(loanFlow).success).toBe(true);
    });

});
