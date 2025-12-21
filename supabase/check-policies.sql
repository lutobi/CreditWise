-- Check all RLS policies on verifications and loans tables

-- Verifications table policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('verifications', 'loans')
ORDER BY tablename, policyname;
