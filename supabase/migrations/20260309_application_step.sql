
-- Add application_step column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'application_step') THEN
        ALTER TABLE public.profiles ADD COLUMN application_step integer DEFAULT 0;
    END IF;
END $$;
