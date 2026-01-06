
-- Add missing columns to support full application data

-- Add 'purpose' to loans table if it doesn't exist
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add 'employment_status' to verifications table if it doesn't exist
ALTER TABLE verifications 
ADD COLUMN IF NOT EXISTS employment_status TEXT;

-- Verify columns (optional, for manual check)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'loans';
