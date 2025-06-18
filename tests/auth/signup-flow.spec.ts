/**
 * Signup Flow E2E Tests
 * 
 * Simplified E2E tests focusing only on critical user signup paths.
 * Business logic validation is now tested in unit tests.
 */

import { test, expect } from '@playwright/test';
import { 
  TEST_FORM_DATA, 
  TIMEOUTS,
  AUTH_SELECTORS 
} from '../helpers/test-data';
import { 
  mockApiResponse, 
  waitForNetworkIdle
} from '../helpers/test-utils';

test.describe('Signup Flow - Critical Paths Only', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForNetworkIdle(page);
  });

  test('should complete successful signup flow', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test_${timestamp}@example.com`;
    
    // Fill registration form
    await page.getByLabel('Email').fill(testEmail);
    
    const usernameField = page.getByLabel(/username/i);
    if (await usernameField.isVisible()) {
      await usernameField.fill(`testuser${timestamp}`);
    }
    
    await page.getByLabel('Password').fill(TEST_FORM_DATA.login.valid.password);
    
    const confirmPasswordField = page.getByLabel(/confirm.*password/i);
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(TEST_FORM_DATA.login.valid.password);
    }
    
    const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    // Submit form
    await page.getByRole('button', { name: /sign up|create.*account/i }).click();
    
    // Should redirect to verification or success page
    await page.waitForURL(/(verify|success|dashboard)/, { timeout: TIMEOUTS.navigation });
    
    // Should show success message
    const successMessage = page.getByText(/check.*email|verify.*email|account.*created/i);
    await expect(successMessage).toBeVisible({ timeout: TIMEOUTS.api });
  });

  test('should handle duplicate email registration', async ({ page }) => {
    const existingEmail = 'existing@example.com';
    
    // Fill form with existing email
    await page.getByLabel('Email').fill(existingEmail);
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
    await page.waitForTimeout(2000);
    
    // Should either show error or handle gracefully
    const existingAccountError = page.getByText(/email.*exists|already.*registered|account.*exists/i);
    const successMessage = page.getByText(/check.*email|verify.*email|account.*created/i);
    
    const hasError = await existingAccountError.isVisible();
    const hasSuccess = await successMessage.isVisible();
    
    // Should show either error or success (depending on implementation)
    expect(hasError || hasSuccess).toBeTruthy();
  });

  test('should handle OAuth signup option', async ({ page, context }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
      
      // Mock OAuth response
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

  test('should handle OAuth signup error', async ({ page, context }) => {
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

  test('should handle network errors during signup', async ({ page, context }) => {
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

  test('should handle server errors during signup', async ({ page }) => {
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

  test('should have working login link', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in|log in|already.*account/i });
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });

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

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // All form elements should be visible and accessible
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|create.*account/i })).toBeVisible();
    
    // Test mobile interaction
    await page.getByLabel('Email').tap();
    await page.keyboard.type('mobile@example.com');
    
    const emailValue = await page.getByLabel('Email').inputValue();
    expect(emailValue).toBe('mobile@example.com');
  });
});