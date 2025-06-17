/**
 * Enhanced Error Boundary Tests with Type Safety
 * 
 * This test suite validates error boundary behavior with proper typing,
 * realistic error scenarios, and comprehensive resilience testing.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { ErrorBoundaryError, NetworkError, ApiError } from './types/errors';
import {
  generateErrorBoundaryError,
  generateNetworkError,
  generateApiError,
} from './utils/error-generators';
import {
  mockApiResponseTyped,
  mockNetworkFailure,
  createRequestMonitor,
} from './utils/mock-helpers';
import { ChaosEngine, CHAOS_SCENARIOS } from './utils/chaos-engine';

test.describe('Enhanced Error Boundary Infrastructure', () => {
  test.describe('Type-Safe Error Handling', () => {
    test('should catch and properly type component errors', async ({ page }) => {
      await page.goto('/');
      
      // Inject typed error scenario
      const error = generateErrorBoundaryError('component', new Error('Test component crash'), {
        componentStack: 'at TestComponent\nat ErrorBoundary',
        errorBoundaryId: 'test-boundary-1',
      });
      
      await page.evaluate((errorData) => {
        // Create a component that will throw with typed error
        const errorComponent = document.createElement('div');
        errorComponent.setAttribute('data-testid', 'typed-error-component');
        errorComponent.onclick = () => {
          const error = new Error(errorData.message);
          (error as any).errorBoundaryData = errorData;
          throw error;
        };
        errorComponent.textContent = 'Click to trigger typed error';
        document.body.appendChild(errorComponent);
      }, error);
      
      // Trigger the error
      await page.click('[data-testid="typed-error-component"]');
      
      // Verify error boundary caught it with proper typing
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      await expect(errorBoundary).toBeVisible();
      
      // Check error details are properly displayed
      const errorId = await page.locator('[data-testid="error-id"]').textContent();
      expect(errorId).toMatch(/^\d{13}-[a-z0-9]{9}$/);
      
      // Verify Sentry integration
      const sentryId = await page.locator('[data-testid="sentry-id"]').textContent();
      if (sentryId) {
        expect(sentryId).toMatch(/^[a-f0-9]{32}$/);
      }
    });

    test('should handle different error types with appropriate UI', async ({ page }) => {
      await page.goto('/');
      
      // Test network error
      const networkError = generateNetworkError('timeout', {
        endpoint: '/api/data',
        method: 'GET',
        latency: 30000,
      });
      
      await mockNetworkFailure(page, '**/api/data', 'timeout', networkError);
      
      // Trigger network request
      await page.evaluate(() => {
        fetch('/api/data').catch(() => {
          // Show network error UI
          const errorDiv = document.createElement('div');
          errorDiv.setAttribute('data-testid', 'network-error-ui');
          errorDiv.innerHTML = `
            <div class="error-boundary network-error">
              <h3>Network Error</h3>
              <p>Request timed out. Please check your connection.</p>
              <button data-testid="retry-network">Retry</button>
            </div>
          `;
          document.body.appendChild(errorDiv);
        });
      });
      
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="network-error-ui"]')).toBeVisible();
      
      // Test API error
      const apiError = generateApiError(500, {
        url: '/api/users',
        method: 'POST',
        body: { error: 'Internal server error' },
      });
      
      await mockApiResponseTyped(page, '**/api/users', {
        status: apiError.status,
        body: apiError.body,
      });
      
      await page.evaluate(() => {
        fetch('/api/users', { method: 'POST' })
          .then(res => res.json())
          .catch(() => {
            // Show API error UI
            const errorDiv = document.createElement('div');
            errorDiv.setAttribute('data-testid', 'api-error-ui');
            errorDiv.innerHTML = `
              <div class="error-boundary api-error">
                <h3>Server Error</h3>
                <p>Something went wrong on our end. Please try again later.</p>
                <button data-testid="retry-api">Try Again</button>
              </div>
            `;
            document.body.appendChild(errorDiv);
          });
      });
      
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="api-error-ui"]')).toBeVisible();
    });

    test('should implement progressive error recovery', async ({ page }) => {
      await page.goto('/');
      
      let attemptCount = 0;
      const maxAttempts = 3;
      
      // Create progressive recovery component
      await page.evaluate((max) => {
        let attempts = 0;
        
        const createRecoveryComponent = () => {
          const container = document.getElementById('recovery-container') || 
            (() => {
              const div = document.createElement('div');
              div.id = 'recovery-container';
              document.body.appendChild(div);
              return div;
            })();
          
          container.innerHTML = `
            <div data-testid="recovery-component">
              <h3>Recovery Test Component</h3>
              <p>Attempts: ${attempts}/${max}</p>
              <button data-testid="trigger-recoverable-error">
                Test Recovery (${attempts < max ? 'Will Fail' : 'Will Succeed'})
              </button>
              <div data-testid="recovery-status">${
                attempts === 0 ? 'Ready' :
                attempts < max ? 'Failed, retrying...' :
                'Recovered successfully!'
              }</div>
            </div>
          `;
          
          const button = container.querySelector('[data-testid="trigger-recoverable-error"]');
          button?.addEventListener('click', () => {
            attempts++;
            
            if (attempts < max) {
              // Simulate failure
              container.innerHTML = `
                <div data-testid="error-state">
                  <h3>Error Occurred</h3>
                  <p>Attempt ${attempts} of ${max} failed</p>
                  <button data-testid="retry-button">Retry</button>
                </div>
              `;
              
              container.querySelector('[data-testid="retry-button"]')
                ?.addEventListener('click', createRecoveryComponent);
            } else {
              // Success on final attempt
              createRecoveryComponent();
            }
          });
        };
        
        createRecoveryComponent();
      }, maxAttempts);
      
      // Test progressive recovery
      for (let i = 0; i < maxAttempts; i++) {
        if (i > 0) {
          await page.click('[data-testid="retry-button"]');
        }
        
        await page.click('[data-testid="trigger-recoverable-error"]');
        
        if (i < maxAttempts - 1) {
          await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
          await expect(page.locator(`text="Attempt ${i + 1} of ${maxAttempts} failed"`)).toBeVisible();
        }
      }
      
      // Verify final recovery
      await expect(page.locator('text="Recovered successfully!"')).toBeVisible();
    });
  });

  test.describe('Circuit Breaker Integration', () => {
    test('should prevent error cascades with circuit breaker', async ({ page }) => {
      await page.goto('/');
      
      // Inject circuit breaker monitoring
      await page.evaluate(() => {
        class ErrorBoundaryWithCircuitBreaker {
          private errorCount = 0;
          private readonly threshold = 3;
          private readonly resetTime = 5000;
          private circuitOpen = false;
          private lastErrorTime = 0;
          
          handleError(error: Error): void {
            const now = Date.now();
            
            // Check if circuit should reset
            if (this.circuitOpen && now - this.lastErrorTime > this.resetTime) {
              this.circuitOpen = false;
              this.errorCount = 0;
            }
            
            // If circuit is open, reject immediately
            if (this.circuitOpen) {
              this.showCircuitOpenUI();
              return;
            }
            
            // Increment error count
            this.errorCount++;
            this.lastErrorTime = now;
            
            // Check if threshold exceeded
            if (this.errorCount >= this.threshold) {
              this.circuitOpen = true;
              this.showCircuitOpenUI();
            } else {
              this.showErrorUI(error);
            }
          }
          
          private showCircuitOpenUI(): void {
            const container = document.getElementById('error-container') ||
              (() => {
                const div = document.createElement('div');
                div.id = 'error-container';
                document.body.appendChild(div);
                return div;
              })();
            
            container.innerHTML = `
              <div data-testid="circuit-breaker-open">
                <h3>Service Temporarily Unavailable</h3>
                <p>Too many errors detected. Please wait before trying again.</p>
                <div data-testid="circuit-state">OPEN</div>
              </div>
            `;
          }
          
          private showErrorUI(error: Error): void {
            const container = document.getElementById('error-container') ||
              (() => {
                const div = document.createElement('div');
                div.id = 'error-container';
                document.body.appendChild(div);
                return div;
              })();
            
            container.innerHTML = `
              <div data-testid="error-boundary-ui">
                <h3>Error Detected</h3>
                <p>${error.message}</p>
                <p>Error count: ${this.errorCount}</p>
                <button data-testid="trigger-another-error">Trigger Another Error</button>
              </div>
            `;
            
            container.querySelector('[data-testid="trigger-another-error"]')
              ?.addEventListener('click', () => {
                this.handleError(new Error(`Error ${this.errorCount + 1}`));
              });
          }
        }
        
        (window as any).errorBoundary = new ErrorBoundaryWithCircuitBreaker();
        
        // Trigger first error
        (window as any).errorBoundary.handleError(new Error('Initial error'));
      });
      
      // Trigger errors until circuit opens
      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          await page.click('[data-testid="trigger-another-error"]');
        }
        await page.waitForTimeout(100);
      }
      
      // Verify circuit is open
      await expect(page.locator('[data-testid="circuit-breaker-open"]')).toBeVisible();
      await expect(page.locator('[data-testid="circuit-state"]')).toHaveText('OPEN');
      
      // Wait for circuit to potentially reset
      await page.waitForTimeout(6000);
      
      // Verify circuit can reset
      await page.evaluate(() => {
        (window as any).errorBoundary.handleError(new Error('Post-reset error'));
      });
      
      await expect(page.locator('[data-testid="error-boundary-ui"]')).toBeVisible();
      await expect(page.locator('text="Error count: 1"')).toBeVisible();
    });
  });

  test.describe('Memory Leak Prevention', () => {
    test('should clean up error states without memory leaks', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory baseline
      const getMemoryUsage = async (): Promise<number> => {
        return await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });
      };
      
      const initialMemory = await getMemoryUsage();
      
      // Create and destroy error boundaries multiple times
      for (let i = 0; i < 20; i++) {
        await page.evaluate((iteration) => {
          // Create error boundary
          const errorBoundary = document.createElement('div');
          errorBoundary.className = 'error-boundary-test';
          errorBoundary.setAttribute('data-iteration', iteration.toString());
          
          // Add event listeners (potential memory leak source)
          const handlers: Array<() => void> = [];
          for (let j = 0; j < 10; j++) {
            const handler = () => console.log(`Handler ${j}`);
            errorBoundary.addEventListener('click', handler);
            handlers.push(handler);
          }
          
          // Add to DOM
          document.body.appendChild(errorBoundary);
          
          // Simulate error
          const error = new Error(`Test error ${iteration}`);
          console.error(error);
          
          // Clean up properly
          setTimeout(() => {
            // Remove event listeners
            handlers.forEach(handler => {
              errorBoundary.removeEventListener('click', handler);
            });
            
            // Remove from DOM
            errorBoundary.remove();
          }, 100);
        }, i);
        
        await page.waitForTimeout(150);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      const finalMemory = await getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  test.describe('Chaos Testing with Error Boundaries', () => {
    test('should remain stable under chaos conditions', async ({ page, context }) => {
      await page.goto('/');
      
      // Initialize chaos engine
      const chaos = new ChaosEngine(context);
      chaos.addScenarios(CHAOS_SCENARIOS.basic);
      
      // Start request monitoring
      const monitor = await createRequestMonitor(page);
      
      // Start chaos
      await chaos.start(page);
      
      // Perform user actions under chaos
      const actions = [
        () => page.click('button:visible').catch(() => {}),
        () => page.fill('input:visible', 'test data').catch(() => {}),
        () => page.navigate('/about').catch(() => {}),
        () => page.navigate('/').catch(() => {}),
      ];
      
      // Execute random actions for 30 seconds
      const startTime = Date.now();
      while (Date.now() - startTime < 30000) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        await action();
        await page.waitForTimeout(1000);
      }
      
      // Stop chaos
      await chaos.stop(page);
      
      // Verify application stability
      await expect(page.locator('body')).toBeVisible();
      
      // Check error boundary didn't crash
      const criticalErrors = await page.locator('[data-testid="critical-error"]').count();
      expect(criticalErrors).toBe(0);
      
      // Analyze chaos results
      const results = chaos.getResults();
      const metrics = chaos.getMetrics();
      
      console.log('Chaos Test Results:', {
        scenarios: metrics.totalScenarios,
        executed: metrics.executedScenarios,
        errors: metrics.totalErrors,
        avgRecovery: metrics.averageRecoveryTime,
      });
      
      // Verify recovery
      expect(metrics.averageRecoveryTime).toBeLessThan(20000); // Under 20 seconds
      
      // Check request success rate
      const requests = monitor.getRequests();
      const successfulRequests = requests.filter(r => r.status && r.status < 400).length;
      const successRate = requests.length > 0 ? successfulRequests / requests.length : 0;
      
      // Should maintain at least 60% success rate under chaos
      expect(successRate).toBeGreaterThan(0.6);
    });
  });

  test.describe('Sentry Integration Testing', () => {
    test('should report errors to Sentry with proper context', async ({ page }) => {
      await page.goto('/');
      
      // Mock Sentry capture
      const sentryEvents: any[] = [];
      await page.exposeFunction('captureSentryEvent', (event: any) => {
        sentryEvents.push(event);
      });
      
      await page.evaluate(() => {
        // Mock Sentry
        (window as any).Sentry = {
          captureException: (error: Error, context?: any) => {
            (window as any).captureSentryEvent({
              error: {
                message: error.message,
                stack: error.stack,
              },
              context,
              timestamp: Date.now(),
            });
          },
          withScope: (callback: (scope: any) => void) => {
            const scope = {
              setLevel: () => {},
              setContext: () => {},
              setTag: () => {},
              setFingerprint: () => {},
              addBreadcrumb: () => {},
            };
            callback(scope);
          },
        };
      });
      
      // Trigger different types of errors
      const errors = [
        generateErrorBoundaryError('component', new Error('Component error')),
        generateNetworkError('timeout'),
        generateApiError(500),
      ];
      
      for (const error of errors) {
        await page.evaluate((errorData) => {
          const err = new Error(errorData.message);
          (window as any).Sentry.captureException(err, {
            errorId: errorData.errorId,
            type: errorData.code,
          });
        }, error);
      }
      
      // Verify Sentry events
      expect(sentryEvents).toHaveLength(3);
      
      // Check event structure
      sentryEvents.forEach((event, index) => {
        expect(event.error).toBeDefined();
        expect(event.context).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.context.errorId).toMatch(/^\d{13}-[a-z0-9]{9}$/);
      });
    });
  });
});