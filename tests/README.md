# Automated Testing with Playwright

## Overview
This project uses [Playwright](https://playwright.dev/) for end-to-end (E2E) testing. Tests automatically verify that all features work correctly without manual intervention.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in UI mode (recommended for development)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### View test report
```bash
npm run test:report
```

## Test Coverage

### ✅ Authentication Tests (`tests/e2e/auth.spec.ts`)
- Signup form validation
- Password strength requirements
- Email verification flow
- Login validation
- Forgot password flow

### ✅ Loan Calculator Tests (`tests/e2e/calculator.spec.ts`)
- Term Loan vs Payday Loan toggle
- Amount slider functionality
- Duration slider functionality
- Monthly payment calculations
- APR display
- Navigation to signup

### ✅ Navigation Tests (`tests/e2e/navigation.spec.ts`)
- Navbar state for logged in/out users
- Section navigation (Features, How it Works)
- Protected route redirects
- Page navigation flows

### ⚠️ Loan Application Tests (`tests/e2e/loan-application.spec.ts`)
- Multi-step form validation
- Personal details validation
- Employment details validation
- Loan details selection
- Submission flow

**Note:** Loan application tests require authenticated sessions. These are placeholder tests that need auth setup.

## Writing New Tests

1. Create a new file in `tests/e2e/`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/your-page');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

2. Run tests:
```bash
npm run test:ui
```

## Test Configuration

See `playwright.config.ts` for configuration options:
- **Base URL:** `http://localhost:3000`
- **Browser:** Chromium (Chrome)
- **Screenshots:** Captured on failure
- **Traces:** Captured on first retry

## CI/CD Integration

Tests are configured to run in CI environments with:
- 2 retries on failure
- Single worker (no parallelization)
- Automatic server startup

## Troubleshooting

### Tests timing out
- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev server is running

### Element not found
- Use Playwright Inspector: `npx playwright test --debug`
- Check selectors with: `npx playwright codegen http://localhost:3000`

### Authentication required
- Some tests need authenticated sessions
- Future: Set up test fixtures with pre-authenticated state

## Best Practices

1. **Use semantic locators:** `getByRole`, `getByLabel`, `getByText`
2. **Wait for elements:** Always use `await expect().toBeVisible()`
3. **Isolate tests:** Each test should be independent
4. **Clean up:** Don't leave test data in database
5. **Screenshots:** Automatically captured on failure

## Next Steps

- [ ] Add authenticated test fixtures
- [ ] Add visual regression testing
- [ ] Add API testing for Supabase endpoints
- [ ] Add performance testing
- [ ] Add accessibility testing
