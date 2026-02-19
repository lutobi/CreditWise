-- Loan Payment Management Schema Extension
-- Run this in Supabase SQL Editor

-- 1. Add amount_paid column to loans table (if not exists)
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 2. Add completed_at column to loans table (when fully paid)
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Create loan_payments table for payment history
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'eft', 'direct_debit')),
    reference_number TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_received_at ON loan_payments(received_at);

-- 5. RLS Policies for loan_payments

-- Enable RLS
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Admin can read all payments
-- Admin can read all payments
DROP POLICY IF EXISTS "Admins can read all payments" ON loan_payments;
CREATE POLICY "Admins can read all payments" ON loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'role' IN ('admin', 'super_admin', 'admin_approver')
                OR auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'admin_approver')
            )
        )
    );

-- Admin can insert payments
DROP POLICY IF EXISTS "Admins can insert payments" ON loan_payments;
CREATE POLICY "Admins can insert payments" ON loan_payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_app_meta_data->>'role' IN ('admin', 'super_admin', 'admin_approver')
                OR auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'admin_approver')
            )
        )
    );

-- Users can read their own loan's payments
DROP POLICY IF EXISTS "Users can read own loan payments" ON loan_payments;
CREATE POLICY "Users can read own loan payments" ON loan_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM loans 
            WHERE loans.id = loan_payments.loan_id 
            AND loans.user_id = auth.uid()
        )
    );

-- 6. Grant necessary permissions
GRANT SELECT, INSERT ON loan_payments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
