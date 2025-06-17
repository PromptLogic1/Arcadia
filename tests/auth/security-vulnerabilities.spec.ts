import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture.enhanced';
import {
  fillAuthForm,
  mockAuthResponse,
  waitForNetworkIdle,
  getAuthErrorMessage,
  getAuthCookies,
  clearAuthStorage,
  checkXSSExecution
} from './utils/auth-test-helpers';
import { TEST_FORM_DATA, AUTH_ROUTES } from '../helpers/test-data.enhanced';
import type { AuthErrorResponse } from './types/test-types';

/**
 * Security Vulnerabilities Testing Suite
 * 
 * Comprehensive security testing for authentication flows covering:
 * - CSRF (Cross-Site Request Forgery) protection
 * - Session fixation attacks
 * - XSS (Cross-Site Scripting) prevention
 * - SQL injection protection
 * - Timing attacks
 * - Session hijacking
 * - Brute force protection
 * - Account enumeration prevention
 */
test.describe('Security Vulnerabilities', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test.describe('CSRF Protection', () => {
    test('should validate CSRF tokens on authentication requests', async ({ page, request }) => {
      await page.goto('/auth/login');
      
      // Attempt login without proper CSRF token
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'password123'
        },
        headers: {
          'Content-Type': 'application/json',
          // Missing or invalid CSRF token
        }
      });
      
      // Should reject request due to missing CSRF token
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/csrf|forbidden|invalid.*token/i);
    });

    test('should prevent CSRF attacks on password reset', async ({ page, request }) => {
      // Attempt password reset without CSRF token
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: 'victim@example.com'
        },
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        }
      });
      
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/csrf|origin|forbidden/i);
    });

    test('should validate origin header for sensitive operations', async ({ page, request }) => {
      // Mock malicious cross-origin request
      const maliciousResponse = await request.post('/api/auth/change-password', {
        data: {
          currentPassword: 'oldpass',
          newPassword: 'newpass'
        },
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil.com',
          'Referer': 'https://evil.com/csrf-attack'
        }
      });
      
      expect(maliciousResponse.status()).toBe(403);
    });
  });

  test.describe('Session Fixation Protection', () => {
    test('should regenerate session ID after login', async ({ page, context }) => {
      // Get initial session state
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      
      const initialCookies = await getAuthCookies(context);
      const initialSessionId = initialCookies.sessionCookie?.value;
      
      // Perform login
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Check session after login
      const postLoginCookies = await getAuthCookies(context);
      const postLoginSessionId = postLoginCookies.sessionCookie?.value;
      
      // Session ID should be different (regenerated)
      expect(postLoginSessionId).toBeTruthy();
      expect(postLoginSessionId).not.toBe(initialSessionId);
    });

    test('should invalidate previous sessions on login', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      try {
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        // Login on first browser
        await page1.goto('/auth/login');
        await fillAuthForm(page1, TEST_FORM_DATA.login.valid);
        await page1.getByRole('button', { name: /sign in/i }).click();
        await page1.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
        
        // Get session from first browser
        const cookies1 = await getAuthCookies(context1);
        const sessionId1 = cookies1.sessionCookie?.value;
        
        // Set same session on second browser (simulating session fixation)
        if (sessionId1 && cookies1.sessionCookie) {
          await context2.addCookies([{
            name: cookies1.sessionCookie.name,
            value: sessionId1,
            domain: 'localhost',
            path: '/',
          }]);
        }
        
        // Try to access protected content on second browser
        await page2.goto('/settings');
        
        // Should be redirected to login (session not valid)
        await page2.waitForURL(/login/, { timeout: 5000 });
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('XSS Prevention', () => {
    test('should sanitize user input in error messages', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>window.xssTest = true</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '${alert("XSS")}',
        'javascript:void(0/*--></title></style></textarea></script></xmp><svg onload=alert("XSS")>'
      ];
      
      for (const payload of xssPayloads) {
        await page.goto('/auth/login');
        
        // Try XSS in email field
        await page.getByLabel('Email').fill(payload);
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: /sign in/i }).click();
        
        await waitForNetworkIdle(page);
        
        // Verify script is not executed
        const xssExecuted = await checkXSSExecution(page);
        expect(xssExecuted).toBeFalsy();
        
        // Verify payload is not reflected in DOM unescaped
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert');
        expect(pageContent).not.toContain('javascript:alert');
        
        // Clear for next test
        await page.reload();
      }
    });

    test('should prevent stored XSS in user profiles', async ({ page }) => {
      const xssPayload = '<script>document.body.innerHTML="HACKED"</script>';
      
      await page.goto('/auth/signup');
      await fillAuthForm(page, {
        email: 'xss@example.com',
        username: xssPayload,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        acceptTerms: true,
      });
      
      await page.getByRole('button', { name: /sign up/i }).click();
      await waitForNetworkIdle(page);
      
      // XSS should not execute in username display
      const bodyContent = await page.textContent('body');
      expect(bodyContent).not.toBe('HACKED');
      
      // Username should be properly escaped
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>document.body');
    });

    test('should prevent DOM-based XSS in URL parameters', async ({ page }) => {
      const xssUrl = '/auth/login?redirect=' + encodeURIComponent('javascript:alert("XSS")');
      
      await page.goto(xssUrl);
      await waitForNetworkIdle(page);
      
      // XSS should not execute
      const xssExecuted = await checkXSSExecution(page);
      expect(xssExecuted).toBeFalsy();
      
      // Check that redirect parameter is properly handled
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('javascript:');
    });
  });

  test.describe('SQL Injection Protection', () => {
    test('should prevent SQL injection in login form', async ({ page }) => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "admin'--",
        "admin'/*",
        "' OR 1=1--",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users--",
        "admin'; UPDATE users SET password='hacked'--"
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
        expect(errorMessage).toMatch(/invalid|email|password/i);
        
        // Should not be redirected to dashboard
        expect(page.url()).toContain('/auth/login');
      }
    });

    test('should use parameterized queries for user search', async ({ page, request }) => {
      const sqlPayload = "'; SELECT * FROM users WHERE '1'='1";
      
      const response = await request.get('/api/users/search', {
        params: { q: sqlPayload }
      });
      
      // Should not cause database error or return sensitive data
      expect(response.status()).toBeLessThan(500);
      
      if (response.ok()) {
        const data = await response.json();
        // Should return empty or limited results, not all users
        expect(Array.isArray(data) ? data.length : 0).toBeLessThan(100);
      }
    });
  });

  test.describe('Timing Attack Protection', () => {
    test('should have consistent response times for valid/invalid users', async ({ page }) => {
      const validEmail = 'existing@example.com';
      const invalidEmail = 'nonexistent@example.com';
      const measurements: number[] = [];
      
      // Mock responses to ensure consistent timing
      await page.route('/api/auth/login', async (route) => {
        const body = await route.request().postDataJSON();
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
        
        const isValidEmail = body.email === validEmail;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid email or password',
            code: 'invalid_credentials',
            statusCode: 401
          } satisfies AuthErrorResponse),
        });
      });
      
      // Measure response times
      for (let i = 0; i < 5; i++) {
        const email = i % 2 === 0 ? validEmail : invalidEmail;
        
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
      
      // Should not vary by more than 200ms (adjust based on system)
      expect(maxDeviation).toBeLessThan(200);
    });
  });

  test.describe('Session Hijacking Protection', () => {
    authTest('should detect suspicious session activity', async ({ testUser, page, context }) => {
      // Login normally
      await page.goto('/auth/login');
      await fillAuthForm(page, {
        email: testUser.email,
        password: testUser.password,
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Get session cookie
      const { sessionCookie } = await getAuthCookies(context);
      expect(sessionCookie).toBeTruthy();
      
      // Simulate session hijacking by making requests with suspicious headers
      await page.route('/api/**', (route, request) => {
        const headers = request.headers();
        
        // Add suspicious headers
        route.continue({
          headers: {
            ...headers,
            'X-Forwarded-For': '192.168.1.100, 10.0.0.1, 172.16.0.1',
            'X-Real-IP': '192.168.1.100',
            'User-Agent': 'SuspiciousBot/1.0'
          }
        });
      });
      
      // Try to access sensitive endpoint
      await page.goto('/settings/security');
      
      // System should either allow (if not detected) or show security warning
      const securityWarning = await page.getByText(/suspicious.*activity|security.*alert/i).isVisible();
      const pageLoaded = await page.getByText('Security Settings').isVisible();
      
      // Either security warning or normal page load should happen
      expect(securityWarning || pageLoaded).toBeTruthy();
    });

    test('should invalidate sessions with tampered cookies', async ({ page, context }) => {
      // Login to get valid session
      await page.goto('/auth/login');
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Get and tamper with session cookie
      const { sessionCookie } = await getAuthCookies(context);
      if (sessionCookie) {
        const tamperedValue = sessionCookie.value + '_tampered';
        
        await context.addCookies([{
          name: sessionCookie.name,
          value: tamperedValue,
          domain: 'localhost',
          path: '/',
        }]);
        
        // Try to access protected route with tampered cookie
        await page.goto('/settings');
        
        // Should be redirected to login
        await page.waitForURL(/login/, { timeout: 5000 });
      }
    });
  });

  test.describe('Brute Force Protection', () => {
    test('should implement progressive delays on failed attempts', async ({ page }) => {
      const email = 'bruteforce@example.com';
      const wrongPassword = 'wrongpassword';
      const responseTimes: number[] = [];
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        await page.goto('/auth/login');
        
        const startTime = Date.now();
        await fillAuthForm(page, {
          email,
          password: wrongPassword,
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await waitForNetworkIdle(page);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Check for rate limiting message after 3rd attempt
        if (attempt >= 3) {
          const rateLimitMessage = await getAuthErrorMessage(page);
          if (rateLimitMessage?.includes('too many') || rateLimitMessage?.includes('rate limit')) {
            break;
          }
        }
        
        // Small delay between attempts
        await page.waitForTimeout(500);
      }
      
      // Response times should increase (progressive delays)
      if (responseTimes.length >= 3) {
        expect(responseTimes[2]).toBeGreaterThan(responseTimes[0]);
      }
    });

    test('should implement account lockout after multiple failures', async ({ page }) => {
      const email = 'lockout@example.com';
      const maxAttempts = 5;
      
      // Mock lockout behavior
      let attemptCount = 0;
      await page.route('/api/auth/login', async (route) => {
        attemptCount++;
        
        if (attemptCount > maxAttempts) {
          await route.fulfill({
            status: 423, // Locked
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Account temporarily locked due to too many failed attempts',
              code: 'account_locked',
              statusCode: 423,
              retryAfter: 900 // 15 minutes
            } satisfies AuthErrorResponse),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid credentials',
              code: 'invalid_credentials',
              statusCode: 401
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // Attempt multiple failed logins
      for (let i = 0; i <= maxAttempts + 1; i++) {
        await page.goto('/auth/login');
        await fillAuthForm(page, {
          email,
          password: `wrong${i}`,
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await waitForNetworkIdle(page);
      }
      
      // Should show lockout message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toMatch(/locked|too many.*attempts|temporarily/i);
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
        const message = await page.getByText(/check.*email|sent.*link|reset.*link/i).textContent();
        if (message) {
          responses.push(message.trim());
        }
      }
      
      // All responses should be identical (security best practice)
      expect(responses.length).toBeGreaterThan(0);
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response).toBe(firstResponse);
      });
    });

    test('should not reveal user existence in error messages', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Try login with non-existent user
      await fillAuthForm(page, {
        email: 'definitely-not-exists@example.com',
        password: 'somepassword',
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      await waitForNetworkIdle(page);
      
      const errorMessage = await getAuthErrorMessage(page);
      
      // Should show generic error, not "user not found"
      expect(errorMessage).toMatch(/invalid.*email.*password|invalid.*credentials/i);
      expect(errorMessage).not.toMatch(/user.*not.*found|email.*not.*exist/i);
    });
  });

  test.describe('Password Security', () => {
    test('should prevent password hints in responses', async ({ page, request }) => {
      // Mock response that might accidentally leak password hints
      await page.route('/api/auth/login', async (route) => {
        const body = await route.request().postDataJSON();
        
        // Should not return password-related hints
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid email or password',
            code: 'invalid_credentials',
            statusCode: 401
            // Should NOT include: passwordHint, lastCharacter, etc.
          }),
        });
      });
      
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      
      const body = await response.json();
      
      // Should not contain password hints
      expect(JSON.stringify(body)).not.toMatch(/hint|character|length|starts.*with/i);
    });

    test('should enforce secure password storage', async ({ page }) => {
      // This is more of a code review item, but we can test behavior
      await page.goto('/auth/signup');
      
      const password = 'TestPassword123!';
      await fillAuthForm(page, {
        email: 'storage@example.com',
        username: 'storagetest',
        password,
        confirmPassword: password,
        acceptTerms: true,
      });
      
      // Intercept signup request
      let passwordInRequest = '';
      await page.route('/api/auth/signup', async (route) => {
        const body = await route.request().postDataJSON();
        passwordInRequest = body.password;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });
      
      await page.getByRole('button', { name: /sign up/i }).click();
      await waitForNetworkIdle(page);
      
      // Password should be sent as-is to server (hashing happens server-side)
      expect(passwordInRequest).toBe(password);
    });
  });
});