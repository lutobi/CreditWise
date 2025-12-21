# Quick Storage Bucket Setup

## Step 1: Create the Bucket

1. Go to https://app.supabase.com
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Enter bucket name: `documents`
6. **Important**: Set as **Private** (uncheck "Public bucket")
7. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

1. Click on the `documents` bucket you just created
2. Go to **Policies** tab
3. Click **"New Policy"**
4. Click **"For full customization"**
5. Paste this policy for INSERT:

```sql
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

6. Repeat for SELECT, UPDATE, DELETE policies (see storage-setup.sql)

## Step 3: Verify Setup

Run this command to verify:
```bash
npm run verify:storage
```

You should see:
```
✅ Storage bucket 'documents' exists
✅ Storage is ready!
```

Done! Your document upload system is now fully functional.
