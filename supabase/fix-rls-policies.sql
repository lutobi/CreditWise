DROP POLICY IF EXISTS "Users can insert own verification." ON verifications;
DROP POLICY IF EXISTS "Users can update own verification." ON verifications;
DROP POLICY IF EXISTS "Users can view own verification." ON verifications;

CREATE POLICY "Users can view own verification." ON verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification." ON verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification." ON verifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own loans." ON loans;

CREATE POLICY "Users can insert own loans." ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
