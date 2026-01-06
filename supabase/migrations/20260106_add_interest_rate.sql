
-- Add missing 'interest_rate' column to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
