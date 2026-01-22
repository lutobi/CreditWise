
-- Create Repayments Table
CREATE TABLE IF NOT EXISTS repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    method TEXT NOT NULL, -- 'cash', 'bank_transfer', 'direct_debit'
    reference TEXT, -- e.g. 'POP-123'
    created_by UUID REFERENCES auth.users(id), -- Admin who logged it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;

-- Policies for Repayments
-- Admins can do everything
CREATE POLICY "Admins can view all repayments"
    ON repayments FOR SELECT
    USING (
        auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'admin_verifier', 'admin_approver')
    );

CREATE POLICY "Admins can insert repayments"
    ON repayments FOR INSERT
    WITH CHECK (
        auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'admin_verifier', 'admin_approver')
    );

-- User can view their own repayments (via loan_id link)
CREATE POLICY "Users can view own repayments"
    ON repayments FOR SELECT
    USING (
        loan_id IN (
            SELECT id FROM loans WHERE user_id = auth.uid()
        )
    );
