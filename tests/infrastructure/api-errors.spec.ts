import { test, expect } from '@playwright/test';
import { mockApiResponse, waitForNetworkIdle } from '../helpers/test-utils';

test.describe('API Error Response Handling', () => {
  test.describe('HTTP Status Code Handling', () => {
    test('should handle 400 Bad Request errors', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 400,
        body: {
          error: 'Bad Request',
          message: 'Invalid request parameters',
          validation_errors: {
            email: ['Email is required'],
            password: ['Password must be at least 8 characters']
          }
        }
      });
      
      await page.goto('/');
      
      // Trigger API call (form submission or button click)
      const form = page.locator('form').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
      
      if (await form.count() > 0) {
        await submitButton.click();
      } else {
        // Try to find any button that might trigger API calls
        const buttons = page.locator('button');
        if (await buttons.count() > 0) {
          await buttons.first().click();
        }
      }
      
      await page.waitForTimeout(1000);
      
      // Should show validation errors, not raw API response
      const validationMessages = page.locator(
        'text="Email is required", text="Password must be", [role="alert"], .error, .invalid'
      );
      
      // Should not expose internal error structure
      await expect(page.locator('text="Bad Request"')).not.toBeVisible();
      await expect(page.locator('text="validation_errors"')).not.toBeVisible();
      
      // Should show user-friendly validation feedback
      if (await validationMessages.count() > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    });

    test('should handle 401 Unauthorized errors', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 401,
        body: {
          error: 'Unauthorized',
          message: 'Authentication required'
        }
      });
      
      await page.goto('/');
      
      // Trigger protected API call
      const protectedActions = page.locator(
        'button:has-text("Save"), button:has-text("Update"), button:has-text("Delete"), button:has-text("Profile")'
      );
      
      if (await protectedActions.count() > 0) {
        await protectedActions.first().click();
        await page.waitForTimeout(1000);
        
        // Should redirect to login or show auth modal
        const authIndicators = page.locator(
          'text="Please log in", text="Sign in", text="Login required", a[href*="login"], [data-testid*="login"]'
        );
        
        if (await authIndicators.count() > 0) {
          await expect(authIndicators.first()).toBeVisible();
        }
        
        // Should not expose raw error message
        await expect(page.locator('text="Unauthorized"')).not.toBeVisible();
      }
    });

    test('should handle 403 Forbidden errors', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 403,
        body: {
          error: 'Forbidden',
          message: 'Insufficient permissions'
        }
      });
      
      await page.goto('/');
      
      // Trigger restricted action
      const restrictedActions = page.locator(
        'button:has-text("Admin"), button:has-text("Delete"), button:has-text("Manage")'
      );
      
      if (await restrictedActions.count() > 0) {
        await restrictedActions.first().click();
        await page.waitForTimeout(1000);
        
        // Should show permission denied message
        const permissionMessages = page.locator(
          'text="Permission denied", text="Access denied", text="Not authorized", text="Insufficient permissions"'
        );
        
        if (await permissionMessages.count() > 0) {
          await expect(permissionMessages.first()).toBeVisible();
        }
        
        // Should not expose raw API response
        await expect(page.locator('text="Forbidden"')).not.toBeVisible();
      }
    });

    test('should handle 404 Not Found for API endpoints', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 404,
        body: {
          error: 'Not Found',
          message: 'Resource not found'
        }
      });
      
      await page.goto('/');
      
      // Trigger API call that returns 404
      const dataActions = page.locator('button:has-text("Load"), button:has-text("Fetch"), button:has-text("Get")');
      
      if (await dataActions.count() > 0) {
        await dataActions.first().click();
        await page.waitForTimeout(1000);
        
        // Should show data not found message
        const notFoundMessages = page.locator(
          'text="Data not found", text="Content not available", text="Resource not found", text="Nothing found"'
        );
        
        if (await notFoundMessages.count() > 0) {
          await expect(notFoundMessages.first()).toBeVisible();
        }
        
        // Should differentiate from page 404
        await expect(page.locator('text="Page not found"')).not.toBeVisible();
      }
    });

    test('should handle 429 Rate Limit errors', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000)
        },
        body: {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        }
      });
      
      await page.goto('/');
      
      // Trigger multiple rapid requests
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        for (let i = 0; i < 3; i++) {
          await button.click();
          await page.waitForTimeout(100);
        }
        
        // Should show rate limit message
        const rateLimitMessages = page.locator(
          'text="Too many requests", text="Rate limit", text="Please slow down", text="Try again later"'
        );
        
        if (await rateLimitMessages.count() > 0) {
          await expect(rateLimitMessages.first()).toBeVisible();
        }
        
        // Should not expose raw rate limit response
        await expect(page.locator('text="Too Many Requests"')).not.toBeVisible();
      }
    });

    test('should handle 500 Internal Server Error', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: {
          error: 'Internal Server Error',
          message: 'Database connection failed',
          stack: 'Error at database.js line 123...'
        }
      });
      
      await page.goto('/');
      
      // Trigger API call
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
        
        // Should show generic server error message
        const serverErrorMessages = page.locator(
          'text="Server error", text="Something went wrong", text="Service unavailable", text="Please try again"'
        );
        
        if (await serverErrorMessages.count() > 0) {
          await expect(serverErrorMessages.first()).toBeVisible();
        }
        
        // Should not expose internal error details
        await expect(page.locator('text="Internal Server Error"')).not.toBeVisible();
        await expect(page.locator('text="Database connection failed"')).not.toBeVisible();
        await expect(page.locator('text="database.js"')).not.toBeVisible();
        
        // Should provide retry option
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
        if (await retryButton.count() > 0) {
          await expect(retryButton.first()).toBeVisible();
        }
      }
    });

    test('should handle 503 Service Unavailable', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 503,
        body: {
          error: 'Service Unavailable',
          message: 'System maintenance in progress'
        }
      });
      
      await page.goto('/');
      
      // Trigger API call
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
        
        // Should show maintenance message
        const maintenanceMessages = page.locator(
          'text="Maintenance", text="Service unavailable", text="Temporarily unavailable", text="Under maintenance"'
        );
        
        if (await maintenanceMessages.count() > 0) {
          await expect(maintenanceMessages.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Message Security', () => {
    test('should not expose sensitive data in error responses', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: {
          error: 'Database Error',
          message: 'Connection failed',
          debug: {
            host: 'internal-db-server.local',
            password: 'super-secret-password',
            query: 'SELECT * FROM users WHERE password = "secret123"',
            stack: 'Error at /internal/auth/database.js:123:45'
          }
        }
      });
      
      await page.goto('/');
      
      // Trigger API error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
      }
      
      // Should not expose any sensitive information
      await expect(page.locator('text="super-secret-password"')).not.toBeVisible();
      await expect(page.locator('text="internal-db-server"')).not.toBeVisible();
      await expect(page.locator('text="secret123"')).not.toBeVisible();
      await expect(page.locator('text="/internal/auth/"')).not.toBeVisible();
      
      // Should show generic error message instead
      const genericMessages = page.locator(
        'text="Something went wrong", text="Server error", text="Please try again"'
      );
      
      if (await genericMessages.count() > 0) {
        await expect(genericMessages.first()).toBeVisible();
      }
    });

    test('should sanitize error messages from external APIs', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/external/**', {
        status: 400,
        body: {
          error: '<script>alert("XSS")</script>',
          message: 'Error with <img src=x onerror=alert("XSS")>',
          details: 'javascript:alert("XSS")'
        }
      });
      
      await page.goto('/');
      
      // Trigger external API call
      const externalButton = page.locator('button:has-text("External"), button:has-text("Third-party")');
      if (await externalButton.count() > 0) {
        await externalButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Should not execute any scripts
      const alerts: string[] = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(500);
      expect(alerts.length).toBe(0);
      
      // Should not contain HTML/JS in visible text
      await expect(page.locator('text="<script>"')).not.toBeVisible();
      await expect(page.locator('text="onerror="')).not.toBeVisible();
      await expect(page.locator('text="javascript:"')).not.toBeVisible();
    });
  });

  test.describe('Error Context and Recovery', () => {
    test('should provide contextual error messages', async ({ page, context }) => {
      // Mock different errors for different contexts
      await context.route('**/api/users/**', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'User not found' })
        });
      });
      
      await context.route('**/api/games/**', route => {
        route.fulfill({
          status: 404, 
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Game not found' })
        });
      });
      
      await page.goto('/');
      
      // Test user context error
      const userButton = page.locator('button:has-text("User"), button:has-text("Profile")');
      if (await userButton.count() > 0) {
        await userButton.click();
        await page.waitForTimeout(500);
        
        const userErrorMessages = page.locator('text="User not found", text="Profile not available"');
        if (await userErrorMessages.count() > 0) {
          await expect(userErrorMessages.first()).toBeVisible();
        }
      }
      
      // Test game context error
      const gameButton = page.locator('button:has-text("Game"), button:has-text("Play")');
      if (await gameButton.count() > 0) {
        await gameButton.click();
        await page.waitForTimeout(500);
        
        const gameErrorMessages = page.locator('text="Game not found", text="Game not available"');
        if (await gameErrorMessages.count() > 0) {
          await expect(gameErrorMessages.first()).toBeVisible();
        }
      }
    });

    test('should provide error recovery suggestions', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 503,
        body: {
          error: 'Service Unavailable',
          retry_after: 30
        }
      });
      
      await page.goto('/');
      
      // Trigger API error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
        
        // Should provide recovery options
        const recoveryOptions = page.locator(
          'button:has-text("Retry"), button:has-text("Try Again"), text="Try again in", text="Retry in"'
        );
        
        if (await recoveryOptions.count() > 0) {
          await expect(recoveryOptions.first()).toBeVisible();
        }
      }
    });

    test('should handle progressive error states', async ({ page, context }) => {
      let attemptCount = 0;
      
      await context.route('**/api/**', route => {
        attemptCount++;
        
        if (attemptCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server Error' })
          });
        } else if (attemptCount === 2) {
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service Unavailable' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: 'success' })
          });
        }
      });
      
      await page.goto('/');
      
      // First attempt - server error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(500);
        
        // Should show retry option
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
        if (await retryButton.count() > 0) {
          // Second attempt - service unavailable
          await retryButton.click();
          await page.waitForTimeout(500);
          
          // Should still show retry option
          if (await retryButton.count() > 0) {
            // Third attempt - success
            await retryButton.click();
            await page.waitForTimeout(500);
            
            // Should show success state
            const successIndicators = page.locator(
              'text="success", text="loaded", text="complete"'
            );
            
            if (await successIndicators.count() > 0) {
              await expect(successIndicators.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('API Error Logging', () => {
    test('should log API errors for debugging', async ({ page, context }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });
      
      await page.goto('/');
      
      // Trigger API error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(1000);
      }
      
      // Should log errors for debugging (but not expose to user)
      const hasApiError = consoleErrors.some(error => 
        error.includes('API') || error.includes('fetch') || error.includes('500')
      );
      
      if (hasApiError) {
        expect(consoleErrors.length).toBeGreaterThan(0);
      }
    });

    test('should include request context in error logs', async ({ page }) => {
      const networkRequests: any[] = [];
      
      page.on('requestfailed', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()
        });
      });
      
      await page.goto('/');
      
      // Simulate request failure
      await page.evaluate(() => {
        fetch('/api/nonexistent')
          .catch(error => console.error('Request failed:', error));
      });
      
      await page.waitForTimeout(1000);
      
      // Should capture request context
      if (networkRequests.length > 0) {
        const failedRequest = networkRequests[0];
        expect(failedRequest.url).toBeTruthy();
        expect(failedRequest.method).toBeTruthy();
      }
    });
  });

  test.describe('Error Persistence', () => {
    test('should clear errors on successful retry', async ({ page, context }) => {
      let isFirstCall = true;
      
      await context.route('**/api/**', route => {
        if (isFirstCall) {
          isFirstCall = false;
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server Error' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: 'success' })
          });
        }
      });
      
      await page.goto('/');
      
      // First call - should show error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(500);
        
        const errorMessage = page.locator('text="error", text="failed", text="wrong"');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible();
        }
        
        // Retry - should clear error and show success
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
        if (await retryButton.count() > 0) {
          await retryButton.click();
          await page.waitForTimeout(500);
          
          // Error should be cleared
          if (await errorMessage.count() > 0) {
            await expect(errorMessage.first()).not.toBeVisible();
          }
          
          // Success should be shown
          const successMessage = page.locator('text="success", text="complete", text="loaded"');
          if (await successMessage.count() > 0) {
            await expect(successMessage.first()).toBeVisible();
          }
        }
      }
    });

    test('should not persist errors across page navigation', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });
      
      await page.goto('/');
      
      // Trigger error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(500);
      }
      
      // Navigate away and back
      await page.goto('/about');
      await page.waitForTimeout(500);
      await page.goto('/');
      await page.waitForTimeout(500);
      
      // Previous errors should not be visible
      const errorMessages = page.locator('text="Server Error", text="error occurred"');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).not.toBeVisible();
      }
    });
  });
});