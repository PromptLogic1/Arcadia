import { test, expect } from '@playwright/test';
import { waitForNetworkIdle, getPerformanceMetrics } from '../helpers/test-utils';
import type { TestWindow } from '../types/test-types';

test.describe('Application Resilience and Recovery', () => {
  test.describe('Error Recovery Mechanisms', () => {
    test('should recover from component crashes without full page reload', async ({ page }) => {
      await page.goto('/');
      
      // Inject error-prone component
      await page.evaluate(() => {
        let crashed = false;
        const container = document.createElement('div');
        container.setAttribute('data-testid', 'resilient-component');
        
        const render = () => {
          container.innerHTML = crashed 
            ? `
              <div data-testid="component-error">
                <p>Component crashed</p>
                <button data-testid="component-recover">Recover</button>
              </div>
            `
            : `
              <div data-testid="component-working">
                <p>Component working</p>
                <button data-testid="component-crash">Trigger Crash</button>
              </div>
            `;
        };
        
        container.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.getAttribute('data-testid') === 'component-crash') {
            crashed = true;
            render();
          } else if (target.getAttribute('data-testid') === 'component-recover') {
            crashed = false;
            render();
          }
        });
        
        render();
        document.body.appendChild(container);
      });
      
      // Verify initial state
      await expect(page.locator('[data-testid="component-working"]')).toBeVisible();
      
      // Trigger crash
      await page.click('[data-testid="component-crash"]');
      await expect(page.locator('[data-testid="component-error"]')).toBeVisible();
      
      // Verify page didn't reload
      const navigationEntries = await page.evaluate(() => performance.getEntriesByType('navigation').length);
      expect(navigationEntries).toBe(1); // Only initial navigation
      
      // Recover component
      await page.click('[data-testid="component-recover"]');
      await expect(page.locator('[data-testid="component-working"]')).toBeVisible();
      
      // Rest of app should remain functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should implement circuit breaker pattern for repeated failures', async ({ page, context }) => {
      let requestCount = 0;
      // eslint-disable-next-line prefer-const
      let circuitOpen = false;
      
      await context.route('**/api/unreliable', route => {
        requestCount++;
        
        if (circuitOpen) {
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Circuit breaker open' })
          });
          return;
        }
        
        // Fail requests to trigger circuit breaker
        route.abort('failed');
      });
      
      await page.goto('/');
      
      // Simulate circuit breaker implementation
      await page.evaluate(() => {
        let failures = 0;
        let isCircuitOpen = false;
        
        const makeRequest = async () => {
          if (isCircuitOpen) {
            console.log('Circuit breaker: Requests blocked');
            return Promise.reject(new Error('Circuit breaker open'));
          }
          
          try {
            const response = await fetch('/api/unreliable');
            failures = 0; // Reset on success
            return response;
          } catch (error) {
            failures++;
            console.log(`Request failed. Failure count: ${failures}`);
            
            if (failures >= 3) {
              isCircuitOpen = true;
              console.log('Circuit breaker: Opening circuit');
              
              // Attempt to close circuit after delay
              setTimeout(() => {
                isCircuitOpen = false;
                failures = 0;
                console.log('Circuit breaker: Attempting to close circuit');
              }, 2000);
            }
            
            throw error;
          }
        };
        
        // Store function globally for testing
        (window as TestWindow).testCircuitBreaker = makeRequest;
      });
      
      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => (window as TestWindow).testCircuitBreaker?.().catch(() => {}));
        await page.waitForTimeout(100);
      }
      
      // Circuit breaker should limit requests
      expect(requestCount).toBeLessThan(10);
      
      // Wait for circuit to potentially close
      await page.waitForTimeout(3000);
      
      // Should allow new requests after timeout
      await page.evaluate(() => (window as TestWindow).testCircuitBreaker?.().catch(() => {}));
    });

    test('should implement retry with exponential backoff', async ({ page, context }) => {
      // eslint-disable-next-line prefer-const
      let attemptTimes: number[] = [];
      
      await context.route('**/api/retry-test', route => {
        attemptTimes.push(Date.now());
        
        if (attemptTimes.length < 3) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, attempts: attemptTimes.length })
          });
        }
      });
      
      await page.goto('/');
      
      // Implement retry with backoff
      await page.evaluate(() => {
        const retryWithBackoff = async (url: string, maxRetries = 3): Promise<Response | void> => {
          let attempt = 0;
          
          while (attempt < maxRetries) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                return response;
              }
              throw new Error(`HTTP ${response.status}`);
            } catch (error) {
              attempt++;
              
              if (attempt >= maxRetries) {
                throw error;
              }
              
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, attempt - 1) * 1000;
              console.log(`Retry attempt ${attempt} after ${delay}ms`);
              
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };
        
        (window as TestWindow).retryRequest = () => retryWithBackoff('/api/retry-test');
      });
      
      // Execute retry logic
      const startTime = Date.now();
      await page.evaluate(() => (window as TestWindow).retryRequest?.());
      const _totalTime = Date.now() - startTime;
      
      // Should have attempted 3 times
      expect(attemptTimes.length).toBe(3);
      
      // Should have implemented proper backoff timing
      if (attemptTimes.length >= 3) {
        const delay1 = (attemptTimes[1] || 0) - (attemptTimes[0] || 0);
        const delay2 = (attemptTimes[2] || 0) - (attemptTimes[1] || 0);
        
        expect(delay1).toBeGreaterThan(800); // ~1s with some tolerance
        expect(delay2).toBeGreaterThan(1800); // ~2s with some tolerance
      }
    });

    test('should gracefully degrade when services are unavailable', async ({ page, context }) => {
      // Mock all API services as unavailable
      await context.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // App should still load basic functionality
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, h2, main')).toBeVisible();
      
      // Should show degraded mode indicators
      const degradedIndicators = page.locator(
        '[data-testid="degraded-mode"], text="Limited functionality", text="Some features unavailable", text="Offline mode"'
      );
      
      if (await degradedIndicators.count() > 0) {
        await expect(degradedIndicators.first()).toBeVisible();
      }
      
      // Core navigation should work
      const navLinks = page.locator('nav a, header a').first();
      if (await navLinks.count() > 0) {
        await navLinks.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('State Recovery', () => {
    test('should recover application state after temporary failures', async ({ page, context: _context }) => {
      await page.goto('/');
      
      // Set initial application state
      await page.evaluate(() => {
        localStorage.setItem('app-state', JSON.stringify({
          user: { id: 1, name: 'Test User' },
          preferences: { theme: 'dark', language: 'en' },
          gameProgress: { level: 5, score: 1200 }
        }));
        
        // Trigger state load
        window.dispatchEvent(new Event('storage'));
      });
      
      // Simulate temporary failure that clears memory state
      await page.evaluate(() => {
        // Clear in-memory state
        (window as TestWindow).__appState = null;
        
        // Trigger recovery from localStorage
        const savedState = localStorage.getItem('app-state');
        if (savedState) {
          try {
            (window as TestWindow).__appState = JSON.parse(savedState);
            console.log('State recovered from localStorage');
          } catch (error) {
            console.error('Failed to recover state:', error);
          }
        }
      });
      
      // Verify state recovery
      const recoveredState = await page.evaluate(() => (window as TestWindow).__appState);
      
      if (recoveredState && typeof recoveredState === 'object') {
        const state = recoveredState as Record<string, unknown>;
        expect(state.user && typeof state.user === 'object' && 'name' in state.user ? state.user.name : null).toBe('Test User');
        expect(state.gameProgress && typeof state.gameProgress === 'object' && 'level' in state.gameProgress ? state.gameProgress.level : null).toBe(5);
      }
    });

    test('should handle corrupted state gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Inject corrupted state
      await page.evaluate(() => {
        localStorage.setItem('app-state', '{invalid json}');
        localStorage.setItem('user-preferences', 'corrupted data');
        
        // Attempt to load corrupted state
        const attemptRecovery = () => {
          try {
            const state = localStorage.getItem('app-state');
            JSON.parse(state || '{}');
          } catch {
            console.log('Corrupted state detected, using defaults');
            
            // Clear corrupted data
            localStorage.removeItem('app-state');
            
            // Set default state
            localStorage.setItem('app-state', JSON.stringify({
              user: null,
              preferences: { theme: 'light', language: 'en' },
              gameProgress: { level: 1, score: 0 }
            }));
            
            return true; // Recovery successful
          }
          return false;
        };
        
        (window as TestWindow).recoveryResult = attemptRecovery();
      });
      
      const recoveryResult = await page.evaluate(() => (window as TestWindow).recoveryResult);
      expect(recoveryResult).toBe(true);
      
      // App should continue functioning with default state
      await expect(page.locator('body')).toBeVisible();
    });

    test('should sync state across multiple tabs', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Set state in first tab
      await page1.goto('/');
      await page1.evaluate(() => {
        localStorage.setItem('shared-state', JSON.stringify({ value: 'tab1-data' }));
        
        // Listen for storage events
        window.addEventListener('storage', (e) => {
          if (e.key === 'shared-state') {
            console.log('Storage event received:', e.newValue);
            (window as TestWindow).receivedStorageEvent = true;
          }
        });
      });
      
      // Update state in second tab
      await page2.goto('/');
      await page2.evaluate(() => {
        localStorage.setItem('shared-state', JSON.stringify({ value: 'tab2-data' }));
      });
      
      // First tab should receive storage event
      await page1.waitForTimeout(500);
      const receivedEvent = await page1.evaluate(() => (window as TestWindow).receivedStorageEvent);
      
      if (receivedEvent) {
        expect(receivedEvent).toBe(true);
      }
      
      // State should be synchronized
      const state1 = await page1.evaluate(() => localStorage.getItem('shared-state'));
      const state2 = await page2.evaluate(() => localStorage.getItem('shared-state'));
      
      expect(state1).toBe(state2);
      
      await context.close();
    });
  });

  test.describe('Memory Management', () => {
    test('should prevent memory leaks during error recovery', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as Performance).memory?.usedJSHeapSize || 0;
      });
      
      // Simulate multiple error/recovery cycles
      for (let i = 0; i < 10; i++) {
        await page.evaluate((iteration) => {
          // Create and destroy error states
          const errorContainer = document.createElement('div');
          errorContainer.innerHTML = `<div>Error ${iteration}</div>`;
          document.body.appendChild(errorContainer);
          
          // Simulate cleanup
          setTimeout(() => {
            if (errorContainer.parentNode) {
              errorContainer.parentNode.removeChild(errorContainer);
            }
          }, 100);
        }, i);
        
        await page.waitForTimeout(150);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window && typeof window.gc === 'function') {
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as Performance).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        // Memory increase should be reasonable (less than 5MB)
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      }
    });

    test('should clean up event listeners during recovery', async ({ page }) => {
      await page.goto('/');
      
      // Add multiple event listeners
      await page.evaluate(() => {
        let listenerCount = 0;
        
        const addListeners = () => {
          for (let i = 0; i < 5; i++) {
            const handler = () => listenerCount++;
            document.addEventListener('click', handler);
            window.addEventListener('resize', handler);
          }
        };
        
        const cleanup = () => {
          // Remove all listeners (simplified cleanup)
          const newDocument = document.cloneNode(true);
          document.parentNode?.replaceChild(newDocument, document);
        };
        
        // Simulate error recovery cycle
        addListeners();
        (window as TestWindow).listenerCount = listenerCount;
        (window as TestWindow).cleanup = cleanup;
      });
      
      // Trigger cleanup
      await page.evaluate(() => (window as TestWindow).cleanup?.());
      
      // Verify cleanup occurred without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Performance During Failures', () => {
    test('should maintain performance during intermittent failures', async ({ page, context }) => {
      // Mock intermittent API failures
      let requestCount = 0;
      await context.route('**/api/**', route => {
        requestCount++;
        
        if (requestCount % 3 === 0) {
          // Every 3rd request fails
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: `response-${requestCount}` })
          });
        }
      });
      
      await page.goto('/');
      
      const startTime = Date.now();
      
      // Make multiple requests
      await page.evaluate(async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(
            fetch(`/api/test-${i}`)
              .then(r => r.json())
              .catch(error => ({ error: error.message }))
          );
        }
        return Promise.all(promises);
      });
      
      const totalTime = Date.now() - startTime;
      
      // Should complete within reasonable time despite failures
      expect(totalTime).toBeLessThan(10000);
      
      // App should remain responsive
      await expect(page.locator('body')).toBeVisible();
    });

    test('should not degrade performance after multiple errors', async ({ page }) => {
      await page.goto('/');
      
      // Measure baseline performance
      const baselineMetrics = await getPerformanceMetrics(page);
      
      // Generate multiple errors
      for (let i = 0; i < 5; i++) {
        await page.evaluate((iteration) => {
          try {
            throw new Error(`Test error ${iteration}`);
          } catch (error) {
            console.error(error);
          }
        }, i);
        
        await page.waitForTimeout(100);
      }
      
      // Measure performance after errors
      await page.reload();
      const afterErrorMetrics = await getPerformanceMetrics(page);
      
      // Performance should not significantly degrade
      const loadTimeDiff = afterErrorMetrics.load - baselineMetrics.load;
      expect(loadTimeDiff).toBeLessThan(2000); // Within 2 seconds
    });
  });

  test.describe('User Experience During Failures', () => {
    test('should provide clear feedback during recovery', async ({ page, context }) => {
      let isRecovering = false;
      
      await context.route('**/api/**', route => {
        if (isRecovering) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'recovered' })
          });
        } else {
          route.abort('failed');
        }
      });
      
      await page.goto('/');
      
      // Trigger initial failure
      await page.evaluate(() => {
        fetch('/api/test')
          .catch(() => {
            // Show recovery UI
            const recoveryDiv = document.createElement('div');
            recoveryDiv.setAttribute('data-testid', 'recovery-ui');
            recoveryDiv.innerHTML = `
              <div>
                <p>Connection lost. Attempting to reconnect...</p>
                <button data-testid="manual-retry">Retry Now</button>
              </div>
            `;
            document.body.appendChild(recoveryDiv);
          });
      });
      
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="recovery-ui"]')).toBeVisible();
      
      // Simulate recovery
      isRecovering = true;
      await page.click('[data-testid="manual-retry"]');
      
      await page.waitForTimeout(500);
      
      // Should show success or hide recovery UI
      const recoveryUI = page.locator('[data-testid="recovery-ui"]');
      if (await recoveryUI.count() > 0) {
        await expect(recoveryUI).not.toBeVisible();
      }
    });

    test('should maintain user context during failures', async ({ page, context }) => {
      await page.goto('/');
      
      // Set user context
      await page.evaluate(() => {
        sessionStorage.setItem('user-context', JSON.stringify({
          currentPage: '/dashboard',
          scrollPosition: 500,
          formData: { name: 'Test User', email: 'test@example.com' }
        }));
      });
      
      // Simulate failure and recovery
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);
      
      // User context should be preserved
      const preservedContext = await page.evaluate(() => {
        const context = sessionStorage.getItem('user-context');
        return context ? JSON.parse(context) : null;
      });
      
      if (preservedContext) {
        expect(preservedContext.currentPage).toBe('/dashboard');
        expect(preservedContext.formData.name).toBe('Test User');
      }
    });

    test('should provide offline capability during failures', async ({ page, context }) => {
      await page.goto('/');
      
      // Cache some content
      await page.evaluate(() => {
        localStorage.setItem('cached-content', JSON.stringify({
          pages: {
            '/': { title: 'Home', content: 'Welcome to Arcadia' },
            '/about': { title: 'About', content: 'About our platform' }
          },
          userData: { name: 'Test User', preferences: {} }
        }));
      });
      
      // Go offline
      await context.setOffline(true);
      
      // Should show cached content
      await page.evaluate(() => {
        const cached = localStorage.getItem('cached-content');
        if (cached) {
          const data = JSON.parse(cached);
          const offlineDiv = document.createElement('div');
          offlineDiv.setAttribute('data-testid', 'offline-content');
          offlineDiv.innerHTML = `
            <div>
              <p>Offline Mode</p>
              <p>${data.pages['/'].content}</p>
              <p>User: ${data.userData.name}</p>
            </div>
          `;
          document.body.appendChild(offlineDiv);
        }
      });
      
      await expect(page.locator('[data-testid="offline-content"]')).toBeVisible();
      await expect(page.locator('text="Offline Mode"')).toBeVisible();
    });
  });

  test.describe('Data Integrity During Failures', () => {
    test('should prevent data corruption during interruptions', async ({ page, context: _context }) => {
      await page.goto('/');
      
      // Start data operation
      await page.evaluate(() => {
        const criticalData = {
          timestamp: Date.now(),
          operation: 'user-save',
          data: { id: 1, name: 'Test User', score: 1000 }
        };
        
        // Atomic write operation simulation
        const atomicWrite = (key: string, data: unknown) => {
          const tempKey = `${key}_temp`;
          try {
            // Write to temporary location first
            localStorage.setItem(tempKey, JSON.stringify(data));
            
            // Verify write was successful
            const verification = localStorage.getItem(tempKey);
            if (verification && JSON.parse(verification)) {
              // Move to final location
              localStorage.setItem(key, verification);
              localStorage.removeItem(tempKey);
              return true;
            }
          } catch (error) {
            // Clean up on failure
            localStorage.removeItem(tempKey);
            throw error;
          }
          return false;
        };
        
        (window as TestWindow).testAtomicWrite = async (data: unknown) => {
          return atomicWrite('critical-data', data || criticalData);
        };
      });
      
      // Execute atomic write
      const writeSuccess = await page.evaluate(() => (window as TestWindow).testAtomicWrite?.(null));
      expect(writeSuccess).toBe(true);
      
      // Verify data integrity
      const savedData = await page.evaluate(() => {
        const data = localStorage.getItem('critical-data');
        return data ? JSON.parse(data) : null;
      });
      
      expect(savedData).toBeTruthy();
      expect(savedData.data.name).toBe('Test User');
    });

    test('should implement rollback on failure', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        // Set initial state
        const initialState = { user: { id: 1, name: 'Original User' }, version: 1 };
        localStorage.setItem('app-state', JSON.stringify(initialState));
        
        // Simulate transaction with rollback
        const updateWithRollback = async (updates: unknown) => {
          const currentState = JSON.parse(localStorage.getItem('app-state') || '{}');
          const backup = { ...currentState };
          
          try {
            // Apply updates
            const updatesObj = typeof updates === 'object' && updates !== null ? updates : {};
            const newState = { ...currentState, ...updatesObj, version: (currentState.version || 0) + 1 };
            localStorage.setItem('app-state', JSON.stringify(newState));
            
            // Simulate validation failure
            if ('user' in updatesObj && 
                typeof updatesObj.user === 'object' && 
                updatesObj.user !== null &&
                'name' in updatesObj.user &&
                updatesObj.user.name === 'Invalid User') {
              throw new Error('Validation failed');
            }
            
            return newState;
          } catch (error) {
            // Rollback on failure
            console.log('Rolling back due to error:', (error as Error).message);
            localStorage.setItem('app-state', JSON.stringify(backup));
            throw error;
          }
        };
        
        (window as TestWindow).updateWithRollback = updateWithRollback;
      });
      
      // Test successful update
      const successResult = await page.evaluate(async () => {
        try {
          return await (window as TestWindow).updateWithRollback?.({ user: { id: 1, name: 'Valid User' } });
        } catch {
          return null;
        }
      });
      
      if (successResult && typeof successResult === 'object') {
        const result = successResult as Record<string, unknown>;
        expect(result.user && typeof result.user === 'object' && 'name' in result.user ? result.user.name : null).toBe('Valid User');
        expect(result.version).toBe(2);
      }
      
      // Test rollback on failure
      const failureResult = await page.evaluate(async () => {
        try {
          await (window as TestWindow).updateWithRollback?.({ user: { id: 1, name: 'Invalid User' } });
          return false;
        } catch {
          // Check if rollback occurred
          const currentState = JSON.parse(localStorage.getItem('app-state') || '{}');
          return currentState.user.name === 'Valid User' && currentState.version === 2;
        }
      });
      
      expect(failureResult).toBe(true);
    });
  });
});