-- Add employment_type column to verifications table
ALTER TABLE verifications 
ADD COLUMN IF NOT EXISTS employment_type text;

-- Optional: Update existing records if any (default to 'Unknown' or similar if needed)
-- UPDATE verifications SET employment_type = 'Unknown' WHERE employment_type IS NULL;
