
-- Add missing columns to profiles table
DO $$ 
BEGIN
    -- Address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address text;
    END IF;

    -- Next of Kin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'next_of_kin_name') THEN
        ALTER TABLE public.profiles ADD COLUMN next_of_kin_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'next_of_kin_phone') THEN
        ALTER TABLE public.profiles ADD COLUMN next_of_kin_phone text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'next_of_kin_relation') THEN
        ALTER TABLE public.profiles ADD COLUMN next_of_kin_relation text;
    END IF;

    -- Ensure RLS allows users to update their own profile
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE
        USING (auth.uid() = id);

END $$;
