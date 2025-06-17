# Playwright E2E Tests

This directory contains end-to-end tests for the Arcadia platform using Playwright.

## Structure

```
tests/
├── fixtures/          # Test fixtures and authentication helpers
├── helpers/          # Utility functions and test data
├── smoke/            # Basic smoke tests for critical features
├── auth/             # Authentication flow tests (to be added)
├── features/         # Feature-specific tests (to be added)
└── visual/           # Visual regression tests (to be added)
```

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run only Chrome tests
npm run test:e2e:chrome

# View test report
npm run test:e2e:report
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { waitForNetworkIdle, checkAccessibility } from '../helpers/test-utils';
import { TEST_USERS, SELECTORS } from '../helpers/test-data';

test('example with helpers', async ({ page }) => {
  await page.goto('/');
  await waitForNetworkIdle(page);
  
  const accessibility = await checkAccessibility(page);
  expect(accessibility.passed).toBe(true);
});
```

### Using Authentication Fixture

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('authenticated user test', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
});
```

## Best Practices

1. **Use semantic locators**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for stability**: Use `waitForNetworkIdle` or `waitForLoadState` before assertions
3. **Test user journeys**: Focus on complete user flows rather than individual elements
4. **Handle flakiness**: Use proper waits and retries for dynamic content
5. **Keep tests independent**: Each test should be able to run in isolation

## Environment Variables

Tests use the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for test user creation)
- `NEXT_PUBLIC_APP_URL`: Application URL (defaults to http://localhost:3000)

## CI/CD

Tests run automatically on:
- Push to main branch
- Pull requests

The CI workflow:
1. Starts the Next.js dev server
2. Runs type checks
3. Executes Playwright tests
4. Uploads test reports and artifacts

## Debugging Failed Tests

1. **Local debugging**: Run `npm run test:e2e:debug` to open Playwright Inspector
2. **CI failures**: Check the uploaded artifacts in GitHub Actions
3. **Screenshots**: Failed tests automatically capture screenshots in `test-results/`
4. **Traces**: Enable traces with `--trace on` for detailed debugging

## Next Steps

- [ ] Add authentication flow tests
- [ ] Add feature-specific tests (bingo boards, community)
- [ ] Set up visual regression tests
- [ ] Add performance testing
- [ ] Integrate accessibility testing tools