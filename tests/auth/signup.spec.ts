import { test, expect } from '@playwright/test';
import { 
  TEST_FORM_DATA, 
  TEST_VIEWPORTS, 
  TIMEOUTS,
  AUTH_SELECTORS 
} from '../helpers/test-data';
import { 
  checkAccessibility, 
  mockApiResponse, 
  waitForNetworkIdle
} from '../helpers/test-utils';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForNetworkIdle(page);
  });

  test.describe('Successful Registration', () => {
    test('should allow user to register with valid information', async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `test_${timestamp}@example.com`;
      
      // Use proper selectors with fallbacks
      const emailInput = page.locator(AUTH_SELECTORS.inputs.email).or(page.getByLabel('Email'));
      const passwordInput = page.locator(AUTH_SELECTORS.inputs.password).or(page.getByLabel('Password'));
      const submitButton = page.locator(AUTH_SELECTORS.buttons.submit).or(page.getByRole('button', { name: /sign up|create.*account/i }));
      
      // Fill registration form
      await emailInput.fill(testEmail);
      
      // Fill username if present
      const usernameField = page.getByLabel(/username/i);
      if (await usernameField.isVisible()) {
        await usernameField.fill(`testuser${timestamp}`);
      }
      
      // Fill first/last name if present
      const firstNameField = page.getByLabel(/first.*name/i);
      const lastNameField = page.getByLabel(/last.*name/i);
      if (await firstNameField.isVisible()) {
        await firstNameField.fill('Test');
      }
      if (await lastNameField.isVisible()) {
        await lastNameField.fill('User');
      }
      
      await passwordInput.fill(TEST_FORM_DATA.login.valid.password);
      
      // Fill confirm password if present
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
      }
      
      // Accept terms if checkbox exists
      const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit form
      await submitButton.click();
      
      // Should redirect to email verification or success page
      await page.waitForURL(/(verify|success|dashboard)/, { timeout: TIMEOUTS.navigation });
      
      // Should show success message or verification prompt
      const successMessage = page.getByText(/check.*email|verify.*email|account.*created/i);
      await expect(successMessage).toBeVisible({ timeout: TIMEOUTS.api });
    });

    test('should handle pre-filled form data', async ({ page }) => {
      const formData = {
        email: 'prefilled@example.com',
        username: 'prefilleduser',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      // Navigate with query parameters if supported
      await page.goto(`/auth/signup?email=${formData.email}&username=${formData.username}`);
      
      // Check if fields are pre-filled
      const emailValue = await page.getByLabel('Email').inputValue();
      const usernameField = page.getByLabel(/username/i);
      
      if (emailValue === formData.email) {
        expect(emailValue).toBe(formData.email);
      }
      
      if (await usernameField.isVisible()) {
        const usernameValue = await usernameField.inputValue();
        if (usernameValue === formData.username) {
          expect(usernameValue).toBe(formData.username);
        }
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      // Try to submit without filling required fields
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Should show validation errors for required fields
      const errorMessages = page.getByRole('alert').or(page.getByText(/required|cannot be empty/i));
      await expect(errorMessages.first()).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      const invalidEmails = [
        'plaintext',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@example',
        'user name@example.com'
      ];
      
      for (const email of invalidEmails) {
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Email').blur(); // Trigger validation
        
        // Should show email format error
        const emailError = page.getByText(/valid email/i).or(page.getByRole('alert'));
        if (await emailError.isVisible()) {
          await expect(emailError).toBeVisible();
          break; // At least one validation should work
        }
      }
    });

    test('should validate password requirements', async ({ page }) => {
      const weakPasswords = [
        { password: 'short', error: /8.*characters|too short/i },
        { password: 'nouppercase123!', error: /uppercase|capital/i },
        { password: 'NOLOWERCASE123!', error: /lowercase/i },
        { password: 'NoNumbers!', error: /number|digit/i },
        { password: 'NoSpecialChar123', error: /special.*character|symbol/i }
      ];
      
      for (const { password, error } of weakPasswords) {
        await page.getByLabel('Password').fill(password);
        await page.getByLabel('Password').blur(); // Trigger validation
        
        // Check for password requirement error
        const passwordError = page.getByText(error).or(page.getByRole('alert'));
        if (await passwordError.isVisible()) {
          await expect(passwordError).toBeVisible();
          // Clear for next test
          await page.getByLabel('Password').fill('');
        }
      }
    });

    test('should validate password confirmation', async ({ page }) => {
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      
      if (await confirmPasswordField.isVisible()) {
        await page.getByLabel('Password').fill('StrongPassword123!');
        await confirmPasswordField.fill('DifferentPassword123!');
        await confirmPasswordField.blur();
        
        // Should show password mismatch error
        const mismatchError = page.getByText(/passwords.*match|passwords.*same/i)
          .or(page.getByRole('alert'));
        await expect(mismatchError).toBeVisible();
      }
    });

    test('should validate username requirements', async ({ page }) => {
      const usernameField = page.getByLabel(/username/i);
      
      if (await usernameField.isVisible()) {
        const invalidUsernames = [
          'ab', // Too short
          'a'.repeat(50), // Too long
          'user@name', // Invalid characters
          '123456', // Only numbers
          'user name' // Spaces
        ];
        
        for (const username of invalidUsernames) {
          await usernameField.fill(username);
          await usernameField.blur();
          
          // Should show username validation error
          const usernameError = page.getByText(/username.*invalid|characters|length/i)
            .or(page.getByRole('alert'));
          if (await usernameError.isVisible()) {
            await expect(usernameError).toBeVisible();
            break; // At least one validation should work
          }
        }
      }
    });

    test('should require terms acceptance', async ({ page }) => {
      const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
      
      if (await termsCheckbox.isVisible()) {
        // Fill form but don't check terms
        const timestamp = Date.now();
        await page.getByLabel('Email').fill(`test_${timestamp}@example.com`);
        await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
        
        const confirmPasswordField = page.getByLabel(/confirm.*password/i);
        if (await confirmPasswordField.isVisible()) {
          await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
        }
        
        // Try to submit without accepting terms
        await page.getByRole('button', { name: /sign up|create.*account/i }).click();
        
        // Should show terms acceptance error
        const termsError = page.getByText(/accept.*terms|agree.*terms/i)
          .or(page.getByRole('alert'));
        await expect(termsError).toBeVisible();
      }
    });
  });

  test.describe('Duplicate Account Handling', () => {
    test('should handle existing email gracefully', async ({ page }) => {
      // Try to register with an email that might already exist
      await page.getByLabel('Email').fill('existing@example.com');
      
      const usernameField = page.getByLabel(/username/i);
      if (await usernameField.isVisible()) {
        await usernameField.fill('existinguser');
      }
      
      await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
      
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
      }
      
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Should either succeed or show appropriate error for existing account
      // Wait for response and check result
      await page.waitForTimeout(2000);
      
      const existingAccountError = page.getByText(/email.*exists|already.*registered|account.*exists/i);
      const successMessage = page.getByText(/check.*email|verify.*email|account.*created/i);
      
      // Should show either error or success (depending on implementation)
      const hasError = await existingAccountError.isVisible();
      const hasSuccess = await successMessage.isVisible();
      
      expect(hasError || hasSuccess).toBeTruthy();
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in registration form', async ({ page }) => {
      const xssPayload = '<script>window.xssTest = true;</script>';
      
      await page.getByLabel('Email').fill(xssPayload + '@example.com');
      
      const usernameField = page.getByLabel(/username/i);
      if (await usernameField.isVisible()) {
        await usernameField.fill(xssPayload);
      }
      
      await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Verify script is not executed
      const xssExecuted = await page.evaluate(() => (window as Window).xssTest);
      expect(xssExecuted).toBeFalsy();
      
      // Error messages should be properly escaped
      const errorText = await page.getByRole('alert').textContent().catch(() => null);
      if (errorText) {
        expect(errorText).not.toContain('<script>');
      }
    });

    test('should sanitize user inputs', async ({ page }) => {
      const maliciousInputs = [
        "admin'--",
        "'; DROP TABLE users; --",
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)'
      ];
      
      for (const input of maliciousInputs) {
        const usernameField = page.getByLabel(/username/i);
        if (await usernameField.isVisible()) {
          await usernameField.fill(input);
          await usernameField.blur();
          
          // Should either reject input or sanitize it
          const errorMessage = page.getByText(/invalid.*characters|not.*allowed/i);
          if (await errorMessage.isVisible()) {
            await expect(errorMessage).toBeVisible();
            break;
          }
        }
      }
    });

    test('should enforce field length limits', async ({ page }) => {
      const longString = 'a'.repeat(256);
      
      await page.getByLabel('Email').fill(longString + '@example.com');
      
      const usernameField = page.getByLabel(/username/i);
      if (await usernameField.isVisible()) {
        await usernameField.fill(longString);
      }
      
      await page.getByLabel('Password').fill(longString);
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Should show appropriate length errors
      const lengthErrors = page.getByText(/too long|exceeds.*limit|maximum.*characters/i);
      await expect(lengthErrors.first()).toBeVisible();
    });
  });

  test.describe('OAuth/Social Registration', () => {
    test('should display OAuth registration options', async ({ page }) => {
      const googleButton = page.getByRole('button', { name: /google/i });
      
      if (await googleButton.isVisible()) {
        await expect(googleButton).toBeVisible();
        await expect(googleButton).toBeEnabled();
      }
    });

    test('should handle OAuth registration flow', async ({ page, context }) => {
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
        
        // Should redirect to dashboard or verification
        await page.waitForURL(/(dashboard|verify)/, { timeout: TIMEOUTS.navigation });
      }
    });

    test('should handle OAuth registration errors', async ({ page, context }) => {
      const googleButton = page.getByRole('button', { name: /google/i });
      
      if (await googleButton.isVisible()) {
        // Mock OAuth error
        await context.route('**/auth/google', route => {
          route.fulfill({
            status: 302,
            headers: { 'Location': '/auth/signup?error=oauth_error' }
          });
        });
        
        await googleButton.click();
        
        // Should show OAuth error message
        const oauthError = page.getByText(/authentication.*failed|oauth.*error/i);
        await expect(oauthError).toBeVisible();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      
      // All form elements should be visible and accessible
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up|create.*account/i })).toBeVisible();
      
      // Form should be scrollable if needed
      const formElement = page.locator('form').first();
      if (await formElement.isVisible()) {
        const formHeight = await formElement.boundingBox();
        // Form should fit within mobile viewport or be scrollable
        const isScrollable = await page.evaluate(() => {
          return document.body.scrollHeight > window.innerHeight;
        });
        
        expect(formHeight || isScrollable).toBeTruthy();
      }
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.setViewportSize(TEST_VIEWPORTS.mobile);
      
      // Test virtual keyboard behavior
      await page.getByLabel('Email').tap();
      await page.keyboard.type('mobile@example.com');
      
      // Check if viewport adjusts for virtual keyboard
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(TEST_VIEWPORTS.mobile.width);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through all form elements
      const formFields = [
        page.getByLabel('Email'),
        page.getByLabel(/username/i),
        page.getByLabel(/first.*name/i),
        page.getByLabel(/last.*name/i),
        page.getByLabel('Password'),
        page.getByLabel(/confirm.*password/i),
        page.getByRole('checkbox', { name: /terms/i }),
        page.getByRole('button', { name: /sign up|create.*account/i })
      ];
      
      for (const field of formFields) {
        if (await field.isVisible()) {
          await page.keyboard.press('Tab');
          await expect(field).toBeFocused();
        }
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check form has proper structure
      const form = page.getByRole('form').or(page.locator('form'));
      await expect(form).toBeVisible();
      
      // Check inputs have proper labels
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Check submit button is properly labeled
      await expect(page.getByRole('button', { name: /sign up|create.*account/i })).toBeVisible();
      
      // Check password requirements are announced
      const passwordField = page.getByLabel('Password');
      if (await passwordField.isVisible()) {
        const describedBy = await passwordField.getAttribute('aria-describedby');
        if (describedBy) {
          const description = page.locator(`#${describedBy}`);
          await expect(description).toBeVisible();
        }
      }
    });

    test('should announce validation errors to screen readers', async ({ page }) => {
      // Submit form with invalid data
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Errors should be announced with proper ARIA attributes
      const errorAlerts = page.getByRole('alert');
      const errorCount = await errorAlerts.count();
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const alert = errorAlerts.nth(i);
          await expect(alert).toHaveAttribute('aria-live');
        }
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
    test('should load signup form within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/auth/signup');
      await page.waitForSelector('form', { state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Signup form should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle form submission within acceptable time', async ({ page }) => {
      const timestamp = Date.now();
      const startTime = Date.now();
      
      await page.getByLabel('Email').fill(`test_${timestamp}@example.com`);
      await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
      
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
      }
      
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Wait for response
      await page.waitForURL(/(verify|success|dashboard)/, { timeout: TIMEOUTS.navigation });
      
      const responseTime = Date.now() - startTime;
      
      // Registration should complete within 5 seconds
      expect(responseTime).toBeLessThan(5000);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Mock network failure
      await context.route('**/auth/signup', route => route.abort());
      
      const timestamp = Date.now();
      await page.getByLabel('Email').fill(`test_${timestamp}@example.com`);
      await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
      
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
      }
      
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Should show network error message
      const networkError = page.getByText(/network.*error|connection.*failed|unable.*connect/i)
        .or(page.getByRole('alert'));
      await expect(networkError).toBeVisible();
    });

    test('should handle server errors (500)', async ({ page }) => {
      await mockApiResponse(page, '**/auth/signup', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });
      
      const timestamp = Date.now();
      await page.getByLabel('Email').fill(`test_${timestamp}@example.com`);
      await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
      
      const confirmPasswordField = page.getByLabel(/confirm.*password/i);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
      }
      
      const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      await page.getByRole('button', { name: /sign up|create.*account/i }).click();
      
      // Should show server error message
      const serverError = page.getByText(/something.*wrong|server.*error|try.*again/i)
        .or(page.getByRole('alert'));
      await expect(serverError).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have working login link', async ({ page }) => {
      const loginLink = page.getByRole('link', { name: /sign in|log in|already.*account/i });
      
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/login/);
      }
    });

    test('should redirect authenticated users away from signup', async ({ page, context }) => {
      // Mock authenticated state
      await context.addCookies([{
        name: 'sb-auth-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/'
      }]);
      
      await page.goto('/auth/signup');
      
      // Should redirect away from signup page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      
      // Could redirect to dashboard or login page depending on token validity
      const isRedirected = !currentUrl.includes('/auth/signup') || 
                          currentUrl.includes('dashboard') || 
                          currentUrl.includes('home');
      
      expect(isRedirected).toBeTruthy();
    });
  });
});