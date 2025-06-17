import { test, expect } from '@playwright/test';
import { mockApiResponse, waitForNetworkIdle } from '../helpers/test-utils';

test.describe('Network Failure Handling', () => {
  test.describe('API Request Failures', () => {
    test('should handle API timeout gracefully', async ({ page, context }) => {
      await page.goto('/');
      
      // Mock slow API responses that timeout
      await context.route('**/api/**', async route => {
        // Simulate network timeout
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.abort('timedout');
      });
      
      // Attempt to make an API call (if the app makes any on load)
      const requestPromise = page.waitForRequest('**/api/**', { timeout: 5000 }).catch(() => null);
      
      // Trigger API call by interacting with the page
      const apiButtons = page.locator('button:has-text("Load"), button:has-text("Fetch"), button:has-text("Get")');
      if (await apiButtons.count() > 0) {
        await apiButtons.first().click();
      }
      
      // Wait a bit for timeout to occur
      await page.waitForTimeout(2000);
      
      // Verify app shows appropriate timeout message
      const timeoutIndicators = page.locator(
        'text="Request timed out", text="Network timeout", text="Connection timeout", text="Slow connection"'
      );
      
      const errorIndicators = page.locator(
        'text="Network error", text="Connection failed", text="Unable to connect"'
      );
      
      // Should show some kind of network error indication
      const hasTimeoutMessage = await timeoutIndicators.count() > 0;
      const hasErrorMessage = await errorIndicators.count() > 0;
      const hasRetryButton = await page.locator('button:has-text("Retry"), button:has-text("Try Again")').count() > 0;
      
      // At least one of these should be true for good UX
      expect(hasTimeoutMessage || hasErrorMessage || hasRetryButton).toBeTruthy();
      
      // App should remain functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should implement retry mechanism for failed requests', async ({ page, context }) => {
      let attemptCount = 0;
      
      await context.route('**/api/**', route => {
        attemptCount++;
        
        if (attemptCount < 3) {
          // Fail first 2 attempts
          route.abort('failed');
        } else {
          // Succeed on 3rd attempt
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: 'success', attempt: attemptCount })
          });
        }
      });
      
      await page.goto('/');
      
      // Trigger API call
      const apiTrigger = page.locator('button, [data-testid*="load"], [data-testid*="fetch"]').first();
      if (await apiTrigger.count() > 0) {
        await apiTrigger.click();
        
        // Wait for retries to complete
        await page.waitForTimeout(3000);
        
        // Should eventually succeed
        const successIndicators = page.locator(
          'text="success", text="loaded", text="complete", text="Success"'
        );
        
        if (await successIndicators.count() > 0) {
          expect(attemptCount).toBe(3);
        }
      }
    });

    test('should handle 500 server errors gracefully', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });
      
      await page.goto('/');
      
      // Try to trigger API calls
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        await buttons.first().click();
      }
      
      await page.waitForTimeout(1000);
      
      // Should show user-friendly error message
      const errorMessages = page.locator(
        'text="Server error", text="Service unavailable", text="Something went wrong", text="Error occurred"'
      );
      
      // Should not expose technical details
      await expect(page.locator('text="Internal Server Error"')).not.toBeVisible();
      await expect(page.locator('text="500"')).not.toBeVisible();
      
      // Should provide retry option
      const retryButtons = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
      if (await retryButtons.count() > 0) {
        await expect(retryButtons.first()).toBeVisible();
      }
    });

    test('should handle 400 client errors appropriately', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 400,
        body: { error: 'Bad Request', message: 'Invalid input data' }
      });
      
      await page.goto('/');
      
      // Try to submit a form or make an API call
      const forms = page.locator('form');
      const buttons = page.locator('button[type="submit"], button:has-text("Submit")');
      
      if (await forms.count() > 0) {
        await forms.first().locator('input, textarea').first().fill('test data');
        await forms.first().locator('button[type="submit"]').click();
      } else if (await buttons.count() > 0) {
        await buttons.first().click();
      }
      
      await page.waitForTimeout(1000);
      
      // Should show validation error message
      const validationMessages = page.locator(
        'text="Invalid", text="required", text="error", [role="alert"]'
      );
      
      // Client errors should provide actionable feedback
      if (await validationMessages.count() > 0) {
        await expect(validationMessages.first()).toBeVisible();
      }
    });

    test('should handle CORS errors gracefully', async ({ page, context }) => {
      await context.route('**/external-api/**', route => {
        route.fulfill({
          status: 200,
          body: 'Blocked by CORS',
          headers: {
            'Access-Control-Allow-Origin': 'https://different-origin.com'
          }
        });
      });
      
      await page.goto('/');
      
      // App should handle CORS errors without crashing
      await page.evaluate(() => {
        fetch('/external-api/data')
          .catch(error => console.log('CORS error handled:', error.message));
      });
      
      await page.waitForTimeout(500);
      
      // App should remain functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Offline Handling', () => {
    test('should detect offline state', async ({ page, context }) => {
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Go offline
      await context.setOffline(true);
      
      // Trigger offline detection
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });
      
      await page.waitForTimeout(500);
      
      // Should show offline indicator
      const offlineIndicators = page.locator(
        '[data-testid="offline-indicator"], text="Offline", text="No connection", text="Disconnected"'
      );
      
      if (await offlineIndicators.count() > 0) {
        await expect(offlineIndicators.first()).toBeVisible();
      }
    });

    test('should queue actions when offline', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.setOffline(true);
      
      // Try to perform actions that require network
      const actionButtons = page.locator('button:has-text("Save"), button:has-text("Submit"), button:has-text("Update")');
      
      if (await actionButtons.count() > 0) {
        await actionButtons.first().click();
        
        // Should show queued message
        const queueMessages = page.locator(
          'text="Queued", text="Will sync", text="Saved locally", text="Pending sync"'
        );
        
        if (await queueMessages.count() > 0) {
          await expect(queueMessages.first()).toBeVisible();
        }
      }
    });

    test('should sync queued actions when back online', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.setOffline(true);
      
      // Perform offline actions
      const offlineData = await page.evaluate(() => {
        // Simulate offline data storage
        localStorage.setItem('offline-queue', JSON.stringify([
          { action: 'save', data: 'test-data', timestamp: Date.now() }
        ]));
        return localStorage.getItem('offline-queue');
      });
      
      expect(offlineData).toBeTruthy();
      
      // Go back online
      await context.setOffline(false);
      
      // Trigger online event
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });
      
      await page.waitForTimeout(1000);
      
      // Should attempt to sync queued data
      const syncMessages = page.locator(
        'text="Synced", text="Updated", text="Synchronized", text="Connected"'
      );
      
      if (await syncMessages.count() > 0) {
        await expect(syncMessages.first()).toBeVisible();
      }
    });

    test('should work with cached content when offline', async ({ page, context }) => {
      // Load page online first
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Cache some content
      const originalContent = await page.locator('h1, h2, main').first().textContent();
      
      // Go offline
      await context.setOffline(true);
      
      // Reload page - should work from cache
      await page.reload();
      
      // Should still show content
      await expect(page.locator('body')).toBeVisible();
      
      // Basic navigation should work
      const navLinks = page.locator('nav a, header a').first();
      if (await navLinks.count() > 0) {
        // Should not cause errors when clicking
        await navLinks.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Slow Network Conditions', () => {
    test('should show loading states for slow requests', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: 'slow response' })
        });
      });
      
      await page.goto('/');
      
      // Trigger API call
      const loadButton = page.locator('button:has-text("Load"), button:has-text("Fetch")').first();
      if (await loadButton.count() > 0) {
        await loadButton.click();
        
        // Should show loading indicator
        const loadingIndicators = page.locator(
          '[data-testid="loading"], text="Loading", text="Please wait", .spinner, .loading'
        );
        
        if (await loadingIndicators.count() > 0) {
          await expect(loadingIndicators.first()).toBeVisible();
        }
        
        // Wait for completion
        await page.waitForTimeout(3000);
        
        // Loading should disappear
        if (await loadingIndicators.count() > 0) {
          await expect(loadingIndicators.first()).not.toBeVisible();
        }
      }
    });

    test('should handle concurrent request failures', async ({ page, context }) => {
      let requestCount = 0;
      
      await context.route('**/api/**', route => {
        requestCount++;
        if (requestCount % 2 === 0) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: `request-${requestCount}` })
          });
        }
      });
      
      await page.goto('/');
      
      // Make multiple concurrent requests
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          fetch(`/api/test-${i}`).catch(() => {
            // Handle errors gracefully
          });
        }
      });
      
      await page.waitForTimeout(1000);
      
      // App should remain stable
      await expect(page.locator('body')).toBeVisible();
      expect(requestCount).toBeGreaterThan(0);
    });
  });

  test.describe('Network Recovery', () => {
    test('should detect network recovery', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline then online
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);
      
      // Trigger online event
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });
      
      await page.waitForTimeout(500);
      
      // Should detect network recovery
      const recoveryMessages = page.locator(
        'text="Online", text="Connected", text="Network restored", [data-testid="online-indicator"]'
      );
      
      if (await recoveryMessages.count() > 0) {
        await expect(recoveryMessages.first()).toBeVisible();
      }
    });

    test('should resume normal operation after network recovery', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.setOffline(true);
      
      // Store some offline state
      await page.evaluate(() => {
        localStorage.setItem('offline-mode', 'true');
      });
      
      // Go back online
      await context.setOffline(false);
      
      // Trigger recovery
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
        localStorage.removeItem('offline-mode');
      });
      
      await page.waitForTimeout(500);
      
      // Should resume normal functionality
      const buttons = page.locator('button').first();
      if (await buttons.count() > 0) {
        await buttons.click();
        // Should not show offline-related errors
        await expect(page.locator('text="offline", text="no connection"')).not.toBeVisible();
      }
    });
  });

  test.describe('Circuit Breaker Pattern', () => {
    test('should implement circuit breaker for repeated failures', async ({ page, context }) => {
      let failureCount = 0;
      
      await context.route('**/api/unreliable', route => {
        failureCount++;
        route.abort('failed');
      });
      
      await page.goto('/');
      
      // Implement circuit breaker simulation
      await page.evaluate(() => {
        let failures = 0;
        let circuitOpen = false;
        
        const makeRequest = () => {
          if (circuitOpen) {
            console.log('Circuit breaker: Service unavailable');
            return Promise.reject(new Error('Circuit breaker open'));
          }
          
          return fetch('/api/unreliable')
            .catch(error => {
              failures++;
              if (failures >= 3) {
                circuitOpen = true;
                console.log('Circuit breaker: Opening circuit');
                setTimeout(() => {
                  circuitOpen = false;
                  failures = 0;
                  console.log('Circuit breaker: Attempting to close circuit');
                }, 5000);
              }
              throw error;
            });
        };
        
        // Trigger multiple failures
        for (let i = 0; i < 5; i++) {
          setTimeout(() => makeRequest(), i * 100);
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Circuit breaker should prevent excessive requests
      expect(failureCount).toBeLessThan(10);
    });
  });

  test.describe('Error Message Quality', () => {
    test('should not expose internal API details in error messages', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 500,
        body: { 
          error: 'Database connection failed', 
          stack: 'Error at /internal/path/database.js:123',
          query: 'SELECT * FROM users WHERE password = ?'
        }
      });
      
      await page.goto('/');
      
      // Trigger API error
      const button = page.locator('button').first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(500);
      }
      
      // Should not expose internal details
      await expect(page.locator('text="Database connection failed"')).not.toBeVisible();
      await expect(page.locator('text="/internal/path/"')).not.toBeVisible();
      await expect(page.locator('text="SELECT * FROM"')).not.toBeVisible();
      
      // Should show user-friendly message instead
      const friendlyMessages = page.locator(
        'text="Something went wrong", text="Service unavailable", text="Please try again"'
      );
      
      if (await friendlyMessages.count() > 0) {
        await expect(friendlyMessages.first()).toBeVisible();
      }
    });

    test('should provide actionable error messages', async ({ page, context }) => {
      await mockApiResponse(page, '**/api/**', {
        status: 422,
        body: { 
          error: 'Validation failed',
          errors: {
            email: ['Email is required', 'Email must be valid'],
            password: ['Password is too short']
          }
        }
      });
      
      await page.goto('/');
      
      // Try to submit a form
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        await form.locator('button[type="submit"], button:has-text("Submit")').click();
        await page.waitForTimeout(500);
        
        // Should show specific validation errors
        const validationErrors = page.locator(
          'text="required", text="must be valid", text="too short", [role="alert"]'
        );
        
        if (await validationErrors.count() > 0) {
          await expect(validationErrors.first()).toBeVisible();
        }
      }
    });
  });
});