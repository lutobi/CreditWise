-- Verification Queries for CreditWise Testing
-- Run these in Supabase SQL Editor to verify data

-- 1. Check if user profiles exist
SELECT 
    id,
    email,
    full_name,
    created_at,
    updated_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check documents uploaded
SELECT 
    id,
    user_id,
    document_type,
    file_name,
    file_size,
    mime_type,
    status,
    uploaded_at
FROM documents
ORDER BY uploaded_at DESC;

-- 3. Check loan applications
SELECT 
    id,
    user_id,
    amount,
    duration_months,
    monthly_payment,
    status,
    created_at
FROM loans
ORDER BY created_at DESC;

-- 4. Check verifications
SELECT 
    id,
    user_id,
    employer_name,
    monthly_income,
    credit_score,
    is_employed,
    created_at
FROM verifications
ORDER BY created_at DESC;

-- 5. Get complete user profile with loans and documents
SELECT 
    u.id as user_id,
    u.email,
    p.full_name,
    COUNT(DISTINCT l.id) as total_loans,
    COUNT(DISTINCT d.id) as total_documents,
    v.is_employed,
    v.credit_score
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN loans l ON u.id = l.user_id
LEFT JOIN documents d ON u.id = d.user_id
LEFT JOIN verifications v ON u.id = v.user_id
GROUP BY u.id, u.email, p.full_name, v.is_employed, v.credit_score
ORDER BY u.created_at DESC;

-- 6. Check storage bucket files (need to check via Supabase Dashboard)
-- Go to: Storage > documents bucket
-- Look for folders named with user UUIDs

-- 7. Verify RLS policies are working
-- This query should only show YOUR data when logged in as a user
SELECT * FROM documents WHERE user_id = auth.uid();

-- 8. Check for any errors or failed uploads
SELECT 
    document_type,
    status,
    COUNT(*) as count
FROM documents
GROUP BY document_type, status;
