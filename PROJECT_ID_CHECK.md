# Project ID Verification Guide

## Current Configuration

Your `.env.local` shows:
- Project URL: `https://oqufncrgcdevqeiglmgj.supabase.co`
- Project ID: **oqufncrgcdevqeiglmgj**

## How to Find Your Correct Project ID

1. **Look at your screenshot URL** - The URL in your browser should look like:
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/files
   ```

2. **Or check in Supabase Dashboard**:
   - Go to https://app.supabase.com
   - Click on your CreditWise project
   - Go to Settings → API
   - Look for "Project URL" - it will be: `https://YOUR_PROJECT_ID.supabase.co`
   - Look for "Project API keys" - copy the **anon public** key

## Steps to Fix

1. **Find the URL from your screenshot** or dashboard
2. **Extract the Project ID** (the part before `.supabase.co`)
3. **Update `.env.local`** with the correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_CORRECT_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_correct_anon_key_here
```

4. **Restart the dev server**:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

5. **Verify**:
```bash
node tests/list-buckets.js
```

## What to Check

- [ ] Screenshot URL contains a project ID
- [ ] That project ID matches `.env.local`
- [ ] The anon key is from the same project
- [ ] Dev server restarted after changes

---

**What's the project ID in your screenshot URL?**
