-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g. 'VERIFICATION_PASSED', 'LOAN_APPROVED'
    actor_id UUID REFERENCES auth.users(id), -- Nullable for system actions? Or use system user?
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can read all logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'admin_verifier', 'admin_approver')
    );

-- System/Server functions can insert (RLS bypassed on server usually, but good to have)
-- If we use service role key, RLS is bypassed.
-- For client-side inserts (if any), we need policy. But audits should be server-side only.

-- Grant access
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT ON audit_logs TO authenticated; -- Restricted by RLS
