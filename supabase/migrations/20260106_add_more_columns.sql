
-- Add remaining missing columns

-- Add 'term_months' to loans table (integer)
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS term_months INTEGER;

-- Add 'updated_at' to verifications table (timestamptz)
ALTER TABLE verifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload schema cache to ensure API picks up changes immediately
NOTIFY pgrst, 'reload schema';
