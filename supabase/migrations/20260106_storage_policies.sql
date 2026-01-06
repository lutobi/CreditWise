
-- Enable RLS on storage.objects (good practice, though usually enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow Authenticated Users to Upload Files to 'documents' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documents' );

-- Allow Authenticated Users to View Files in 'documents' bucket
CREATE POLICY "Allow authenticated select"
ON storage.objects
FOR SELECT
TO authenticated
USING ( bucket_id = 'documents' );

-- Allow Public View (if public bucket)
-- CREATE POLICY "Allow public select" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'documents' );
