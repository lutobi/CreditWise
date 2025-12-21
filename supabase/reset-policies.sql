-- Reset and fix ALL policies for verifications and loans
-- Run this to ensure a clean slate for permissions

-- 1. Verifications Table
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own verification" ON verifications;
DROP POLICY IF EXISTS "Users can update own verification" ON verifications;
DROP POLICY IF EXISTS "Users can view own verification" ON verifications;
DROP POLICY IF EXISTS "Users can delete own verification" ON verifications;

CREATE POLICY "Users can view own verification" ON verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification" ON verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification" ON verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Loans Table
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own loans" ON loans;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;

CREATE POLICY "Users can view own loans" ON loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Profiles Table (Just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
