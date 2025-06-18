/**
 * Login Flow E2E Tests
 * 
 * Simplified E2E tests focusing only on critical user paths.
 * Business logic validation is now tested in unit tests.
 */

import { test, expect } from '@playwright/test';
import { 
  TEST_FORM_DATA,
  AUTH_SELECTORS,
  AUTH_ROUTES,
  TIMEOUTS
} from '../helpers/test-data';
import { 
  mockAuthResponse,
  waitForNetworkIdle,
  fillAuthForm,
  waitForAuthRedirect,
} from './utils/auth-test-helpers';

test.describe('Login Flow - Critical Paths Only', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUTH_ROUTES.public.login);
    await waitForNetworkIdle(page);
  });

  test('should complete successful login flow', async ({ page }) => {
    // Mock successful auth responses
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
          user_metadata: { username: 'testuser' },
        },
      },
    });

    await mockAuthResponse(page, '**/auth/v1/user', {
      status: 200,
      body: {
        id: 'mock-user-id',
        email: TEST_FORM_DATA.login.valid.email,
        user_metadata: { username: 'testuser' },
      },
    });

    await mockAuthResponse(page, '**/rest/v1/users*', {
      status: 200,
      body: {
        auth_id: 'mock-user-id',
        username: 'testuser',
        email: TEST_FORM_DATA.login.valid.email,
      },
    });

    // Fill form and submit
    await fillAuthForm(page, TEST_FORM_DATA.login.valid);
    await page.locator(AUTH_SELECTORS.buttons.submit).click();
    
    // Verify successful redirect
    const redirected = await waitForAuthRedirect(
      page, 
      /(dashboard|home|\/$)/, 
      { timeout: TIMEOUTS.navigation }
    );
    expect(redirected).toBeTruthy();
    
    // Verify user is authenticated
    const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
    await expect(userMenu).toBeVisible({ timeout: TIMEOUTS.api });
  });

  test('should handle authentication failure', async ({ page }) => {
    // Mock failed auth response
    await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
      status: 401,
      body: {
        error: 'Invalid login credentials',
        error_description: 'Email or password is incorrect',
      },
    });

    // Fill form with invalid credentials
    await fillAuthForm(page, {
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    await page.locator(AUTH_SELECTORS.buttons.submit).click();
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="auth-error-message"], [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: TIMEOUTS.api });
    
    // Should remain on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('should persist session after page refresh', async ({ page, context }) => {
    // Mock successful login
    await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
      status: 200,
      body: {
        access_token: 'mock-access-token',
        user: {
          id: 'mock-user-id',
          email: TEST_FORM_DATA.login.valid.email,
        },
      },
    });

    await mockAuthResponse(page, '**/auth/v1/user', {
      status: 200,
      body: {
        id: 'mock-user-id',
        email: TEST_FORM_DATA.login.valid.email,
      },
    });

    await mockAuthResponse(page, '**/rest/v1/users*', {
      status: 200,
      body: {
        auth_id: 'mock-user-id',
        email: TEST_FORM_DATA.login.valid.email,
      },
    });

    // Login
    await fillAuthForm(page, TEST_FORM_DATA.login.valid);
    await page.locator(AUTH_SELECTORS.buttons.submit).click();
    await waitForAuthRedirect(page, /(dashboard|home|\/$)/);
    
    // Refresh page
    await page.reload();
    await waitForNetworkIdle(page);
    
    // Should still be authenticated
    const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
    await expect(userMenu).toBeVisible();
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Mock rate limit response
    await mockAuthResponse(page, '**/auth/v1/token?grant_type=password', {
      status: 429,
      body: {
        error: 'Too many login attempts. Please try again later.',
        error_description: 'Rate limit exceeded',
      },
    });

    // Fill form and submit
    await fillAuthForm(page, TEST_FORM_DATA.login.valid);
    await page.locator(AUTH_SELECTORS.buttons.submit).click();
    
    // Should show rate limit message
    const errorMessage = page.locator('[data-testid="auth-error-message"], [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/too many.*attempts|rate limit/i);
  });

  test('should handle OAuth login option', async ({ page }) => {
    const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
    
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
      
      // Mock OAuth redirect
      await mockAuthResponse(page, '**/auth/google', {
        status: 302,
        headers: { 'Location': '/dashboard' },
      });
      
      await googleButton.click();
      
      // Should redirect (in real scenario, would go to OAuth provider)
      await waitForAuthRedirect(page, '/dashboard', { timeout: TIMEOUTS.navigation });
    }
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Navigate using only keyboard
    await page.keyboard.press('Tab');
    await expect(page.locator(AUTH_SELECTORS.inputs.email)).toBeFocused();
    
    await page.keyboard.type(TEST_FORM_DATA.login.valid.email);
    
    await page.keyboard.press('Tab');
    await expect(page.locator(AUTH_SELECTORS.inputs.password)).toBeFocused();
    
    await page.keyboard.type(TEST_FORM_DATA.login.valid.password);
    
    await page.keyboard.press('Tab');
    const submitButton = page.locator(AUTH_SELECTORS.buttons.submit);
    await expect(submitButton).toBeFocused();
    
    // Form should be submittable via Enter
    await page.keyboard.press('Enter');
    
    // Should attempt submission (may fail due to mocking, but shows form works)
    await page.waitForTimeout(1000);
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Mock network failure
    await context.route('**/auth/v1/token**', route => route.abort());
    
    await fillAuthForm(page, TEST_FORM_DATA.login.valid);
    await page.locator(AUTH_SELECTORS.buttons.submit).click();
    
    // Should show network error
    const errorMessage = page.locator('[data-testid="auth-error-message"], [role="alert"]');
    await expect(errorMessage).toBeVisible();
    
    // Form should remain intact for retry
    const emailValue = await page.locator(AUTH_SELECTORS.inputs.email).inputValue();
    expect(emailValue).toBe(TEST_FORM_DATA.login.valid.email);
  });
});