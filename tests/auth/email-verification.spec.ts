import { test, expect } from '@playwright/test';
import {
  fillAuthForm,
  mockAuthResponse,
  clearAuthStorage,
  measureAuthPerformance
} from './utils/auth-test-helpers';
import { TEST_FORM_DATA, AUTH_ROUTES, AUTH_SELECTORS } from '../helpers/test-data';
import type { 
  SignupResponse, 
  AuthErrorResponse, 
  TestUser, 
  EmailVerificationResponse,
  ResendVerificationResponse 
} from './types/test-types';
import type { Route } from '@playwright/test';

// Helper function to create complete test user
const createMockTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'test-user-id',
  email: 'user@example.com',
  username: 'testuser',
  full_name: 'Test User',
  auth_id: 'auth-id',
  role: 'user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  avatar_url: null,
  bio: null,
  city: null,
  land: null,
  region: null,
  experience_points: 0,
  last_login_at: null,
  profile_visibility: 'public',
  achievements_visibility: 'public',
  submissions_visibility: 'public',
  password: 'TestPassword123!',
  email_verified: true,
  ...overrides,
});

/**
 * Enhanced Email Verification Testing Suite
 * 
 * Tests for:
 * - Email verification link expiration
 * - Invalid verification tokens
 * - Resending verification emails
 * - Rate limiting on verification requests
 * - Email verification bypass for testing
 * - Different email providers and edge cases
 */
test.describe('Email Verification - Enhanced', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test.describe('Verification Link Expiration', () => {
    test('should reject expired verification links', async ({ page }) => {
      // Navigate to verification page with expired token
      const expiredToken = 'expired_verification_token_12345';
      await page.goto(`/auth/verify-email?token=${expiredToken}`);
      
      // Mock expired token response
      await page.route('/api/auth/verify-email', async (route: Route) => {
        const requestBody = await route.request().postDataJSON();
        if (requestBody.token === expiredToken) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Verification link has expired',
              code: 'verification_expired',
              statusCode: 400,
              expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired 24h ago
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // Should automatically attempt verification on page load
      await page.waitForTimeout(1000);
      
      // Should show error message
      await expect(page.getByText('Verification link has expired')).toBeVisible();
      
      // Should show option to resend verification
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await expect(resendButton).toBeVisible();
      await expect(resendButton).toContainText('Send new verification email');
      
      // Should show when the link expired
      await expect(page.getByText(/expired.*ago/i)).toBeVisible();
    });

    test('should show time remaining before expiration', async ({ page }) => {
      const validToken = 'valid_but_expiring_token_12345';
      await page.goto(`/auth/verify-email?token=${validToken}`);
      
      // Mock token that's valid but expiring soon
      await page.route('/api/auth/verify-email', async (route: Route) => {
        const requestBody = await route.request().postDataJSON();
        if (requestBody.token === validToken) {
          const expiresIn30Min = new Date(Date.now() + 30 * 60 * 1000);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: {
                id: 'verified-user-id',
                email: 'user@example.com',
                email_verified: true,
              },
              expiresAt: expiresIn30Min.toISOString(),
            }),
          });
        }
      });
      
      // Should show successful verification
      await expect(page.getByText('Email verified successfully')).toBeVisible();
      
      // Should show expiration warning for future reference
      await expect(page.getByText(/verification links expire/i)).toBeVisible();
    });
  });

  test.describe('Invalid Verification Tokens', () => {
    test('should handle malformed verification tokens', async ({ page }) => {
      const malformedTokens = [
        'invalid-token',
        '',
        'tok en with spaces',
        'token-with-unicode-🚀',
        'x'.repeat(1000), // Very long token
        'token.with.dots',
        'token/with/slashes',
      ];
      
      for (const token of malformedTokens) {
        await page.goto(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        
        // Mock invalid token response
        await page.route('/api/auth/verify-email', async (route: Route) => {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid verification token format',
              code: 'invalid_token_format',
              statusCode: 400,
            } satisfies AuthErrorResponse),
          });
        });
        
        await page.waitForTimeout(500);
        
        // Should show error message
        await expect(page.getByText(/invalid.*verification.*token/i)).toBeVisible();
        
        // Should not allow verification to proceed
        const verifyButton = page.locator('[data-testid="manual-verify-button"]');
        if (await verifyButton.isVisible()) {
          await expect(verifyButton).toBeDisabled();
        }
      }
    });

    test('should handle token that belongs to different user', async ({ page }) => {
      const otherUserToken = 'token_for_different_user_12345';
      await page.goto(`/auth/verify-email?token=${otherUserToken}`);
      
      // Mock token mismatch response
      await mockAuthResponse<AuthErrorResponse>(page, '/api/auth/verify-email', {
        status: 403,
        body: {
          error: 'This verification link is not associated with your account',
          code: 'token_user_mismatch',
          statusCode: 403,
        },
      });
      
      await expect(page.getByText(/not associated with your account/i)).toBeVisible();
      
      // Should suggest logging in with correct account
      await expect(page.getByText(/log in with the correct account/i)).toBeVisible();
    });

    test('should handle already used verification tokens', async ({ page }) => {
      const usedToken = 'already_used_token_12345';
      await page.goto(`/auth/verify-email?token=${usedToken}`);
      
      await mockAuthResponse<AuthErrorResponse>(page, '/api/auth/verify-email', {
        status: 400,
        body: {
          error: 'This verification link has already been used',
          code: 'token_already_used',
          statusCode: 400,
        },
      });
      
      await expect(page.getByText('already been used')).toBeVisible();
      
      // Should show login option since email is already verified
      const loginButton = page.locator('[data-testid="go-to-login-button"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('Sign In');
    });
  });

  test.describe('Verification Email Resending', () => {
    test('should allow resending verification email', async ({ page }) => {
      await page.goto('/auth/verify-email');
      
      // Mock resend endpoint
      let resendCount = 0;
      await page.route('/api/auth/resend-verification', async (route: Route) => {
        resendCount++;
        
        if (resendCount <= 3) { // Allow up to 3 resends
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Verification email sent successfully',
              attemptsRemaining: 3 - resendCount,
            }),
          });
        } else {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too many verification requests. Please wait before trying again.',
              code: 'rate_limit_exceeded',
              statusCode: 429,
              retryAfter: 900, // 15 minutes
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // Should show resend form
      const emailInput = page.locator('[data-testid="resend-email-input"]');
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      
      await expect(emailInput).toBeVisible();
      await expect(resendButton).toBeVisible();
      
      // Fill email and request resend
      await emailInput.fill('user@example.com');
      await resendButton.click();
      
      // Should show success message
      await expect(page.getByText('Verification email sent successfully')).toBeVisible();
      
      // Should show remaining attempts
      await expect(page.getByText('2 attempts remaining')).toBeVisible();
      
      // Try again
      await resendButton.click();
      await expect(page.getByText('1 attempts remaining')).toBeVisible();
      
      // Try again
      await resendButton.click();
      await expect(page.getByText('0 attempts remaining')).toBeVisible();
      
      // One more time should trigger rate limit
      await resendButton.click();
      await expect(page.getByText('Too many verification requests')).toBeVisible();
      await expect(page.getByText('wait.*before trying again')).toBeVisible();
      
      // Button should be disabled
      await expect(resendButton).toBeDisabled();
    });

    test('should validate email format before resending', async ({ page }) => {
      await page.goto('/auth/verify-email');
      
      const emailInput = page.locator('[data-testid="resend-email-input"]');
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      
      // Try invalid email formats
      const invalidEmails = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user..name@domain.com',
        'user@domain',
      ];
      
      for (const email of invalidEmails) {
        await emailInput.fill(email);
        await resendButton.click();
        
        // Should show validation error
        await expect(page.getByText(/valid email/i)).toBeVisible();
        
        // Should not make API request
        // (No need to mock since validation prevents request)
      }
    });
  });

  test.describe('Email Provider Edge Cases', () => {
    test('should handle various email providers correctly', async ({ page }) => {
      const emailProviders = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'icloud.com',
        'protonmail.com',
        'company.co.uk',
        'university.edu',
        'government.gov',
      ];
      
      for (const provider of emailProviders) {
        const email = `testuser@${provider}`;
        
        await page.goto('/auth/signup');
        
        // Mock successful signup for all providers
        await mockAuthResponse<SignupResponse>(page, AUTH_ROUTES.api.signup, {
          status: 201,
          body: {
            user: {
              id: `user-${provider}`,
              email: email,
              username: `user_${provider.replace('.', '_')}`,
              full_name: 'Test User',
              auth_id: `auth-${provider}`,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              bio: null,
              city: null,
              land: null,
              region: null,
              experience_points: 0,
              last_login_at: null,
              profile_visibility: 'public',
              achievements_visibility: 'public',
              submissions_visibility: 'public',
            },
            requiresEmailVerification: true,
          },
        });
        
        // Fill signup form
        await fillAuthForm(page, {
          ...TEST_FORM_DATA.signup.valid,
          email: email,
          username: `user_${provider.replace('.', '_')}`,
        });
        
        await page.locator(AUTH_SELECTORS.buttons.submit).click();
        
        // Should redirect to verification page
        await page.waitForURL('/auth/verify-email', { timeout: 5000 });
        
        // Should show provider-specific instructions if available
        const emailDomain = provider.toLowerCase();
        if (['gmail.com', 'yahoo.com', 'outlook.com'].includes(emailDomain)) {
          await expect(page.getByText(new RegExp(emailDomain, 'i'))).toBeVisible();
        }
        
        // Should show sent confirmation
        await expect(page.getByText(/verification email.*sent/i)).toBeVisible();
      }
    });

    test('should provide spam folder guidance', async ({ page }) => {
      await page.goto('/auth/verify-email');
      
      // Should show spam/junk folder guidance
      await expect(page.getByText(/check.*spam.*junk.*folder/i)).toBeVisible();
      
      // Should show provider-specific guidance
      await expect(page.getByText(/gmail.*promotions.*tab/i)).toBeVisible();
      await expect(page.getByText(/outlook.*clutter.*folder/i)).toBeVisible();
    });
  });

  test.describe('Verification Success Flow', () => {
    test('should handle successful verification and redirect appropriately', async ({ page }) => {
      const validToken = 'valid_verification_token_12345';
      await page.goto(`/auth/verify-email?token=${validToken}`);
      
      // Mock successful verification
      await page.route('/api/auth/verify-email', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: 'verified-user-id',
              email: 'newuser@example.com',
              email_verified: true,
              username: 'newuser',
            },
            session: {
              id: 'new-session-id',
              user_id: 'verified-user-id',
              session_token: 'session-token',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            autoLogin: true,
          }),
        });
      });
      
      // Should show success message
      await expect(page.getByText('Email verified successfully')).toBeVisible();
      
      // Should automatically sign in and redirect
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Should show welcome message for new user
      await expect(page.getByText(/welcome.*arcadia/i)).toBeVisible();
      
      // User menu should be visible
      const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
      await expect(userMenu).toBeVisible();
    });

    test('should handle verification without auto-login', async ({ page }) => {
      const validToken = 'valid_no_autologin_token_12345';
      await page.goto(`/auth/verify-email?token=${validToken}`);
      
      // Mock successful verification without auto-login
      await mockAuthResponse<EmailVerificationResponse>(page, '/api/auth/verify-email', {
        status: 200,
        body: {
          success: true,
          user: createMockTestUser({
            id: 'verified-user-id',
            email: 'user@example.com',
            email_verified: true,
          }),
          autoLogin: false, // Don't auto-login
        },
      });
      
      // Should show success message
      await expect(page.getByText('Email verified successfully')).toBeVisible();
      
      // Should show login button instead of auto-redirect
      const loginButton = page.locator('[data-testid="continue-to-login-button"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('Continue to Sign In');
      
      // Clicking should redirect to login
      await loginButton.click();
      await page.waitForURL('/auth/login', { timeout: 5000 });
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should complete verification quickly', async ({ page }) => {
      const verificationTime = await measureAuthPerformance(page, async () => {
        const validToken = 'performance_test_token';
        
        await mockAuthResponse<EmailVerificationResponse>(page, '/api/auth/verify-email', {
          status: 200,
          body: {
            success: true,
            user: createMockTestUser({
              id: 'user-id',
              email: 'user@example.com',
              email_verified: true,
            }),
          },
        });
        
        await page.goto(`/auth/verify-email?token=${validToken}`);
        await expect(page.getByText('Email verified successfully')).toBeVisible();
      });
      
      // Verification should complete within 1.5 seconds
      expect(verificationTime).toBeLessThan(1500);
    });

    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/auth/verify-email');
      
      // Should be able to navigate with keyboard
      await page.keyboard.press('Tab');
      
      const emailInput = page.locator('[data-testid="resend-email-input"]');
      await expect(emailInput).toBeFocused();
      
      await page.keyboard.type('user@example.com');
      await page.keyboard.press('Tab');
      
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await expect(resendButton).toBeFocused();
      
      // Should be able to submit with Enter
      await page.keyboard.press('Enter');
      
      // Mock response for accessibility test
      await mockAuthResponse<ResendVerificationResponse>(page, '/api/auth/resend-verification', {
        status: 200,
        body: { success: true, message: 'Email sent' },
      });
    });

    test('should have proper ARIA labels and announcements', async ({ page }) => {
      await page.goto('/auth/verify-email');
      
      // Check for proper form labeling
      const emailInput = page.locator('[data-testid="resend-email-input"]');
      await expect(emailInput).toHaveAttribute('aria-label', /email/i);
      
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await expect(resendButton).toHaveAttribute('aria-describedby');
      
      // Error messages should be announced
      const errorRegion = page.locator('[role="alert"]');
      if (await errorRegion.isVisible()) {
        await expect(errorRegion).toHaveAttribute('aria-live', 'polite');
      }
      
      // Success messages should be announced
      const successRegion = page.locator('[role="status"]');
      if (await successRegion.isVisible()) {
        await expect(successRegion).toHaveAttribute('aria-live', 'polite');
      }
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle network failures gracefully', async ({ page, context }) => {
      await page.goto('/auth/verify-email');
      
      // Simulate network failure
      await context.route('/api/auth/resend-verification', route => route.abort());
      
      const emailInput = page.locator('[data-testid="resend-email-input"]');
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      
      await emailInput.fill('user@example.com');
      await resendButton.click();
      
      // Should show network error
      await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();
      
      // Should allow retry
      await expect(resendButton).toBeEnabled();
      await expect(emailInput).toHaveValue('user@example.com');
    });

    test('should handle concurrent verification attempts', async ({ browser }) => {
      // Create two contexts to simulate concurrent access
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const token = 'concurrent_access_token';
      
      // Mock that only first request succeeds
      let requestCount = 0;
      const mockResponse = async (route: Route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: { id: 'user-id', email: 'user@example.com', email_verified: true },
            }),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'This verification link has already been used',
              code: 'token_already_used',
              statusCode: 400,
            } satisfies AuthErrorResponse),
          });
        }
      };
      
      await page1.route('/api/auth/verify-email', mockResponse);
      await page2.route('/api/auth/verify-email', mockResponse);
      
      // Access verification page simultaneously
      await Promise.all([
        page1.goto(`/auth/verify-email?token=${token}`),
        page2.goto(`/auth/verify-email?token=${token}`),
      ]);
      
      // Wait for responses
      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);
      
      // One should succeed, one should fail
      const success1 = await page1.getByText('Email verified successfully').isVisible();
      const success2 = await page2.getByText('Email verified successfully').isVisible();
      const error1 = await page1.getByText('already been used').isVisible();
      const error2 = await page2.getByText('already been used').isVisible();
      
      // Exactly one should succeed
      expect(success1 || success2).toBeTruthy();
      expect(success1 && success2).toBeFalsy();
      
      // The other should show error
      expect(error1 || error2).toBeTruthy();
      
      await context1.close();
      await context2.close();
    });
  });
});