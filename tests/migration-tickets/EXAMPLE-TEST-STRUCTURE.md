# Example Test Structure

## Unit Test Example

```typescript
// src/features/auth/test/unit/validation.test.ts
import { describe, test, expect } from '@jest/globals';
import { validateEmail, validatePassword } from '../../utils/validation.utils';
import { authSchemas } from '../../types/auth-schemas';

describe('Auth Validation', () => {
  describe('validateEmail', () => {
    test('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    test('should enforce minimum length', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('longenoughpassword')).toBe(true);
    });

    test('should enforce complexity requirements', () => {
      expect(validatePassword('simplepassword')).toBe(false);
      expect(validatePassword('Complex123!')).toBe(true);
    });
  });
});
```

## Integration Test Example

```typescript
// src/features/auth/test/integration/auth-service.test.ts
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { authService } from '../../services/auth.service';
import { createTestUser, cleanupTestUsers } from '../../../test-utils';
import type { LoginCredentials } from '../../types';

describe('Auth Service Integration', () => {
  beforeEach(async () => {
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  describe('login', () => {
    test('should authenticate valid credentials', async () => {
      // Arrange
      const testUser = await createTestUser({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
      expect(result.data?.session).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      // Act
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('invalid_credentials');
    });

    test('should enforce rate limiting', async () => {
      // Arrange
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Act - Make multiple failed attempts
      const attempts = Array.from({ length: 6 }, () => 
        authService.login(credentials)
      );
      const results = await Promise.all(attempts);

      // Assert - Last attempt should be rate limited
      const lastResult = results[results.length - 1];
      expect(lastResult.success).toBe(false);
      expect(lastResult.error?.code).toBe('rate_limit_exceeded');
    });
  });
});
```

## Simplified E2E Test Example

```typescript
// tests/auth/login.spec.ts (AFTER migration)
import { test, expect } from '@playwright/test';
import { createTestUser } from '../helpers/test-utils';

test.describe('Login Flow', () => {
  test('user can login with valid credentials', async ({ page }) => {
    // Arrange
    const testUser = await createTestUser();

    // Act
    await page.goto('/auth/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Assert - Just verify the user journey succeeds
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    // Act
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Assert - Just verify user sees an error
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/auth/login'); // Still on login page
  });
});
```

## Key Differences

### Before (E2E Test with Business Logic)
- Tests email format validation in the browser
- Tests password strength requirements through UI
- Tests rate limiting by making actual API calls
- Tests session timeout by waiting
- 45+ seconds to run

### After (Separated Concerns)
- **Unit Tests**: Test validation logic directly (milliseconds)
- **Integration Tests**: Test service layer with real DB (seconds)
- **E2E Tests**: Test user can complete the journey (15 seconds)

## Benefits
1. **Speed**: Unit tests run in milliseconds vs 45 seconds for E2E
2. **Isolation**: Can test edge cases without UI setup
3. **Debugging**: Failures point to exact logic issues
4. **Maintenance**: Changes to UI don't break logic tests
5. **Coverage**: Can test error cases difficult to trigger via UI