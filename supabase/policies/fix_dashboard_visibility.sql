-- Enable RLS on loans table
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- DROP EXISTING POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Users can create own loans" ON loans;
DROP POLICY IF EXISTS "Users can update own loans" ON loans;

-- Allow Users to View their OWN loans
CREATE POLICY "Users can view own loans" 
ON loans FOR SELECT 
USING (auth.uid() = user_id);

-- Allow Users to Insert their OWN loans
CREATE POLICY "Users can create own loans" 
ON loans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow Users to Update their OWN loans (e.g. submitting retakes, application data)
CREATE POLICY "Users can update own loans" 
ON loans FOR UPDATE 
USING (auth.uid() = user_id);

-- Verify Verifications RLS
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications" ON verifications;

CREATE POLICY "Users can view own verifications" 
ON verifications FOR SELECT 
USING (auth.uid() = user_id);


-- FIX AUDIT LOGS VISIBILITY
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audits" ON audit_logs;

-- Link audit logs to loans to check ownership (Subquery)
CREATE POLICY "Users can view own audits" 
ON audit_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM loans 
        WHERE loans.id = audit_logs.loan_id 
        AND loans.user_id = auth.uid()
    )
);
