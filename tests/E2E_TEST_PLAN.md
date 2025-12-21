# Rigorous End-to-End Testing Plan

## Test Objectives
Verify that all features actually work, not just visually appear correct.

---

## Test 1: File Upload to Supabase Storage

### What to Test
1. Upload a file via `/documents` page
2. Verify file appears in Supabase Storage bucket
3. Verify metadata saved to `documents` table
4. Check file is accessible via signed URL

### Success Criteria
- ✅ File visible in Storage > documents bucket
- ✅ Row exists in documents table with correct user_id
- ✅ File path matches storage location
- ✅ File can be downloaded via signed URL

### SQL Verification Query
```sql
SELECT * FROM documents 
WHERE user_id = '{your_user_id}'
ORDER BY created_at DESC;
```

---

## Test 2: Loan Application Database Write

### What to Test
1. Complete loan application form
2. Verify loan record created in database
3. Check all fields stored correctly
4. Verify status is 'pending'

### Success Criteria
- ✅ Row exists in loans table
- ✅ Amount, duration, monthly_payment correct
- ✅ Status = 'pending'
- ✅ user_id matches authenticated user

### SQL Verification Query
```sql
SELECT * FROM loans 
WHERE user_id = '{your_user_id}'
ORDER BY created_at DESC;
```

---

## Test 3: Loan Calculator Accuracy

### What to Test
Calculate 3 scenarios manually and compare with calculator:

**Scenario A: Term Loan**
- Amount: N$ 10,000
- Duration: 12 months
- Expected calculation:
  - Interest: 10,000 × 0.18 / 12 × 12 = N$ 1,800
  - Initiation fee: 10,000 × 0.15 = N$ 1,500
  - Service fees: N$ 50 × 12 = N$ 600
  - Total: N$ 13,900
  - Monthly: N$ 1,158.33

**Scenario B: Payday Loan**
- Amount: N$ 5,000
- Duration: 3 months
- Expected calculation:
  - Fee: 5,000 × 0.30 = N$ 1,500
  - Total: N$ 6,500
  - Monthly: N$ 2,166.67

**Scenario C: Term Loan (Edge Case)**
- Amount: N$ 50,000 (max)
- Duration: 36 months (max)
- Verify calculation doesn't error

### Success Criteria
- ✅ Calculations match expected values (±N$1 rounding)
- ✅ No errors with edge cases
- ✅ APR displays correctly

---

## Test 4: Authentication & Authorization

### What to Test
1. Access `/documents` without login → should redirect
2. Access `/dashboard` without login → should redirect
3. Try to upload document for another user → should fail
4. Logout and verify session cleared

### Success Criteria
- ✅ Protected routes redirect to /login
- ✅ Cannot access other users' data
- ✅ Logout clears session
- ✅ RLS policies enforced

---

## Test 5: Form Validation

### What to Test
1. Submit signup with weak password → should show error
2. Submit invalid email → should show error
3. Submit loan application with missing fields → should block
4. Upload file >5MB → should reject
5. Upload wrong file type → should reject

### Success Criteria
- ✅ All validation errors display correctly
- ✅ Invalid data doesn't reach database
- ✅ Error messages are clear
- ✅ Forms don't allow invalid submissions

---

## Test 6: Error Handling

### What to Test
1. Network error during upload
2. Supabase connection issue
3. Invalid file upload
4. Duplicate document upload

### Success Criteria
- ✅ Errors display to user
- ✅ App doesn't crash
- ✅ Toast notifications show errors
- ✅ User can retry

---

## Test 7: Automated Tests Verification

### What to Test
1. Run `npm test` and review actual test results
2. Check what the 18 "passing" tests actually verify
3. Identify false positives
4. Fix failing tests

### Success Criteria
- ✅ All tests pass
- ✅ Tests verify actual functionality, not just UI
- ✅ Coverage of critical paths

---

## Verification Checklist

### Database Verification
- [ ] Check Supabase Storage bucket for uploaded files
- [ ] Query documents table for records
- [ ] Query loans table for applications
- [ ] Query profiles table for user data
- [ ] Verify RLS policies work

### Functional Verification
- [ ] File upload saves to Storage
- [ ] Metadata saves to database
- [ ] Calculations are mathematically correct
- [ ] Forms validate properly
- [ ] Protection/auth works correctly

### UI/UX Verification
- [ ] Error messages display
- [ ] Loading states show
- [ ] Success feedback appears
- [ ] Navigation works correctly

---

## Test Execution Order

1. **Setup**: Ensure logged in as test user
2. **Calculator Test**: Verify calculations
3. **Form Validation Test**: Test error scenarios
4. **File Upload Test**: Upload file and verify in Supabase
5. **Loan Application Test**: Submit application and check database
6. **Authorization Test**: Test protected routes
7. **Database Verification**: Run SQL queries
8. **Automated Tests**: Review test suite

---

## Expected Outcomes

### If All Tests Pass
- Confidence: 95%+ that features work correctly
- Ready for production consideration
- Minor bugs may exist but core functionality verified

### If Tests Fail
- Identify specific issues
- Fix bugs
- Re-test
- Document known issues

---

## Test Report Template

```
## Test Results

Date: [DATE]
Tester: [NAME]

### Summary
- Tests Passed: X/Y
- Critical Failures: X
- Minor Issues: X

### Detailed Results
[Test Name]: ✅ PASS / ❌ FAIL
- Details: ...
- Evidence: [Screenshot/SQL Query Result]

### Recommendations
- ...
```
