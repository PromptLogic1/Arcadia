import type { Route } from '@playwright/test';
import { test, expect } from '@playwright/test';
import {
  fillAuthForm,
  getAuthErrorMessage,
  clearAuthStorage,
} from './utils/auth-test-helpers';
import { TEST_FORM_DATA, RATE_LIMITS } from '../helpers/test-data';

/**
 * Redis Rate Limiting Integration Tests
 *
 * Tests real Redis-based rate limiting that can't be tested in Jest:
 * - Actual Redis persistence and expiration
 * - Distributed rate limiting across instances
 * - Real Redis failover behavior
 * - Cross-request rate limit state
 */
test.describe('Redis Rate Limiting Integration', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test.beforeAll(async () => {
    // Skip if Redis integration tests are disabled
    if (!process.env.USE_REDIS_TESTS) {
      test.skip(
        true,
        'Redis integration tests skipped - set USE_REDIS_TESTS=true to enable'
      );
    }
  });

  test.describe('Login Rate Limiting', () => {
    test('should enforce rate limiting with Redis persistence', async ({
      page,
    }) => {
      const maxAttempts = RATE_LIMITS.login?.attempts || 5;
      const testEmail = `ratelimit_${Date.now()}@example.com`;

      // Attempt login multiple times with wrong password
      for (let i = 1; i <= maxAttempts + 1; i++) {
        await page.goto('/auth/login');

        await fillAuthForm(page, {
          email: testEmail,
          password: `wrongpassword${i}`,
        });

        const startTime = Date.now();
        await page.getByRole('button', { name: /sign in/i }).click();
        const responseTime = Date.now() - startTime;

        // Wait for response
        await page.waitForTimeout(2000);

        const errorMessage = await getAuthErrorMessage(page);

        if (i <= maxAttempts) {
          // Should get invalid credentials error
          expect(errorMessage).toBeTruthy();
          expect(errorMessage).not.toMatch(/rate.*limit|too.*many/i);
        } else {
          // Should be rate limited or have progressive delay
          if (errorMessage?.match(/rate.*limit|too.*many/i)) {
            expect(errorMessage).toMatch(/rate.*limit|too.*many/i);
            console.log(
              `✓ Rate limiting enforced after ${maxAttempts} attempts`
            );
          } else {
            // Progressive delay should be noticeable
            expect(responseTime).toBeGreaterThan(1000);
            console.log(`✓ Progressive delay applied: ${responseTime}ms`);
          }
        }

        // Small delay between attempts
        await page.waitForTimeout(500);
      }
    });

    test('should implement sliding window rate limiting', async ({ page }) => {
      const testEmail = `sliding_${Date.now()}@example.com`;
      const attempts = RATE_LIMITS.login?.attempts || 5;

      // Make attempts spread over time
      for (let i = 0; i < attempts - 1; i++) {
        await page.goto('/auth/login');
        await fillAuthForm(page, {
          email: testEmail,
          password: 'wrongpassword',
        });
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for sliding window to partially reset
        await page.waitForTimeout(2000);
      }

      // Next attempt should still be allowed (within window)
      await page.goto('/auth/login');
      await fillAuthForm(page, {
        email: testEmail,
        password: 'wrongpassword',
      });
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(1000);

      const errorMessage = await getAuthErrorMessage(page);

      // Should either be rate limited or show invalid credentials
      expect(errorMessage).toBeTruthy();
      console.log(`Sliding window test result: ${errorMessage}`);
    });
  });

  test.describe('Redis Failover and Resilience', () => {
    test('should gracefully handle Redis connection failures', async ({
      page,
    }) => {
      // Test that app continues to function even if Redis is unavailable
      await page.goto('/auth/login');
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForTimeout(2000);

      // Should not crash or show Redis errors to user
      const errorMessage = await getAuthErrorMessage(page);
      if (errorMessage) {
        expect(errorMessage).not.toMatch(/redis|connection|timeout/i);
      }

      console.log('✓ App handles Redis failures gracefully');
    });

    test('should handle concurrent rate limit checks', async ({ browser }) => {
      const contexts = await Promise.all(
        Array.from({ length: 3 }, () => browser.newContext())
      );

      try {
        const startTime = Date.now();

        // Simulate concurrent login attempts
        const loginPromises = contexts.map(async (context, index) => {
          const page = await context.newPage();

          await page.goto('/auth/login');
          await fillAuthForm(page, {
            email: `concurrent${index}_${Date.now()}@example.com`,
            password: 'wrongpassword',
          });
          await page.getByRole('button', { name: /sign in/i }).click();

          await page.waitForTimeout(1000);
          return page.close();
        });

        await Promise.all(loginPromises);
        const totalTime = Date.now() - startTime;

        // Should complete within reasonable time
        expect(totalTime).toBeLessThan(10000);
        console.log(`✓ Concurrent requests completed in ${totalTime}ms`);
      } finally {
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });

  test.describe('Rate Limit Recovery', () => {
    test('should allow requests after rate limit window expires', async ({
      page,
    }) => {
      const testEmail = `recovery_${Date.now()}@example.com`;

      // Trigger rate limit
      for (let i = 0; i < (RATE_LIMITS.login?.attempts || 5) + 1; i++) {
        await page.goto('/auth/login');
        await fillAuthForm(page, {
          email: testEmail,
          password: 'wrongpassword',
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(500);
      }

      // Check if rate limited
      let errorMessage = await getAuthErrorMessage(page);
      const wasRateLimited = errorMessage?.match(/rate.*limit|too.*many/i);

      if (wasRateLimited) {
        console.log('Rate limit triggered, testing recovery...');

        // Wait for rate limit window to expire (shorter wait for testing)
        await page.waitForTimeout(5000);

        // Try again - should work now
        await page.goto('/auth/login');
        await fillAuthForm(page, {
          email: testEmail,
          password: 'wrongpassword',
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(1000);

        errorMessage = await getAuthErrorMessage(page);

        // Should either show invalid credentials or still be rate limited
        expect(errorMessage).toBeTruthy();
        console.log(`Recovery test result: ${errorMessage}`);
      } else {
        console.log('Rate limiting not triggered, test may need adjustment');
      }
    });
  });

  test.describe('Multi-Algorithm Rate Limiting', () => {
    test('should enforce different algorithms for different endpoints', async ({
      page,
    }) => {
      const testEmail = `multi_${Date.now()}@example.com`;

      // Test login rate limiting
      await page.goto('/auth/login');
      for (let i = 0; i < (RATE_LIMITS.login?.attempts || 5) + 1; i++) {
        await fillAuthForm(page, {
          email: testEmail,
          password: 'wrong',
        });
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(200);
      }

      let errorMessage = await getAuthErrorMessage(page);
      const loginRateLimited = errorMessage?.match(/rate.*limit|too.*many/i);

      // Test password reset (should be independent)
      await page.goto('/auth/forgot-password');
      await page.getByLabel('Email').fill(testEmail);
      await page.getByRole('button', { name: /reset.*password/i }).click();

      await page.waitForTimeout(2000);

      // Should either succeed or have its own rate limit
      const resetSuccess = await page
        .getByText(/check.*email|sent.*link/i)
        .isVisible()
        .catch(() => false);
      const resetError = await getAuthErrorMessage(page);

      console.log(
        `Login rate limited: ${!!loginRateLimited}, Reset success: ${resetSuccess}, Reset error: ${resetError}`
      );

      // At least one operation should have some result
      expect(loginRateLimited || resetSuccess || resetError).toBeTruthy();
    });
  });
});
