-- Add application_data column to loans table to store full questionnaire
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS application_data JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN loans.application_data IS 'Stores the full loan application questionnaire responses (Personal, Employment, Banking, References, Consents)';
