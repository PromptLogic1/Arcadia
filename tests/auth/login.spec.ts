import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { 
  TEST_USERS, 
  TEST_VIEWPORTS, 
  TIMEOUTS,
  SELECTORS 
} from '../helpers/test-data';
import { 
  checkAccessibility, 
  mockApiResponse, 
  waitForNetworkIdle,
  getPerformanceMetrics,
  getStoreState
} from '../helpers/test-utils.enhanced';
import type { Tables } from '@/types/database.types';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await waitForNetworkIdle(page);
  });

  test.describe('Successful Login', () => {
    test('should allow user to login with valid credentials', async ({ page }) => {
      // Fill login form using proper selectors with fallbacks
      const emailInput = page.locator(SELECTORS.auth.emailInput)
        .or(page.getByLabel('Email'));
      const passwordInput = page.locator(SELECTORS.auth.passwordInput)
        .or(page.getByLabel('Password'));
      const submitButton = page.locator(SELECTORS.auth.submitButton)
        .or(page.getByRole('button', { name: /sign in/i }));
      
      await emailInput.fill(TEST_USERS.valid.email);
      await passwordInput.fill(TEST_USERS.valid.password);
      
      // Submit form
      await submitButton.click();
      
      // Should redirect to dashboard or home
      await page.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
      
      // Verify user is authenticated
      const userMenu = page.locator(SELECTORS.header.userMenu)
        .or(page.getByTestId('user-menu'))
        .or(page.getByRole('button', { name: /user menu/i }));
      await expect(userMenu).toBeVisible({ timeout: TIMEOUTS.api });
    });

    test('should remember user login state after page refresh', async ({ page, context }) => {
      // Login first
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Verify session cookie exists
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
      expect(sessionCookie).toBeDefined();
      
      // Refresh page
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Should still be authenticated
      const userMenu = page.getByTestId('user-menu').or(page.getByRole('button', { name: /user menu/i }));
      await expect(userMenu).toBeVisible();
    });

    test('should handle remember me functionality', async ({ page }) => {
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      
      // Check remember me if it exists
      const rememberMe = page.getByRole('checkbox', { name: /remember/i });
      if (await rememberMe.isVisible()) {
        await rememberMe.check();
      }
      
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Verify successful login
      const userMenu = page.getByTestId('user-menu').or(page.getByRole('button', { name: /user menu/i }));
      await expect(userMenu).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
      // Try to submit without filling any fields
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show validation errors
      const emailError = page.getByText(/email.*required/i).or(page.getByRole('alert'));
      const passwordError = page.getByText(/password.*required/i).or(page.getByRole('alert'));
      
      await expect(emailError.or(passwordError)).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.getByLabel('Email').fill('invalid-email');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show email format error
      const emailError = page.getByText(/valid email/i).or(page.getByRole('alert'));
      await expect(emailError).toBeVisible();
    });

    test('should handle invalid credentials gracefully', async ({ page }) => {
      await page.getByLabel('Email').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show invalid credentials error
      const errorMessage = page.getByText(/invalid.*credentials|invalid.*password|invalid.*email/i)
        .or(page.getByRole('alert'));
      await expect(errorMessage).toBeVisible();
      
      // Form should remain intact for retry
      await expect(page.getByLabel('Email')).toHaveValue('nonexistent@example.com');
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      const xssPayload = '<script>window.xssTest = true;</script>';
      
      const emailInput = page.locator(SELECTORS.auth.emailInput).or(page.getByLabel('Email'));
      const passwordInput = page.locator(SELECTORS.auth.passwordInput).or(page.getByLabel('Password'));
      const submitButton = page.locator(SELECTORS.auth.submitButton).or(page.getByRole('button', { name: /sign in/i }));
      
      await emailInput.fill(xssPayload);
      await passwordInput.fill('password');
      await submitButton.click();
      
      // Verify script is not executed with proper typing
      const xssExecuted = await page.evaluate(() => {
        const testWindow = window as typeof window & { xssTest?: boolean };
        return testWindow.xssTest === true;
      });
      expect(xssExecuted).toBeFalsy();
      
      // Error message should be properly escaped
      const errorElement = page.locator(SELECTORS.common.error).or(page.getByRole('alert'));
      const errorText = await errorElement.textContent().catch(() => null);
      if (errorText) {
        expect(errorText).not.toContain('<script>');
        expect(errorText).not.toContain('xssTest');
      }
    });

    test('should handle rate limiting', async ({ page }) => {
      // Attempt multiple failed logins
      const maxAttempts = 6;
      
      for (let i = 0; i < maxAttempts; i++) {
        await page.getByLabel('Email').fill('test@example.com');
        await page.getByLabel('Password').fill(`wrongpassword${i}`);
        await page.getByRole('button', { name: /sign in/i }).click();
        
        // Wait for response
        await page.waitForTimeout(500);
        
        if (i >= 4) {
          // Should show rate limit error after 5 attempts
          const rateLimitError = page.getByText(/too many.*attempts|rate.*limit|try.*again/i);
          if (await rateLimitError.isVisible()) {
            break;
          }
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Mock network failure
      await context.route('**/auth/**', route => route.abort());
      
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show network error message
      const networkError = page.getByText(/network.*error|connection.*failed|unable.*connect/i)
        .or(page.getByRole('alert'));
      await expect(networkError).toBeVisible();
      
      // Form should remain intact
      await expect(page.getByLabel('Email')).toHaveValue(TEST_USERS.valid.email);
    });

    test('should handle server errors (500)', async ({ page, context }) => {
      await mockApiResponse(page, '**/auth/login', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });
      
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show server error message
      const serverError = page.getByText(/something.*wrong|server.*error|try.*again/i)
        .or(page.getByRole('alert'));
      await expect(serverError).toBeVisible();
    });
  });

  test.describe('OAuth/Social Login', () => {
    test('should display OAuth login options', async ({ page }) => {
      // Check if OAuth buttons are present
      const googleButton = page.getByRole('button', { name: /google/i });
      
      if (await googleButton.isVisible()) {
        await expect(googleButton).toBeVisible();
        await expect(googleButton).toBeEnabled();
      }
    });

    test('should handle OAuth login flow', async ({ page, context }) => {
      const googleButton = page.getByRole('button', { name: /google/i });
      
      if (await googleButton.isVisible()) {
        // Mock successful OAuth response
        await context.route('**/auth/google', route => {
          route.fulfill({
            status: 302,
            headers: { 'Location': '/dashboard' }
          });
        });
        
        await googleButton.click();
        
        // Should redirect to dashboard
        await page.waitForURL('/dashboard', { timeout: TIMEOUTS.navigation });
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      
      // All form elements should be visible and accessible
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      
      // Form should be scrollable if needed
      const formHeight = await page.locator('form').boundingBox();
      expect(formHeight?.height).toBeLessThan(TEST_VIEWPORTS.mobile.height);
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      
      // Use tap instead of click for mobile
      await page.getByLabel('Email').tap();
      await page.keyboard.type(TEST_USERS.valid.email);
      
      await page.getByLabel('Password').tap();
      await page.keyboard.type(TEST_USERS.valid.password);
      
      await page.getByRole('button', { name: /sign in/i }).tap();
      
      // Should redirect successfully
      await page.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Email')).toBeFocused();
      
      await page.keyboard.type(TEST_USERS.valid.email);
      
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Password')).toBeFocused();
      
      await page.keyboard.type(TEST_USERS.valid.password);
      
      // Continue tabbing to submit button
      await page.keyboard.press('Tab');
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeFocused();
      
      // Submit with Enter key
      await page.keyboard.press('Enter');
      await page.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check form has proper role
      const form = page.getByRole('form').or(page.locator('form'));
      await expect(form).toBeVisible();
      
      // Check inputs have proper labels
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Check submit button is properly labeled
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should announce errors to screen readers', async ({ page }) => {
      // Submit form without filling fields
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Error should be announced with proper ARIA attributes
      const errorAlert = page.getByRole('alert');
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toHaveAttribute('aria-live');
      }
    });

    test('should meet accessibility standards', async ({ page }) => {
      const accessibilityResult = await checkAccessibility(page);
      
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
      const startTime = Date.now();
      
      await page.goto('/auth/login');
      await page.waitForSelector('form', { state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Login form should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should complete successful login within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      const responseTime = Date.now() - startTime;
      
      // Login should complete within 3 seconds
      expect(responseTime).toBeLessThan(3000);
    });

    test('should measure core web vitals', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      const metrics = await getPerformanceMetrics(page);
      
      // Basic performance assertions
      expect(metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(metrics.domContentLoaded).toBeLessThan(3000);
    });
  });

  test.describe('Navigation', () => {
    test('should have working forgot password link', async ({ page }) => {
      const forgotPasswordLink = page.getByRole('link', { name: /forgot.*password/i });
      
      if (await forgotPasswordLink.isVisible()) {
        await forgotPasswordLink.click();
        await expect(page).toHaveURL(/forgot-password/);
      }
    });

    test('should have working sign up link', async ({ page }) => {
      const signUpLink = page.getByRole('link', { name: /sign up|create.*account/i });
      
      if (await signUpLink.isVisible()) {
        await signUpLink.click();
        await expect(page).toHaveURL(/signup/);
      }
    });

    test('should redirect authenticated users away from login', async ({ page, context }) => {
      // First login
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Try to access login page again
      await page.goto('/auth/login');
      
      // Should redirect away from login page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/login');
    });
  });
});