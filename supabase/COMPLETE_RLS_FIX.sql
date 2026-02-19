-- COMPLETE RLS FIXES FOR NOMAD PINWHEEL
-- This script ensures users can manage their own profiles, verifications, and loans.
-- Apply this in the Supabase SQL Editor.

-----------------------------------------------------------
-- 1. PROFILES TABLE
-----------------------------------------------------------
-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile (during signup/first app)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure update policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-----------------------------------------------------------
-- 2. VERIFICATIONS TABLE
-----------------------------------------------------------
-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Users can view own verification." ON public.verifications;
DROP POLICY IF EXISTS "Users can insert own verification." ON public.verifications;
DROP POLICY IF EXISTS "Users can update own verification." ON public.verifications;

-- View
CREATE POLICY "Users can view own verification." ON public.verifications
    FOR SELECT USING (auth.uid() = user_id);

-- Insert
CREATE POLICY "Users can insert own verification." ON public.verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update
CREATE POLICY "Users can update own verification." ON public.verifications
    FOR UPDATE USING (auth.uid() = user_id);


-----------------------------------------------------------
-- 3. LOANS TABLE
-----------------------------------------------------------
-- Drop existing
DROP POLICY IF EXISTS "Users can view own loans." ON public.loans;
DROP POLICY IF EXISTS "Users can insert own loans." ON public.loans;

-- View
CREATE POLICY "Users can view own loans." ON public.loans
    FOR SELECT USING (auth.uid() = user_id);

-- Insert
CREATE POLICY "Users can insert own loans." ON public.loans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- 4. DOCUMENTS TABLE (Verification)
-----------------------------------------------------------
-- Ensure select is active for the user
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);
