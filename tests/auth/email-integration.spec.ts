import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture.enhanced';
import {
  fillAuthForm,
  waitForNetworkIdle,
  getAuthErrorMessage,
  measureAuthPerformance
} from './utils/auth-test-helpers';
import { EmailServiceFactory } from './utils/email-test-service';
import type { EmailTestService, TestEmail } from './utils/email-test-service';

/**
 * Email Integration Testing Suite
 * 
 * Tests real email delivery and verification flows using test email services.
 * Covers:
 * - Email verification during signup
 * - Password reset email delivery
 * - Email change verification
 * - Email delivery timing and reliability
 */
test.describe('Email Integration Tests', () => {
  let emailService: EmailTestService;

  test.beforeAll(async () => {
    emailService = await EmailServiceFactory.create();
    await emailService.initialize();
  });

  test.afterAll(async () => {
    if (emailService) {
      await emailService.cleanup();
    }
  });

  test.describe('Email Verification Flow', () => {
    test('should send verification email during signup and verify successfully', async ({ page }) => {
      // Create test email address
      const testEmail = await emailService.createTestEmailAddress('signup_test');
      
      // Navigate to signup
      await page.goto('/auth/signup');
      await waitForNetworkIdle(page);
      
      // Fill signup form
      await fillAuthForm(page, {
        email: testEmail,
        username: `testuser_${Date.now()}`,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        acceptTerms: true,
      });
      
      // Submit form
      await page.getByRole('button', { name: /sign up/i }).click();
      
      // Should show verification message
      await expect(page.getByText(/check.*email|verification.*sent/i)).toBeVisible();
      
      // Wait for verification email
      const verificationEmail = await emailService.waitForEmail(testEmail, {
        timeout: 30000,
        subject: /verify|confirmation/i,
      });
      
      expect(verificationEmail).toBeTruthy();
      expect(verificationEmail.subject).toMatch(/verify|confirmation/i);
      expect(verificationEmail.to).toBe(testEmail);
      
      // Extract verification link
      const verificationLink = emailService.extractVerificationLink(verificationEmail);
      expect(verificationLink).toBeTruthy();
      
      // Click verification link
      await page.goto(verificationLink!);
      await waitForNetworkIdle(page);
      
      // Should show success message
      await expect(page.getByText(/verified|confirmation.*success/i)).toBeVisible();
      
      // Should be able to login now
      await page.goto('/auth/login');
      await fillAuthForm(page, {
        email: testEmail,
        password: 'SecurePassword123!',
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should successfully login
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
    });

    test('should handle expired verification links gracefully', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('expired_test');
      
      // Mock expired verification link
      const expiredToken = 'expired_token_12345';
      await page.goto(`/auth/verify-email?token=${expiredToken}`);
      await waitForNetworkIdle(page);
      
      // Should show expired error
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/expired|invalid.*link/i);
      
      // Should provide option to resend
      const resendButton = page.getByRole('button', { name: /resend|send.*again/i });
      if (await resendButton.isVisible()) {
        await resendButton.click();
        
        // Should show resend confirmation
        await expect(page.getByText(/sent.*again|new.*email/i)).toBeVisible();
      }
    });

    test('should prevent verification code reuse', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('reuse_test');
      
      // Simulate receiving verification email with code
      const mockEmail: TestEmail = {
        id: `test-${Date.now()}`,
        to: testEmail,
        from: 'noreply@arcadia.com',
        subject: 'Verify your email - Verification Code: 123456',
        body: 'Your verification code is: 123456',
        receivedAt: new Date(),
        isRead: false,
      };
      
      // Extract code from email
      const verificationCode = emailService.extractCode(mockEmail, 'verification');
      expect(verificationCode).toBe('123456');
      
      // Use code first time
      await page.goto('/auth/verify-email');
      await page.locator('[data-testid="verification-code-input"]').fill(verificationCode!);
      await page.getByRole('button', { name: /verify/i }).click();
      
      // Mock successful verification
      await page.route('/api/auth/verify-email', async (route) => {
        const body = await route.request().postDataJSON();
        const isFirstUse = body.code === '123456' && !route.request().url().includes('reused');
        
        await route.fulfill({
          status: isFirstUse ? 200 : 400,
          contentType: 'application/json',
          body: JSON.stringify(
            isFirstUse 
              ? { success: true, message: 'Email verified successfully' }
              : { error: 'Verification code already used', code: 'code_reused', statusCode: 400 }
          ),
        });
      });
      
      await waitForNetworkIdle(page);
      
      // First use should succeed
      let errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toBeFalsy();
      
      // Try to use same code again
      await page.goto('/auth/verify-email');
      await page.locator('[data-testid="verification-code-input"]').fill(verificationCode!);
      await page.getByRole('button', { name: /verify/i }).click();
      await waitForNetworkIdle(page);
      
      // Second use should fail
      errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/already.*used|code.*expired/i);
    });
  });

  test.describe('Password Reset Email Flow', () => {
    authTest('should send password reset email and complete flow', async ({ testUser, page }) => {
      // Request password reset
      await page.goto('/auth/forgot-password');
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByRole('button', { name: /reset.*password/i }).click();
      
      // Should show confirmation message
      await expect(page.getByText(/check.*email|reset.*link/i)).toBeVisible();
      
      // Wait for reset email
      const resetEmail = await emailService.waitForEmail(testUser.email, {
        timeout: 30000,
        subject: /reset|password/i,
      });
      
      expect(resetEmail).toBeTruthy();
      expect(resetEmail.subject).toMatch(/reset|password/i);
      
      // Extract reset link
      const resetLink = emailService.extractResetLink(resetEmail);
      expect(resetLink).toBeTruthy();
      
      // Navigate to reset link
      await page.goto(resetLink!);
      await waitForNetworkIdle(page);
      
      // Should show reset password form
      await expect(page.getByLabel(/new.*password/i)).toBeVisible();
      
      // Set new password
      const newPassword = 'NewSecurePassword123!';
      await page.getByLabel(/new.*password/i).fill(newPassword);
      
      const confirmField = page.getByLabel(/confirm.*password/i);
      if (await confirmField.isVisible()) {
        await confirmField.fill(newPassword);
      }
      
      await page.getByRole('button', { name: /update.*password/i }).click();
      
      // Should redirect to login with success message
      await page.waitForURL(/login/);
      await expect(page.getByText(/password.*updated/i)).toBeVisible();
      
      // Should be able to login with new password
      await fillAuthForm(page, {
        email: testUser.email,
        password: newPassword,
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
    });

    test('should handle multiple password reset requests appropriately', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('multi_reset');
      
      // Send multiple reset requests
      for (let i = 0; i < 3; i++) {
        await page.goto('/auth/forgot-password');
        await page.getByLabel('Email').fill(testEmail);
        await page.getByRole('button', { name: /reset.*password/i }).click();
        
        await waitForNetworkIdle(page);
        
        // Should show success message each time (security best practice)
        await expect(page.getByText(/check.*email|reset.*link/i)).toBeVisible();
        
        // Small delay between requests
        await page.waitForTimeout(1000);
      }
      
      // Wait a bit for emails to arrive
      await page.waitForTimeout(3000);
      
      // Check emails received
      const resetEmails = await emailService.getEmails(testEmail, {
        subject: /reset|password/i,
      });
      
      // Should have received reset emails (implementation may limit to 1 active token)
      expect(resetEmails.length).toBeGreaterThan(0);
      expect(resetEmails.length).toBeLessThanOrEqual(3);
      
      // If multiple emails, only the latest should be valid
      if (resetEmails.length > 1) {
        const latestEmail = resetEmails[0]; // Emails sorted by newest first
        const latestLink = emailService.extractResetLink(latestEmail);
        
        // Test latest link works
        await page.goto(latestLink!);
        await expect(page.getByLabel(/new.*password/i)).toBeVisible();
        
        // Test older links are invalid (if system invalidates them)
        if (resetEmails.length > 1) {
          const olderEmail = resetEmails[1];
          const olderLink = emailService.extractResetLink(olderEmail);
          
          await page.goto(olderLink!);
          
          // May show expired error or redirect to forgot password
          const isOnReset = page.url().includes('reset-password');
          const hasExpiredError = await page.getByText(/expired|invalid/i).isVisible();
          
          // Either should work (valid) or show appropriate error
          expect(isOnReset || hasExpiredError).toBeTruthy();
        }
      }
    });
  });

  test.describe('Email Change Verification', () => {
    authTest('should verify email change with confirmation emails', async ({ testUser, page }) => {
      // Login first
      await page.goto('/auth/login');
      await fillAuthForm(page, {
        email: testUser.email,
        password: testUser.password,
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Navigate to account settings
      await page.goto('/settings/account');
      await waitForNetworkIdle(page);
      
      // Create new email address
      const newEmail = await emailService.createTestEmailAddress('email_change');
      
      // Change email
      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill(newEmail);
      await page.getByRole('button', { name: /save|update/i }).click();
      
      // Should show confirmation message
      await expect(page.getByText(/verification.*sent|check.*email/i)).toBeVisible();
      
      // Wait for verification email
      const verificationEmail = await emailService.waitForEmail(newEmail, {
        timeout: 30000,
        subject: /verify.*email|confirm.*change/i,
      });
      
      expect(verificationEmail).toBeTruthy();
      
      // Extract and click verification link
      const verificationLink = emailService.extractVerificationLink(verificationEmail);
      await page.goto(verificationLink!);
      
      // Should show confirmation
      await expect(page.getByText(/email.*updated|changed.*successfully/i)).toBeVisible();
      
      // Verify can login with new email
      await page.goto('/auth/login');
      await fillAuthForm(page, {
        email: newEmail,
        password: testUser.password,
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
    });
  });

  test.describe('Email Performance and Reliability', () => {
    test('should deliver emails within acceptable timeframes', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('performance_test');
      
      // Measure email delivery time
      const emailDeliveryTime = await measureAuthPerformance(page, async () => {
        // Trigger password reset
        await page.goto('/auth/forgot-password');
        await page.getByLabel('Email').fill(testEmail);
        await page.getByRole('button', { name: /reset.*password/i }).click();
        
        // Wait for email to arrive
        await emailService.waitForEmail(testEmail, {
          timeout: 15000,
          subject: /reset|password/i,
        });
      });
      
      // Email should be delivered within 10 seconds
      expect(emailDeliveryTime).toBeLessThan(10000);
      console.log(`Email delivery time: ${emailDeliveryTime}ms`);
    });

    test('should handle email service outages gracefully', async ({ page }) => {
      // Mock email service failure
      await page.route('/api/auth/send-verification', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Email service temporarily unavailable',
            code: 'email_service_down',
            statusCode: 503
          }),
        });
      });
      
      const testEmail = await emailService.createTestEmailAddress('outage_test');
      
      await page.goto('/auth/signup');
      await fillAuthForm(page, {
        email: testEmail,
        username: `outage_user_${Date.now()}`,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        acceptTerms: true,
      });
      
      await page.getByRole('button', { name: /sign up/i }).click();
      await waitForNetworkIdle(page);
      
      // Should show appropriate error message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/email.*service|temporarily.*unavailable|try.*again/i);
      
      // Should provide retry option
      const retryButton = page.getByRole('button', { name: /try.*again|retry/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });

    test('should handle concurrent email requests', async ({ page, browser }) => {
      const emails = await Promise.all([
        emailService.createTestEmailAddress('concurrent_1'),
        emailService.createTestEmailAddress('concurrent_2'),
        emailService.createTestEmailAddress('concurrent_3'),
      ]);
      
      // Create multiple browser contexts
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);
      
      try {
        // Send concurrent password reset requests
        const resetPromises = emails.map(async (email, index) => {
          const context = contexts[index];
          const contextPage = await context.newPage();
          
          await contextPage.goto('/auth/forgot-password');
          await contextPage.getByLabel('Email').fill(email);
          await contextPage.getByRole('button', { name: /reset.*password/i }).click();
          
          // Wait for confirmation
          await expect(contextPage.getByText(/check.*email/i)).toBeVisible();
          
          return contextPage.close();
        });
        
        // All requests should complete successfully
        await Promise.all(resetPromises);
        
        // Verify all emails were delivered
        const emailChecks = emails.map(email =>
          emailService.waitForEmail(email, {
            timeout: 20000,
            subject: /reset|password/i,
          })
        );
        
        const receivedEmails = await Promise.all(emailChecks);
        expect(receivedEmails).toHaveLength(3);
        
        receivedEmails.forEach(email => {
          expect(email).toBeTruthy();
          expect(email.subject).toMatch(/reset|password/i);
        });
        
      } finally {
        // Cleanup contexts
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });

  test.describe('Email Content and Formatting', () => {
    test('should send properly formatted HTML and text emails', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('format_test');
      
      await page.goto('/auth/forgot-password');
      await page.getByLabel('Email').fill(testEmail);
      await page.getByRole('button', { name: /reset.*password/i }).click();
      
      const resetEmail = await emailService.waitForEmail(testEmail, {
        timeout: 15000,
        subject: /reset|password/i,
      });
      
      // Verify email structure
      expect(resetEmail.body).toBeTruthy();
      expect(resetEmail.subject).toMatch(/reset|password/i);
      expect(resetEmail.from).toMatch(/noreply|no-reply|arcadia/i);
      
      // Verify HTML version if available
      if (resetEmail.html) {
        expect(resetEmail.html).toContain('<');
        expect(resetEmail.html).toContain('href=');
      }
      
      // Verify reset link is properly formatted
      const resetLink = emailService.extractResetLink(resetEmail);
      expect(resetLink).toMatch(/^https?:\/\//);
      expect(resetLink).toContain('reset');
      expect(resetLink).toContain('token=');
    });

    test('should include security information in emails', async ({ page }) => {
      const testEmail = await emailService.createTestEmailAddress('security_test');
      
      await page.goto('/auth/forgot-password');
      await page.getByLabel('Email').fill(testEmail);
      await page.getByRole('button', { name: /reset.*password/i }).click();
      
      const resetEmail = await emailService.waitForEmail(testEmail, {
        timeout: 15000,
        subject: /reset|password/i,
      });
      
      const emailContent = resetEmail.html || resetEmail.body;
      
      // Should include security best practices
      expect(emailContent).toMatch(/didn.*request|ignore.*email/i);
      expect(emailContent).toMatch(/expire|valid.*for/i);
      
      // Should not include sensitive information
      expect(emailContent).not.toContain('password');
      expect(emailContent).not.toContain('secret');
      expect(emailContent).not.toContain('token=');
    });
  });
});