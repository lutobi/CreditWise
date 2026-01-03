-- Admin Policies for CreditWise

-- 1. Verifications Table
-- Allow Admins to View ALL Verifications
CREATE POLICY "Admins can view all verifications" ON verifications
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Allow Admins to Update ALL Verifications (e.g. for scoring)
CREATE POLICY "Admins can update all verifications" ON verifications
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );


-- 2. Loans Table
-- Allow Admins to View ALL Loans
CREATE POLICY "Admins can view all loans" ON loans
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Allow Admins to Update ALL Loans (Approve/Reject)
CREATE POLICY "Admins can update all loans" ON loans
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 3. Profiles Table (Optional but good for viewing names)
-- Allow Admins to View ALL Profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
