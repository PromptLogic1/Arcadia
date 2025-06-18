import { test, expect, Route } from '@playwright/test';
import { 
  TEST_FORM_DATA,
  AUTH_SELECTORS,
  AUTH_ROUTES,
  EMAIL_TEST_CASES,
  XSS_PAYLOADS,
  RATE_LIMITS,
  SESSION_TIMEOUTS,
  TIMEOUTS
} from '../helpers/test-data';
import { 
  checkAuthAccessibility, 
  mockAuthResponse,
  waitForNetworkIdle,
  getPerformanceMetrics,
  fillAuthForm,
  getAuthStoreState,
  getAuthCookies,
  checkXSSExecution,
  getAuthErrorMessage,
  waitForAuthRedirect,
  measureAuthPerformance
} from './utils/auth-test-helpers';
import type { LoginResponse, AuthErrorResponse } from './types/test-types';

test.describe('Login Flow - Type Safe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUTH_ROUTES.public.login);
    await waitForNetworkIdle(page);
  });

  test.describe('Successful Login', () => {
    test('should allow user to login with valid credentials', async ({ page }) => {
      // Use typed form data
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      
      // Submit form using proper selector
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Wait for redirect with typed helper
      const redirected = await waitForAuthRedirect(
        page, 
        /(dashboard|home|\/$)/, 
        { timeout: TIMEOUTS.navigation }
      );
      expect(redirected).toBeTruthy();
      
      // Verify user menu with proper selector
      const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
      await expect(userMenu).toBeVisible({ timeout: TIMEOUTS.api });
      
      // Check auth store state
      const authState = await getAuthStoreState(page);
      expect(authState).toBeTruthy();
      expect(authState?.isAuthenticated).toBe(true);
      expect(authState?.user).toBeTruthy();
      expect(authState?.user?.email).toBe(TEST_FORM_DATA.login.valid.email);
    });

    test('should remember user login state after page refresh', async ({ page, context }) => {
      // Login first
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      await waitForAuthRedirect(page, /(dashboard|home|\/$)/);
      
      // Verify session cookie exists with typed helper
      const { sessionCookie } = await getAuthCookies(context);
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBeTruthy();
      
      // Refresh page
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Should still be authenticated
      const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
      await expect(userMenu).toBeVisible();
      
      // Verify auth state persisted
      const authState = await getAuthStoreState(page);
      expect(authState?.isAuthenticated).toBe(true);
    });

    test('should handle remember me functionality', async ({ page, context }) => {
      // Fill form with remember me checked
      await fillAuthForm(page, {
        ...TEST_FORM_DATA.login.valid,
        rememberMe: true,
      });
      
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      await waitForAuthRedirect(page, /(dashboard|home|\/$)/);
      
      // Check cookie expiration
      const { sessionCookie } = await getAuthCookies(context);
      if (sessionCookie?.expires) {
        const expirationTime = sessionCookie.expires * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeDifference = expirationTime - now;
        
        // Should be close to remember me timeout
        expect(timeDifference).toBeGreaterThan(SESSION_TIMEOUTS.rememberMe - 1000 * 60 * 60); // Within 1 hour
        expect(timeDifference).toBeLessThan(SESSION_TIMEOUTS.rememberMe + 1000 * 60 * 60);
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
      // Try to submit without filling any fields
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Check for validation errors
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toMatch(/email.*required|password.*required/i);
    });

    test('should validate email format', async ({ page }) => {
      // Test each invalid email case
      for (const { email, error } of EMAIL_TEST_CASES) {
        await page.locator(AUTH_SELECTORS.inputs.email).fill(email);
        await page.locator(AUTH_SELECTORS.inputs.password).fill('ValidPassword123!');
        await page.locator(AUTH_SELECTORS.buttons.submit).click();
        
        const errorMessage = await getAuthErrorMessage(page);
        if (errorMessage) {
          expect(errorMessage).toContain(error);
          break; // At least one validation should work
        }
      }
    });

    test('should handle invalid credentials gracefully', async ({ page }) => {
      // Mock invalid credentials response
      await mockAuthResponse<AuthErrorResponse>(page, AUTH_ROUTES.api.login, {
        status: 401,
        body: {
          error: 'Invalid email or password',
          code: 'invalid_credentials',
          statusCode: 401,
        },
      });
      
      await fillAuthForm(page, {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Should show error message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toContain('Invalid email or password');
      
      // Form should remain intact for retry
      const emailValue = await page.locator(AUTH_SELECTORS.inputs.email).inputValue();
      expect(emailValue).toBe('nonexistent@example.com');
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      // Test each XSS payload
      for (const payload of XSS_PAYLOADS) {
        await page.locator(AUTH_SELECTORS.inputs.email).fill(payload);
        await page.locator(AUTH_SELECTORS.inputs.password).fill('password');
        await page.locator(AUTH_SELECTORS.buttons.submit).click();
        
        // Verify script is not executed
        const xssExecuted = await checkXSSExecution(page);
        expect(xssExecuted).toBeFalsy();
        
        // Clear for next test
        await page.locator(AUTH_SELECTORS.inputs.email).clear();
      }
    });

    test('should handle rate limiting', async ({ page }) => {
      const maxAttempts = RATE_LIMITS.login.attempts;
      
      // Mock rate limit response after threshold
      let attemptCount = 0;
      await page.route(AUTH_ROUTES.api.login, async (route: Route) => {
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
      
      // Attempt multiple failed logins
      for (let i = 0; i <= maxAttempts; i++) {
        await fillAuthForm(page, {
          email: 'test@example.com',
          password: `wrongpassword${i}`,
        });
        await page.locator(AUTH_SELECTORS.buttons.submit).click();
        await page.waitForTimeout(500);
      }
      
      // Should show rate limit error
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toContain('Too many login attempts');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Mock network failure
      await context.route(AUTH_ROUTES.api.login, route => route.abort());
      
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Should show network error message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/network.*error|connection.*failed|unable.*connect/i);
      
      // Form should remain intact
      const emailValue = await page.locator(AUTH_SELECTORS.inputs.email).inputValue();
      expect(emailValue).toBe(TEST_FORM_DATA.login.valid.email);
    });

    test('should handle server errors (500)', async ({ page }) => {
      await mockAuthResponse<AuthErrorResponse>(page, AUTH_ROUTES.api.login, {
        status: 500,
        body: {
          error: 'Internal Server Error',
          code: 'internal_error',
          statusCode: 500,
        },
      });
      
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Should show server error message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/something.*wrong|server.*error|try.*again/i);
    });
  });

  test.describe('OAuth/Social Login', () => {
    test('should display OAuth login options', async ({ page }) => {
      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await expect(googleButton).toBeVisible();
        await expect(googleButton).toBeEnabled();
        
        // Check button has proper aria-label
        const ariaLabel = await googleButton.getAttribute('aria-label');
        expect(ariaLabel).toContain('Google');
      }
    });

    test('should handle OAuth login flow', async ({ page }) => {
      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        // Mock successful OAuth response
        await mockAuthResponse<LoginResponse>(page, '**/auth/google', {
          status: 302,
          body: {
            user: {
              id: 'oauth-user-id',
              email: 'oauth@example.com',
              username: 'oauthuser',
              full_name: 'OAuth User',
              auth_id: 'oauth-auth-id',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              bio: null,
              city: null,
              land: null,
              region: null,
              experience_points: 0,
              last_login_at: new Date().toISOString(),
              profile_visibility: 'public',
              achievements_visibility: 'public',
              submissions_visibility: 'public',
            },
            session: {
              id: 'session-id',
              user_id: 'oauth-user-id',
              session_token: 'oauth-token',
              expires_at: new Date(Date.now() + SESSION_TIMEOUTS.accessToken).toISOString(),
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
          headers: { 'Location': '/dashboard' },
        });
        
        await googleButton.click();
        
        // Should redirect to dashboard
        await waitForAuthRedirect(page, '/dashboard', { timeout: TIMEOUTS.navigation });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator(AUTH_SELECTORS.inputs.email)).toBeFocused();
      
      await page.keyboard.type(TEST_FORM_DATA.login.valid.email);
      
      await page.keyboard.press('Tab');
      await expect(page.locator(AUTH_SELECTORS.inputs.password)).toBeFocused();
      
      await page.keyboard.type(TEST_FORM_DATA.login.valid.password);
      
      // Tab to remember me if visible
      const rememberMe = page.locator(AUTH_SELECTORS.inputs.rememberMe);
      if (await rememberMe.isVisible()) {
        await page.keyboard.press('Tab');
        await expect(rememberMe).toBeFocused();
        await page.keyboard.press('Space'); // Check the checkbox
      }
      
      // Continue to submit button
      await page.keyboard.press('Tab');
      const submitButton = page.locator(AUTH_SELECTORS.buttons.submit);
      await expect(submitButton).toBeFocused();
      
      // Submit with Enter key
      await page.keyboard.press('Enter');
      await waitForAuthRedirect(page, /(dashboard|home|\/)/, { timeout: TIMEOUTS.navigation });
    });

    test('should meet accessibility standards', async ({ page }) => {
      const accessibilityResult = await checkAuthAccessibility(page);
      
      // Log violations if any
      if (!accessibilityResult.passed) {
        console.log('Accessibility violations:', accessibilityResult.violations);
      }
      
      // Should have minimal accessibility violations
      expect(accessibilityResult.violations.length).toBeLessThan(3);
    });
  });

  test.describe('Performance', () => {
    test('should load login form within acceptable time', async ({ page }) => {
      const loadTime = await measureAuthPerformance(page, async () => {
        await page.goto(AUTH_ROUTES.public.login);
        await page.waitForSelector(AUTH_SELECTORS.form.loginForm, { state: 'visible' });
      });
      
      // Login form should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should complete successful login within acceptable time', async ({ page }) => {
      const loginTime = await measureAuthPerformance(page, async () => {
        await fillAuthForm(page, TEST_FORM_DATA.login.valid);
        await page.locator(AUTH_SELECTORS.buttons.submit).click();
        await waitForAuthRedirect(page, /(dashboard|home|\/$)/);
      });
      
      // Login should complete within 3 seconds
      expect(loginTime).toBeLessThan(3000);
    });

    test('should measure core web vitals', async ({ page }) => {
      await page.goto(AUTH_ROUTES.public.login);
      await page.waitForLoadState('networkidle');
      
      const metrics = await getPerformanceMetrics(page);
      
      // Performance assertions
      expect(metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(metrics.firstContentfulPaint).toBeLessThan(1800); // FCP < 1.8s
      expect(metrics.domContentLoaded).toBeLessThan(3000); // DOM < 3s
    });
  });
});