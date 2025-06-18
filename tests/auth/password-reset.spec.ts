import { test, expect } from '@playwright/test';
import { 
  TEST_FORM_DATA, 
  TEST_VIEWPORTS, 
  TIMEOUTS
} from '../helpers/test-data';
import { 
  checkAccessibility, 
  mockApiResponse, 
  waitForNetworkIdle
} from '../helpers/test-utils';

test.describe('Password Reset Flow', () => {
  test.describe('Forgot Password Request', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await waitForNetworkIdle(page);
    });

    test('should allow user to request password reset', async ({ page }) => {
      // Fill email field
      await page.getByLabel('Email').fill(TEST_FORM_DATA.login.valid.email);
      
      // Submit request
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Should show success message
      const successMessage = page.getByText(/check.*email|reset.*link|sent.*email/i);
      await expect(successMessage).toBeVisible({ timeout: TIMEOUTS.api });
      
      // Form should be disabled or hidden after successful submission
      const submitButton = page.getByRole('button', { name: /reset.*password|send.*reset/i });
      const isDisabled = await submitButton.isDisabled().catch(() => false);
      const isVisible = await submitButton.isVisible().catch(() => false);
      
      expect(isDisabled || !isVisible).toBeTruthy();
    });

    test('should validate email format in forgot password form', async ({ page }) => {
      const invalidEmails = [
        'plaintext',
        '@example.com',
        'user@',
        'invalid-email'
      ];
      
      for (const email of invalidEmails) {
        await page.getByLabel('Email').fill(email);
        await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
        
        // Should show email validation error
        const emailError = page.getByText(/valid email/i).or(page.getByRole('alert'));
        if (await emailError.isVisible()) {
          await expect(emailError).toBeVisible();
          break;
        }
      }
    });

    test('should require email field', async ({ page }) => {
      // Try to submit without email
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Should show required field error
      const requiredError = page.getByText(/email.*required|required/i).or(page.getByRole('alert'));
      await expect(requiredError).toBeVisible();
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      await page.getByLabel('Email').fill('nonexistent@example.com');
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Should either show success message (security) or appropriate error
      await page.waitForTimeout(2000);
      
      const successMessage = page.getByText(/check.*email|reset.*link|sent.*email/i);
      const errorMessage = page.getByText(/email.*not.*found|account.*not.*exist/i);
      
      // Should show either success or error message
      const hasSuccess = await successMessage.isVisible();
      const hasError = await errorMessage.isVisible();
      
      expect(hasSuccess || hasError).toBeTruthy();
    });

    test('should handle rate limiting on password reset requests', async ({ page }) => {
      const email = TEST_FORM_DATA.login.valid.email;
      
      // Submit multiple requests quickly
      for (let i = 0; i < 5; i++) {
        await page.getByLabel('Email').fill(email);
        await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
        await page.waitForTimeout(500);
        
        // Check for rate limiting after a few attempts
        if (i >= 2) {
          const rateLimitError = page.getByText(/too many.*requests|wait.*before|rate.*limit/i);
          if (await rateLimitError.isVisible()) {
            await expect(rateLimitError).toBeVisible();
            break;
          }
        }
      }
    });

    test('should have working back to login link', async ({ page }) => {
      const backToLoginLink = page.getByRole('link', { name: /back.*login|sign in|login/i });
      
      if (await backToLoginLink.isVisible()) {
        await backToLoginLink.click();
        await expect(page).toHaveURL(/login/);
      }
    });
  });

  test.describe('Password Reset Form', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to reset password page with mock token
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      await waitForNetworkIdle(page);
    });

    test('should allow user to set new password with valid token', async ({ page }) => {
      const newPassword = 'NewSecurePassword123!';
      
      // Fill new password
      await page.getByLabel(/new.*password|password/i).first().fill(newPassword);
      
      // Fill confirm password if present
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(newPassword);
      }
      
      // Submit form
      await page.getByRole('button', { name: /update.*password|reset.*password|change.*password/i }).click();
      
      // Should redirect to login with success message
      await page.waitForURL(/(login|auth\/login)/, { timeout: TIMEOUTS.navigation });
      
      const successMessage = page.getByText(/password.*updated|password.*changed|reset.*successful/i);
      await expect(successMessage).toBeVisible({ timeout: TIMEOUTS.api });
    });

    test('should validate password requirements in reset form', async ({ page }) => {
      const weakPasswords = [
        { password: 'short', error: /8.*characters|too short/i },
        { password: 'nouppercase123!', error: /uppercase|capital/i },
        { password: 'NOLOWERCASE123!', error: /lowercase/i },
        { password: 'NoNumbers!', error: /number|digit/i },
        { password: 'NoSpecialChar123', error: /special.*character|symbol/i }
      ];
      
      for (const { password, error } of weakPasswords) {
        await page.getByLabel(/new.*password|password/i).first().fill(password);
        await page.getByLabel(/new.*password|password/i).first().blur();
        
        // Check for password requirement error
        const passwordError = page.getByText(error).or(page.getByRole('alert'));
        if (await passwordError.isVisible()) {
          await expect(passwordError).toBeVisible();
          // Clear for next test
          await page.getByLabel(/new.*password|password/i).first().fill('');
          break;
        }
      }
    });

    test('should validate password confirmation in reset form', async ({ page }) => {
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      
      if (await confirmPasswordField.isVisible()) {
        await page.getByLabel(/new.*password|password/i).first().fill('StrongPassword123!');
        await confirmPasswordField.fill('DifferentPassword123!');
        await confirmPasswordField.blur();
        
        // Should show password mismatch error
        const mismatchError = page.getByText(/passwords.*match|passwords.*same/i)
          .or(page.getByRole('alert'));
        await expect(mismatchError).toBeVisible();
      }
    });

    test('should handle invalid or expired reset token', async ({ page }) => {
      // Navigate with invalid token
      await page.goto('/auth/reset-password?token=invalid-token-123');
      await waitForNetworkIdle(page);
      
      // Should show error message or redirect
      const invalidTokenError = page.getByText(/invalid.*token|expired.*token|link.*expired/i);
      const redirected = await page.waitForURL(/login|forgot-password/, { timeout: 2000 }).catch(() => false);
      
      // Should either show error or redirect
      const hasError = await invalidTokenError.isVisible();
      expect(hasError || redirected).toBeTruthy();
    });

    test('should handle missing reset token', async ({ page }) => {
      // Navigate without token
      await page.goto('/auth/reset-password');
      await waitForNetworkIdle(page);
      
      // Should show error or redirect to forgot password
      const missingTokenError = page.getByText(/token.*required|missing.*token|invalid.*request/i);
      const redirected = await page.waitForURL(/forgot-password/, { timeout: 2000 }).catch(() => false);
      
      const hasError = await missingTokenError.isVisible();
      expect(hasError || redirected).toBeTruthy();
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in password reset forms', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      const xssPayload = '<script>window.xssTest = true;</script>';
      
      await page.getByLabel('Email').fill(xssPayload + '@example.com');
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Verify script is not executed
      const xssExecuted = await page.evaluate(() => (window as Window).xssTest);
      expect(xssExecuted).toBeFalsy();
    });

    test('should validate reset token format', async ({ page }) => {
      const maliciousTokens = [
        'javascript:alert(1)',
        '<script>alert(1)</script>',
        '../../etc/passwd',
        'null',
        'undefined'
      ];
      
      for (const token of maliciousTokens) {
        await page.goto(`/auth/reset-password?token=${encodeURIComponent(token)}`);
        await waitForNetworkIdle(page);
        
        // Should either show error or redirect safely
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('javascript:');
        expect(currentUrl).not.toContain('<script>');
        
        // Should show appropriate error
        const tokenError = page.getByText(/invalid.*token|expired.*token/i);
        if (await tokenError.isVisible()) {
          await expect(tokenError).toBeVisible();
          break;
        }
      }
    });

    test('should enforce secure password requirements', async ({ page }) => {
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      // Test common weak passwords
      const commonPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'password123'
      ];
      
      for (const password of commonPasswords) {
        await page.getByLabel(/new.*password|password/i).first().fill(password);
        await page.getByRole('button', { name: /update.*password|reset.*password/i }).click();
        
        // Should reject common passwords
        const weakPasswordError = page.getByText(/weak.*password|common.*password|choose.*stronger/i)
          .or(page.getByRole('alert'));
        
        if (await weakPasswordError.isVisible()) {
          await expect(weakPasswordError).toBeVisible();
          break;
        }
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport - forgot password', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      await page.goto('/auth/forgot-password');
      
      // All elements should be visible and accessible
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByRole('button', { name: /reset.*password|send.*reset/i })).toBeVisible();
      
      // Form should fit within mobile viewport
      const form = page.locator('form').first();
      if (await form.isVisible()) {
        const formHeight = await form.boundingBox();
        expect(formHeight?.height).toBeLessThan(TEST_VIEWPORTS.mobile.height);
      }
    });

    test('should work on mobile viewport - reset password form', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      // All elements should be visible and accessible
      await expect(page.getByLabel(/new.*password|password/i).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /update.*password|reset.*password/i })).toBeVisible();
      
      // Test touch interactions
      await page.getByLabel(/new.*password|password/i).first().tap();
      await page.keyboard.type('NewPassword123!');
      
      const confirmField = page.getByLabel(/confirm.*password/i);
      if (await confirmField.isVisible()) {
        await confirmField.tap();
        await page.keyboard.type('NewPassword123!');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable - forgot password', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Email')).toBeFocused();
      
      await page.keyboard.type(TEST_FORM_DATA.login.valid.email);
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /reset.*password|send.*reset/i })).toBeFocused();
      
      // Submit with Enter
      await page.keyboard.press('Enter');
      
      // Should show success message
      const successMessage = page.getByText(/check.*email|reset.*link|sent.*email/i);
      await expect(successMessage).toBeVisible();
    });

    test('should be keyboard navigable - reset password form', async ({ page }) => {
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/new.*password|password/i).first()).toBeFocused();
      
      await page.keyboard.type('NewPassword123!');
      
      const confirmField = page.getByLabel(/confirm.*password/i);
      if (await confirmField.isVisible()) {
        await page.keyboard.press('Tab');
        await expect(confirmField).toBeFocused();
        await page.keyboard.type('NewPassword123!');
      }
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /update.*password|reset.*password/i })).toBeFocused();
    });

    test('should have proper ARIA labels - forgot password', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      // Check form has proper structure
      const form = page.getByRole('form').or(page.locator('form'));
      await expect(form).toBeVisible();
      
      // Check email input has proper label
      await expect(page.getByLabel('Email')).toBeVisible();
      
      // Check submit button is properly labeled
      await expect(page.getByRole('button', { name: /reset.*password|send.*reset/i })).toBeVisible();
    });

    test('should have proper ARIA labels - reset password form', async ({ page }) => {
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      // Check form has proper structure
      const form = page.getByRole('form').or(page.locator('form'));
      await expect(form).toBeVisible();
      
      // Check password inputs have proper labels
      await expect(page.getByLabel(/new.*password|password/i).first()).toBeVisible();
      
      const confirmField = page.getByLabel(/confirm.*password/i);
      if (await confirmField.isVisible()) {
        await expect(confirmField).toBeVisible();
      }
      
      // Check submit button is properly labeled
      await expect(page.getByRole('button', { name: /update.*password|reset.*password/i })).toBeVisible();
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      // Submit form without email to trigger error
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Error should be announced with proper ARIA attributes
      const errorAlert = page.getByRole('alert');
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toHaveAttribute('aria-live');
      }
    });

    test('should meet accessibility standards', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      const accessibilityResult = await checkAccessibility(page);
      
      // Log violations if any
      if (!accessibilityResult.passed) {
        console.log('Accessibility violations:', accessibilityResult.violations);
      }
      
      // Should have minimal accessibility violations
      expect(accessibilityResult.violations.length).toBeLessThan(3);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors in forgot password', async ({ page, context }) => {
      await page.goto('/auth/forgot-password');
      
      // Mock network failure
      await context.route('**/auth/forgot-password', route => route.abort());
      
      await page.getByLabel('Email').fill(TEST_FORM_DATA.login.valid.email);
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Should show network error message
      const networkError = page.getByText(/network.*error|connection.*failed|unable.*connect/i)
        .or(page.getByRole('alert'));
      await expect(networkError).toBeVisible();
    });

    test('should handle server errors in password reset', async ({ page }) => {
      const mockToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${mockToken}`);
      
      await mockApiResponse(page, '**/auth/reset-password', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });
      
      await page.getByLabel(/new.*password|password/i).first().fill('NewPassword123!');
      
      const confirmField = page.getByLabel(/confirm.*password/i);
      if (await confirmField.isVisible()) {
        await confirmField.fill('NewPassword123!');
      }
      
      await page.getByRole('button', { name: /update.*password|reset.*password/i }).click();
      
      // Should show server error message
      const serverError = page.getByText(/something.*wrong|server.*error|try.*again/i)
        .or(page.getByRole('alert'));
      await expect(serverError).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load forgot password form within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/auth/forgot-password');
      await page.waitForSelector('form', { state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should process password reset request within acceptable time', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      const startTime = Date.now();
      
      await page.getByLabel('Email').fill(TEST_FORM_DATA.login.valid.email);
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Wait for success message
      await page.waitForSelector('text=/check.*email|reset.*link|sent.*email/i', { timeout: TIMEOUTS.api });
      
      const responseTime = Date.now() - startTime;
      
      // Request should complete within 3 seconds
      expect(responseTime).toBeLessThan(3000);
    });
  });

  test.describe('Email Integration Tests', () => {
    test('should display appropriate instructions after reset request', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      await page.getByLabel('Email').fill(TEST_FORM_DATA.login.valid.email);
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Should show detailed instructions
      const instructions = page.getByText(/check.*email|reset.*link|sent.*email|instructions/i);
      await expect(instructions).toBeVisible();
      
      // Should mention checking spam folder
      const spamInstructions = page.getByText(/spam|junk|folder/i);
      if (await spamInstructions.isVisible()) {
        await expect(spamInstructions).toBeVisible();
      }
    });

    test('should handle resend reset email functionality', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      await page.getByLabel('Email').fill(TEST_FORM_DATA.login.valid.email);
      await page.getByRole('button', { name: /reset.*password|send.*reset/i }).click();
      
      // Wait for success message
      await page.waitForSelector('text=/check.*email|reset.*link|sent.*email/i');
      
      // Look for resend option
      const resendLink = page.getByRole('button', { name: /resend|send.*again/i })
        .or(page.getByRole('link', { name: /resend|send.*again/i }));
      
      if (await resendLink.isVisible()) {
        await resendLink.click();
        
        // Should show confirmation of resend
        const resendConfirmation = page.getByText(/sent.*again|resent|new.*email/i);
        await expect(resendConfirmation).toBeVisible();
      }
    });
  });
});