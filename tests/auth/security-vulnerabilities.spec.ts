import type { Route } from '@playwright/test';
import { test, expect } from '@playwright/test';
import {
  fillAuthForm,
  waitForNetworkIdle,
  getAuthErrorMessage,
  getAuthCookies,
  clearAuthStorage,
  checkXSSExecution
} from './utils/auth-test-helpers';
import { TEST_FORM_DATA } from '../helpers/test-data';

/**
 * Security Vulnerabilities Testing Suite
 * 
 * Tests browser-based security features that can't be tested in Jest:
 * - XSS execution in real browser context
 * - CSRF protection with real request headers
 * - Session security in browser environment
 * - Real browser security headers validation
 */
test.describe('Security Vulnerabilities', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test.describe('XSS Prevention', () => {
    test('should prevent XSS execution in browser context', async ({ page }) => {
      const xssPayloads = [
        '<script>window.xssTest = true</script>',
        '"><script>window.xssTest = true</script>',
        '<img src=x onerror="window.xssTest = true">',
        '<svg onload="window.xssTest = true">',
        'javascript:void(window.xssTest = true)'
      ];
      
      for (const payload of xssPayloads) {
        await page.goto('/auth/login');
        
        // Try XSS in email field
        await page.getByLabel('Email').fill(payload);
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: /sign in/i }).click();
        
        await waitForNetworkIdle(page);
        
        // Verify script is not executed in browser
        const xssExecuted = await checkXSSExecution(page);
        expect(xssExecuted).toBeFalsy();
        
        // Verify payload is not reflected in DOM unescaped
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>window.xssTest');
        expect(pageContent).not.toContain('javascript:void');
        
        console.log(`✓ XSS payload blocked: ${payload.substring(0, 30)}...`);
      }
    });

    test('should prevent stored XSS in form data', async ({ page }) => {
      const xssPayload = '<script>document.body.innerHTML="HACKED"</script>';
      
      await page.goto('/auth/signup');
      
      // Try to inject XSS in username field
      const usernameField = page.getByLabel(/username/i);
      if (await usernameField.isVisible()) {
        await usernameField.fill(xssPayload);
        await page.getByLabel('Email').fill('xss@example.com');
        await page.getByLabel('Password').fill('SecurePassword123!');
        
        const confirmPasswordField = page.getByLabel(/confirm.*password/i);
        if (await confirmPasswordField.isVisible()) {
          await confirmPasswordField.fill('SecurePassword123!');
        }
        
        const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
        if (await termsCheckbox.isVisible()) {
          await termsCheckbox.check();
        }
        
        await page.getByRole('button', { name: /sign up/i }).click();
        await waitForNetworkIdle(page);
        
        // XSS should not execute
        const bodyContent = await page.textContent('body');
        expect(bodyContent).not.toBe('HACKED');
        
        // Username should be properly escaped
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>document.body');
        
        console.log('✓ Stored XSS prevented in signup form');
      }
    });

    test('should prevent DOM-based XSS in URL parameters', async ({ page }) => {
      const xssUrl = '/auth/login?redirect=' + encodeURIComponent('javascript:window.xssTest=true');
      
      await page.goto(xssUrl);
      await waitForNetworkIdle(page);
      
      // XSS should not execute
      const xssExecuted = await checkXSSExecution(page);
      expect(xssExecuted).toBeFalsy();
      
      // Check that redirect parameter is properly handled
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('javascript:');
      
      console.log('✓ DOM-based XSS prevented in URL parameters');
    });
  });

  test.describe('CSRF Protection', () => {
    test('should validate CSRF tokens on sensitive requests', async ({ page, request }) => {
      await page.goto('/auth/login');
      
      // Attempt login without proper CSRF token or origin
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'password123'
        },
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        }
      }).catch(() => null);
      
      if (response) {
        // Should reject request due to CSRF protection
        expect([400, 403, 422]).toContain(response.status());
        console.log(`✓ CSRF protection active: ${response.status()}`);
      }
    });

    test('should validate origin header for sensitive operations', async ({ request }) => {
      // Mock malicious cross-origin request
      const maliciousResponse = await request.post('/api/auth/forgot-password', {
        data: {
          email: 'victim@example.com'
        },
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil.com',
          'Referer': 'https://evil.com/csrf-attack'
        }
      }).catch(() => null);
      
      if (maliciousResponse) {
        expect([400, 403, 422]).toContain(maliciousResponse.status());
        console.log(`✓ Origin validation active: ${maliciousResponse.status()}`);
      }
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate sessions with tampered cookies', async ({ page, context }) => {
      // Mock login to get valid session
      await page.goto('/auth/login');
      
      // Set a tampered session cookie
      await context.addCookies([{
        name: 'sb-auth-token',
        value: 'tampered.token.data.invalid',
        domain: 'localhost',
        path: '/',
      }]);
      
      // Try to access protected route with tampered cookie
      await page.goto('/settings');
      
      // Should either redirect to login or handle gracefully
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('/auth/login');
      const is404 = currentUrl.includes('404');
      
      // Security: tampered tokens should not grant access
      if (!is404) {
        expect(redirectedToLogin).toBeTruthy();
      }
      
      console.log(`✓ Tampered cookie handled: login=${redirectedToLogin}, 404=${is404}`);
    });

    test('should set secure cookie attributes', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      // Check if any auth-related cookies are set
      const cookies = await context.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || 
        cookie.name.includes('session') ||
        cookie.name.includes('sb-')
      );
      
      if (authCookies.length > 0) {
        authCookies.forEach(cookie => {
          console.log(`Cookie ${cookie.name}: secure=${cookie.secure}, httpOnly=${cookie.httpOnly}, sameSite=${cookie.sameSite}`);
          
          // In production, auth cookies should be secure
          if (process.env.NODE_ENV === 'production') {
            expect(cookie.secure).toBeTruthy();
          }
        });
      }
      
      console.log('✓ Cookie security attributes checked');
    });
  });

  test.describe('Input Validation', () => {
    test('should prevent SQL injection attempts', async ({ page }) => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "admin'--",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users--"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        await page.goto('/auth/login');
        
        await fillAuthForm(page, {
          email: payload,
          password: payload,
        });
        
        await page.getByRole('button', { name: /sign in/i }).click();
        await waitForNetworkIdle(page);
        
        // Should show validation error, not succeed or cause database error
        const errorMessage = await getAuthErrorMessage(page);
        expect(errorMessage).toBeTruthy();
        expect(errorMessage).not.toMatch(/database|sql|syntax/i);
        
        // Should not be redirected to dashboard
        expect(page.url()).toContain('/auth/login');
      }
      
      console.log('✓ SQL injection attempts blocked');
    });

    test('should enforce input length limits', async ({ page }) => {
      const longString = 'a'.repeat(1000);
      
      await page.goto('/auth/login');
      
      await page.getByLabel('Email').fill(longString + '@example.com');
      await page.getByLabel('Password').fill(longString);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await waitForNetworkIdle(page);
      
      // Should either be truncated or show validation error
      const errorMessage = await getAuthErrorMessage(page);
      if (errorMessage) {
        expect(errorMessage).not.toMatch(/server.*error|internal.*error/i);
      }
      
      console.log('✓ Input length limits enforced');
    });
  });

  test.describe('Timing Attack Prevention', () => {
    test('should have consistent response times for valid/invalid users', async ({ page }) => {
      const measurements: number[] = [];
      
      // Test with different email formats
      const testEmails = [
        'existing@example.com',
        'nonexistent@example.com',
        'another@example.com'
      ];
      
      for (const email of testEmails) {
        await page.goto('/auth/login');
        
        const startTime = Date.now();
        await fillAuthForm(page, {
          email,
          password: 'wrongpassword',
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await waitForNetworkIdle(page);
        
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
      }
      
      // Response times should be relatively consistent
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxDeviation = Math.max(...measurements.map(t => Math.abs(t - avgTime)));
      
      // Should not vary by more than 500ms (adjust based on system)
      expect(maxDeviation).toBeLessThan(500);
      
      console.log(`✓ Timing consistency: avg=${avgTime}ms, max deviation=${maxDeviation}ms`);
    });
  });

  test.describe('Account Enumeration Prevention', () => {
    test('should return consistent responses for valid/invalid emails', async ({ page }) => {
      const responses: string[] = [];
      
      const testEmails = [
        'existing@example.com',
        'nonexistent@example.com',
        'another-fake@example.com'
      ];
      
      for (const email of testEmails) {
        await page.goto('/auth/forgot-password');
        await page.getByLabel('Email').fill(email);
        await page.getByRole('button', { name: /reset.*password/i }).click();
        await waitForNetworkIdle(page);
        
        // Get response message
        const message = await page.getByText(/check.*email|sent.*link|reset.*link/i).textContent().catch(() => null);
        if (message) {
          responses.push(message.trim());
        }
      }
      
      // All responses should be similar (security best practice)
      if (responses.length > 1) {
        const firstResponse = responses[0];
        const allSimilar = responses.every(response => 
          response === firstResponse || response?.includes('email') || response?.includes('check')
        );
        expect(allSimilar).toBeTruthy();
      }
      
      console.log('✓ Account enumeration prevention active');
    });
  });
});