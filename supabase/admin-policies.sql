-- Allow Admins to View All Loans
CREATE POLICY "Admins can select all loans" ON loans
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver')
  );

-- Allow Admins to Update Loans (for status changes)
CREATE POLICY "Admins can update all loans" ON loans
  FOR UPDATE USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver')
  );

-- Allow Admins to View All Verifications (needed for Queues)
CREATE POLICY "Admins can select all verifications" ON verifications
  FOR SELECT USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver')
  );

-- Allow Admins to Update Verifications (e.g. invalidating/flagging)
CREATE POLICY "Admins can update all verifications" ON verifications
  FOR UPDATE USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver')
  );
