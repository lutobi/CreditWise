-- Supabase Storage Bucket Setup Instructions
-- ============================================
-- 
-- This file contains the SQL and instructions for setting up the 'documents' storage bucket
-- in Supabase for secure document uploads.
--
-- MANUAL STEPS REQUIRED:
-- ----------------------
-- 1. Go to your Supabase Dashboard: https://app.supabase.com
-- 2. Navigate to Storage section
-- 3. Click "New Bucket"
-- 4. Bucket name: documents
-- 5. Set as PRIVATE (not public)
-- 6. Click "Create bucket"
--
-- After creating the bucket, run the following SQL in the SQL Editor:

-- Storage policies for the 'documents' bucket
-- These policies ensure users can only access their own documents

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- File organization structure:
-- documents/
--   ├── {user_id}/
--   │   ├── national_id_front.{ext}
--   │   ├── national_id_back.{ext}
--   │   ├── payslip_{timestamp}.{ext}
--   │   └── proof_of_residence.{ext}

-- Allowed file types (configure in bucket settings):
-- - application/pdf
-- - image/jpeg
-- - image/png
-- - image/jpg

-- Max file size: 5MB (5,242,880 bytes)
