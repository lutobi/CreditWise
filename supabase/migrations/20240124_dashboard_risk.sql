-- Migration: 20240124_dashboard_risk
-- Description: Fix RLS for Dashboard visibility and add Risk Indices

-- 1. Fix RLS: Allow Users to View ALL their own loans (including Rejected/Paid)
-- First, drop restrictive policy if it exists (names vary, we try standard ones)
DROP POLICY IF EXISTS "Users can view active loans" ON loans;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;

-- Create comprehensive policy
CREATE POLICY "Users can view own loans"
ON loans FOR SELECT
USING (auth.uid() = user_id);

-- 2. Performance Index for Dashboard
-- Dashboard filters by user_id and sorts by created_at
CREATE INDEX IF NOT EXISTS idx_loans_user_created ON loans(user_id, created_at DESC);

-- 3. Performance Index for Verification Queue (Admins)
-- Queue filters by status (pending, under_review)
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- 4. Audit Logs Table (Idempotent check)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Enable RLS on Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
        auth.users.raw_app_meta_data->>'role' IN ('admin', 'admin_verifier', 'admin_approver', 'super_admin')
        OR auth.users.raw_user_meta_data->>'role' IN ('admin', 'admin_verifier', 'admin_approver', 'super_admin')
    )
  )
);

-- Admins (Service Role) can insert logs (Implicit, but good to note)
-- No user insert policy needed as users don't write audits directly.
