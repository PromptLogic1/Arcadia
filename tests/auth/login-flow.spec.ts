/**
 * Login Flow E2E Tests
 * 
 * Tests user login journey with proper page object pattern usage.
 * Focuses on user interactions, not business logic.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/auth/login.page';
import { 
  mockAuthResponse,
  waitForNetworkIdle,
  checkAuthAccessibility,
  measureAuthPerformance,
  getAuthCookies,
  checkXSSExecution
} from './utils/auth-test-helpers';
import { 
  TEST_FORM_DATA,
  AUTH_ROUTES,
  XSS_PAYLOADS,
  RATE_LIMITS,
  SESSION_TIMEOUTS,
  TIMEOUTS
} from '../helpers/test-data';
import type { LoginResponse, AuthErrorResponse } from './types/test-types';

test.describe('Login Flow - User Journey', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Successful Login Journey', () => {
    test('user can login with valid credentials', async ({ page }) => {
      // Mock successful auth response
      await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
        status: 200,
        body: {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-user-id',
            email: TEST_FORM_DATA.login.valid.email,
            user_metadata: {
              username: 'testuser',
              avatar_url: null,
            },
          },
        } satisfies LoginResponse,
      });

      // Mock user data fetch
      await mockAuthResponse(page, '**/auth/v1/user', {
        status: 200,
        body: {
          id: 'mock-user-id',
          email: TEST_FORM_DATA.login.valid.email,
          user_metadata: {
            username: 'testuser',
            avatar_url: null,
          },
        },
      });

      // User action: Fill and submit login form
      await loginPage.fillLoginForm(
        TEST_FORM_DATA.login.valid.email,
        TEST_FORM_DATA.login.valid.password
      );
      
      await loginPage.submitLogin();
      
      // Verify: User is redirected and logged in
      await loginPage.waitForSuccessfulLogin();
      
      const isLoggedIn = await loginPage.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    test('user session persists after page refresh', async ({ page, context }) => {
      // Setup mocks
      await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
        status: 200,
        body: {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-user-id',
            email: TEST_FORM_DATA.login.valid.email,
            user_metadata: {
              username: 'testuser',
              avatar_url: null,
            },
          },
        } satisfies LoginResponse,
      });

      await mockAuthResponse(page, '**/auth/v1/user', {
        status: 200,
        body: {
          id: 'mock-user-id',
          email: TEST_FORM_DATA.login.valid.email,
          user_metadata: {
            username: 'testuser',
            avatar_url: null,
          },
        },
      });

      // User journey: Login
      await loginPage.login(
        TEST_FORM_DATA.login.valid.email,
        TEST_FORM_DATA.login.valid.password
      );
      
      await loginPage.waitForSuccessfulLogin();
      
      // Verify session cookie exists
      const { sessionCookie } = await getAuthCookies(context);
      expect(sessionCookie).toBeDefined();
      
      // User action: Refresh page
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Verify: Still logged in
      const isStillLoggedIn = await loginPage.isLoggedIn();
      expect(isStillLoggedIn).toBe(true);
    });

    test('remember me keeps user logged in longer', async ({ page, context }) => {
      // Setup mocks
      await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
        status: 200,
        body: {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-user-id',
            email: TEST_FORM_DATA.login.valid.email,
            user_metadata: {
              username: 'testuser',
              avatar_url: null,
            },
          },
        } satisfies LoginResponse,
      });

      // User journey: Login with remember me
      await loginPage.login(
        TEST_FORM_DATA.login.valid.email,
        TEST_FORM_DATA.login.valid.password,
        true // remember me
      );
      
      await loginPage.waitForSuccessfulLogin();
      
      // Verify: Cookie has extended expiration
      const { sessionCookie } = await getAuthCookies(context);
      
      if (sessionCookie?.expires) {
        const expirationTime = sessionCookie.expires * 1000;
        const now = Date.now();
        const timeDifference = expirationTime - now;
        
        // Should be close to remember me timeout
        expect(timeDifference).toBeGreaterThan(SESSION_TIMEOUTS.rememberMe - 1000 * 60 * 60);
        expect(timeDifference).toBeLessThan(SESSION_TIMEOUTS.rememberMe + 1000 * 60 * 60);
      }
    });
  });

  test.describe('Form Validation Journey', () => {
    test('user sees validation errors for empty fields', async () => {
      // User action: Try to submit empty form
      const isButtonEnabled = await loginPage.isSubmitButtonEnabled();
      expect(isButtonEnabled).toBe(false);
      
      // User action: Enter and clear email to trigger validation
      await loginPage.fillLoginForm('a', '');
      await loginPage.clearForm();
      await loginPage.blurField('email');
      
      // Verify: Email validation error shown
      const emailError = await loginPage.getValidationError('email');
      expect(emailError).toMatch(/email.*required/i);
      
      // User action: Enter and clear password
      await loginPage.focusField('password');
      await loginPage.fillInput('[data-testid="password-input"]', 'a');
      await loginPage.getLocator('[data-testid="password-input"]').clear();
      await loginPage.blurField('password');
      
      // Verify: Password validation error shown
      const passwordError = await loginPage.getValidationError('password');
      expect(passwordError).toMatch(/password.*required/i);
    });

    test('user sees error for invalid email format', async () => {
      // User action: Enter invalid email
      await loginPage.fillLoginForm('invalid-email', 'ValidPassword123!');
      await loginPage.blurField('email');
      
      // Wait for validation
      await loginPage.page.waitForTimeout(300);
      
      // User action: Try to submit
      await loginPage.submitLogin();
      
      // Verify: Error message shown
      const error = await loginPage.getErrorMessage();
      expect(error).toBeTruthy();
      expect(error).toMatch(/valid email|invalid/i);
    });

    test('user sees error for wrong credentials', async () => {
      // User journey: Try to login with wrong credentials
      await loginPage.login('wrong@example.com', 'wrongpassword');
      
      // Wait for error response
      await loginPage.page.waitForTimeout(2000);
      
      // Verify: Error message shown
      const error = await loginPage.getErrorMessage();
      expect(error).toBeTruthy();
      expect(error).toMatch(/invalid|error|failed|incorrect/i);
      
      // Verify: Form data preserved for retry
      const formValues = await loginPage.getFormValues();
      expect(formValues.email).toBe('wrong@example.com');
    });
  });

  test.describe('Security Journey', () => {
    test('form is protected against XSS attacks', async () => {
      // Test each XSS payload
      for (const payload of XSS_PAYLOADS.slice(0, 3)) { // Test first 3 payloads
        await loginPage.fillLoginForm(payload, 'password');
        await loginPage.submitLogin();
        
        // Verify: Script not executed
        const xssExecuted = await checkXSSExecution(loginPage.page);
        expect(xssExecuted).toBe(false);
        
        // Clean up for next test
        await loginPage.clearForm();
      }
    });

    test('rate limiting prevents brute force attacks', async ({ page }) => {
      const maxAttempts = RATE_LIMITS.login.attempts;
      
      // Mock rate limit response
      let attemptCount = 0;
      await page.route(AUTH_ROUTES.api.login, async route => {
        attemptCount++;
        
        if (attemptCount > maxAttempts) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too many login attempts. Please try again later.',
              code: 'rate_limit_exceeded',
              statusCode: 429,
            } satisfies AuthErrorResponse),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid credentials',
              code: 'invalid_credentials',
              statusCode: 401,
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // User journey: Multiple failed login attempts
      for (let i = 0; i <= maxAttempts; i++) {
        await loginPage.login('test@example.com', `wrongpassword${i}`);
        await page.waitForTimeout(500);
      }
      
      // Verify: Rate limit error shown
      const error = await loginPage.getErrorMessage();
      expect(error).toContain('Too many login attempts');
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('user can retry after network error', async ({ page, context }) => {
      // Mock network failure
      await context.route(AUTH_ROUTES.api.login, route => route.abort());
      
      // User journey: Try to login
      await loginPage.login(
        TEST_FORM_DATA.login.valid.email,
        TEST_FORM_DATA.login.valid.password
      );
      
      // Verify: Network error shown
      const error = await loginPage.getErrorMessage();
      expect(error).toMatch(/network.*error|connection.*failed|unable.*connect/i);
      
      // Verify: Form data preserved
      const formValues = await loginPage.getFormValues();
      expect(formValues.email).toBe(TEST_FORM_DATA.login.valid.email);
    });

    test('user sees friendly error for server issues', async ({ page }) => {
      // Mock server error
      await mockAuthResponse<AuthErrorResponse>(page, AUTH_ROUTES.api.login, {
        status: 500,
        body: {
          error: 'Internal Server Error',
          code: 'internal_error',
          statusCode: 500,
        },
      });
      
      // User journey: Try to login
      await loginPage.login(
        TEST_FORM_DATA.login.valid.email,
        TEST_FORM_DATA.login.valid.password
      );
      
      // Verify: Friendly error shown
      const error = await loginPage.getErrorMessage();
      expect(error).toMatch(/something.*wrong|server.*error|try.*again/i);
    });
  });

  test.describe('Accessibility Journey', () => {
    test('user can navigate form with keyboard only', async () => {
      const { page } = loginPage;
      
      // User journey: Tab through form
      await page.keyboard.press('Tab');
      const emailFocused = await page.locator('[data-testid="email-input"]').evaluate(el => el === document.activeElement);
      expect(emailFocused).toBe(true);
      
      await page.keyboard.type(TEST_FORM_DATA.login.valid.email);
      
      await page.keyboard.press('Tab');
      const passwordFocused = await page.locator('[data-testid="password-input"]').evaluate(el => el === document.activeElement);
      expect(passwordFocused).toBe(true);
      
      await page.keyboard.type(TEST_FORM_DATA.login.valid.password);
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip remember me if present
      
      // Submit with Enter
      await page.keyboard.press('Enter');
      await loginPage.waitForSuccessfulLogin();
    });

    test('form meets accessibility standards', async () => {
      const result = await checkAuthAccessibility(loginPage.page);
      
      // Should have minimal violations
      expect(result.violations.length).toBeLessThan(3);
      
      // Critical violations should be zero
      const criticalViolations = result.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations.length).toBe(0);
    });
  });

  test.describe('Performance', () => {
    test('login form loads quickly', async () => {
      const loadTime = await measureAuthPerformance(loginPage.page, async () => {
        await loginPage.goto();
      });
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('login process completes quickly', async () => {
      const loginTime = await measureAuthPerformance(loginPage.page, async () => {
        await loginPage.login(
          TEST_FORM_DATA.login.valid.email,
          TEST_FORM_DATA.login.valid.password
        );
        await loginPage.waitForSuccessfulLogin();
      });
      
      // Should complete within 3 seconds
      expect(loginTime).toBeLessThan(3000);
    });
  });
});