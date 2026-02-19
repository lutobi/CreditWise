-- ========================================================
-- Phase 3: Supabase RLS Hardening & Audit Fixes
-- ========================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Go to your Supabase SQL Editor.
-- 3. Run the script.
-- 4. This will close PII leaks and enable secure user interaction.

BEGIN;

-- 1. SECURE PUBLIC PROFILES
-- Currently, anyone can view all profiles (including PII).
-- This closes that leak and only allows users to see their own profile.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can view own profile." ON profiles;

CREATE POLICY "Users can view own profile." ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to see all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
    OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
  );


-- 2. FIX VERIFICATIONS PERMISSIONS
-- Allow users to submit and update their own verifications.
DROP POLICY IF EXISTS "Users can insert own verification." ON verifications;
DROP POLICY IF EXISTS "Users can update own verification." ON verifications;
DROP POLICY IF EXISTS "Users can view own verification." ON verifications;

CREATE POLICY "Users can view own verification." ON verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification." ON verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification." ON verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to view and update verifications
CREATE POLICY "Admins can select all verifications" ON verifications
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
    OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
  );

CREATE POLICY "Admins can update all verifications" ON verifications
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
    OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
  );


-- 3. ENSURE ROBUST LOAN POLICIES
DROP POLICY IF EXISTS "Admins can select all loans" ON loans;
DROP POLICY IF EXISTS "Admins can update all loans" ON loans;

CREATE POLICY "Admins can select all loans" ON loans
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
    OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
  );

CREATE POLICY "Admins can update all loans" ON loans
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
    OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'admin_verifier', 'admin_approver'))
  );


-- 4. STORAGE BUCKET PERMISSIONS (Documents)
-- Ensure only owners and admins can access documents bucket
-- These usually go in the storage schema or are managed via the UI, 
-- but here is the SQL for the documents bucket.
-- Note: 'storage.objects' is the table for files.

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all storage documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND (
      (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
      OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin'))
    )
  );

COMMIT;
