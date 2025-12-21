# RLS Policy Fix Required

## Issue
The `verifications` table is missing INSERT and UPDATE RLS policies, which is blocking loan application submissions.

## Fix
Run the SQL commands in `supabase/fix-rls-policies.sql` in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/fix-rls-policies.sql`
4. Click **Run**

## What This Fixes
- ✅ Allows authenticated users to insert their own verification records
- ✅ Allows authenticated users to update their own verification records
- ✅ Enables loan application submissions to work correctly

## Verification
After applying the fix, run:
```bash
node tests/verify-submission-permissions.js
```

You should see:
```
✅ Insert into verifications SUCCESS
✅ Insert into loans SUCCESS
```
