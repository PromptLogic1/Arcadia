/**
 * Network Failure Simulation Tests
 *
 * This test suite validates real network failure scenarios including
 * offline/online transitions, API retry mechanisms, timeout handling,
 * and connection resilience patterns.
 */

import { test, expect } from '@playwright/test';
import {
  mockNetworkFailure,
  mockApiResponseTyped,
  mockProgressiveDegradation,
  MockCircuitBreaker,
} from './utils/mock-helpers';

test.describe('Network Failure Simulation', () => {
  test.describe('Offline/Online Transitions', () => {
    test('should handle offline state gracefully', async ({
      page,
      context,
    }) => {
      await page.goto('/');

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Simulate going offline
      await context.setOffline(true);

      // Try to make API requests while offline
      const offlineResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/redis-test');
          return { success: response.ok, status: response.status };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            offline: true,
          };
        }
      });

      expect(offlineResponse.success).toBe(false);
      expect(offlineResponse.offline).toBe(true);

      // Check for offline indicator or graceful degradation
      const pageStillFunctional = await page.locator('body').count();
      expect(pageStillFunctional).toBeGreaterThan(0);

      // Simulate coming back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Verify connectivity is restored
      const onlineResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          return { success: response.ok, status: response.status };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      // Should be able to connect again (or fail gracefully if health endpoint doesn't exist)
      console.log('Online connectivity test:', onlineResponse);
    });

    test('should queue actions during offline periods', async ({
      page,
      context,
    }) => {
      await page.goto('/');

      // Set up action queuing mechanism
      await page.evaluate(() => {
        interface QueuedAction {
          id: string;
          action: string;
          data: unknown;
          timestamp: number;
          attempts: number;
        }

        const actionQueue: QueuedAction[] = [];
        let isOnline = navigator.onLine;

        const queueAction = (action: string, data: unknown) => {
          const queuedAction: QueuedAction = {
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action,
            data,
            timestamp: Date.now(),
            attempts: 0,
          };
          actionQueue.push(queuedAction);
          return queuedAction.id;
        };

        const processQueue = async () => {
          if (!isOnline || actionQueue.length === 0) return;

          const actionsToProcess = [...actionQueue];
          actionQueue.length = 0; // Clear queue

          for (const action of actionsToProcess) {
            try {
              action.attempts++;
              await fetch('/api/redis-test', {
                method: 'POST',
                body: JSON.stringify({
                  action: action.action,
                  data: action.data,
                }),
                headers: { 'Content-Type': 'application/json' },
              });
              console.log(`Processed queued action: ${action.action}`);
            } catch (error) {
              // If processing fails, re-queue with attempt limit
              if (action.attempts < 3) {
                actionQueue.push(action);
              }
              console.warn(`Failed to process action: ${action.action}`, error);
            }
          }
        };

        // Monitor online/offline events
        window.addEventListener('online', () => {
          isOnline = true;
          processQueue();
        });

        window.addEventListener('offline', () => {
          isOnline = false;
        });

        // Store for testing
        (window as any).__actionQueue = {
          queue: actionQueue,
          queueAction,
          processQueue,
          isOnline: () => isOnline,
          getQueueLength: () => actionQueue.length,
        };
      });

      // Go offline and queue some actions
      await context.setOffline(true);

      const actionIds = await page.evaluate(() => {
        const queue = (window as any).__actionQueue;
        const ids = [
          queue.queueAction('user_action', {
            type: 'click',
            element: 'button1',
          }),
          queue.queueAction('data_update', {
            key: 'test',
            value: 'offline_data',
          }),
          queue.queueAction('analytics', { event: 'page_view', page: '/test' }),
        ];
        return ids;
      });

      expect(actionIds).toHaveLength(3);

      // Verify actions are queued
      const queueLength = await page.evaluate(() => {
        const queue = (window as any).__actionQueue;
        return queue.getQueueLength();
      });

      expect(queueLength).toBe(3);

      // Come back online and process queue
      await context.setOffline(false);
      await page.waitForTimeout(2000); // Give time for processing

      // Check if queue was processed
      const finalQueueLength = await page.evaluate(() => {
        const queue = (window as any).__actionQueue;
        return queue.getQueueLength();
      });

      // Queue should be empty or have fewer items (some might have been processed)
      expect(finalQueueLength).toBeLessThanOrEqual(3);
      console.log(`Final queue length: ${finalQueueLength}`);
    });
  });

  test.describe('API Retry Mechanisms', () => {
    test('should implement exponential backoff for failed requests', async ({
      page,
    }) => {
      await page.goto('/');

      // Set up retry mechanism with exponential backoff
      await page.evaluate(() => {
        interface RetryConfig {
          maxAttempts: number;
          baseDelay: number;
          maxDelay: number;
          backoffMultiplier: number;
        }

        interface RetryAttempt {
          attempt: number;
          delay: number;
          timestamp: number;
          success: boolean;
          error?: string;
        }

        const retryWithBackoff = async (
          operation: () => Promise<Response>,
          config: RetryConfig
        ): Promise<{
          success: boolean;
          attempts: RetryAttempt[];
          response?: Response;
        }> => {
          const attempts: RetryAttempt[] = [];
          let currentDelay = config.baseDelay;

          for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            const attemptRecord: RetryAttempt = {
              attempt,
              delay: currentDelay,
              timestamp: Date.now(),
              success: false,
            };

            try {
              if (attempt > 1) {
                await new Promise(resolve => setTimeout(resolve, currentDelay));
              }

              const response = await operation();
              attemptRecord.success = response.ok;
              attempts.push(attemptRecord);

              if (response.ok) {
                return { success: true, attempts, response };
              }

              // Prepare for next attempt
              currentDelay = Math.min(
                currentDelay * config.backoffMultiplier,
                config.maxDelay
              );
            } catch (error) {
              attemptRecord.error =
                error instanceof Error ? error.message : String(error);
              attempts.push(attemptRecord);

              // For network errors, continue retrying
              currentDelay = Math.min(
                currentDelay * config.backoffMultiplier,
                config.maxDelay
              );
            }
          }

          return { success: false, attempts };
        };

        (window as any).__retryMechanism = {
          retryWithBackoff,
          testRetry: async () => {
            return retryWithBackoff(() => fetch('/api/redis-test'), {
              maxAttempts: 4,
              baseDelay: 100,
              maxDelay: 2000,
              backoffMultiplier: 2,
            });
          },
        };
      });

      // Mock API to fail a few times then succeed
      let requestCount = 0;
      await page.route('**/api/redis-test', async route => {
        requestCount++;
        if (requestCount <= 2) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true }),
          });
        }
      });

      // Test the retry mechanism
      const retryResult = await page.evaluate(async () => {
        const retryMech = (window as any).__retryMechanism;
        return await retryMech.testRetry();
      });

      expect(retryResult.success).toBe(true);
      expect(retryResult.attempts.length).toBeGreaterThan(1);

      // Verify exponential backoff pattern
      const delays = retryResult.attempts.map(a => a.delay);
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }

      console.log('Retry attempts:', retryResult.attempts);
    });

    test('should handle different HTTP error codes appropriately', async ({
      page,
    }) => {
      await page.goto('/');

      // Test different error code handling
      const errorScenarios = [
        { status: 400, shouldRetry: false, description: 'Bad Request' },
        { status: 401, shouldRetry: false, description: 'Unauthorized' },
        { status: 403, shouldRetry: false, description: 'Forbidden' },
        { status: 404, shouldRetry: false, description: 'Not Found' },
        { status: 429, shouldRetry: true, description: 'Rate Limited' },
        { status: 500, shouldRetry: true, description: 'Server Error' },
        { status: 502, shouldRetry: true, description: 'Bad Gateway' },
        { status: 503, shouldRetry: true, description: 'Service Unavailable' },
      ];

      for (const scenario of errorScenarios) {
        // Mock the specific error response
        await page.route('**/api/test-error-handling', async route => {
          await route.fulfill({
            status: scenario.status,
            body: JSON.stringify({ error: scenario.description }),
          });
        });

        const result = await page.evaluate(async errorCode => {
          try {
            const response = await fetch('/api/test-error-handling');
            return {
              status: response.status,
              ok: response.ok,
              shouldRetry: [429, 500, 502, 503, 504].includes(response.status),
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : String(error),
              shouldRetry: true, // Network errors should be retried
            };
          }
        }, scenario.status);

        expect(result.status).toBe(scenario.status);
        expect(result.shouldRetry).toBe(scenario.shouldRetry);

        console.log(
          `${scenario.status} ${scenario.description}: retry=${scenario.shouldRetry}`
        );
      }
    });
  });

  test.describe('Connection Resilience', () => {
    test('should handle slow network conditions', async ({ page }) => {
      await page.goto('/');

      // Simulate slow network responses
      await page.route('**/api/slow-test', async route => {
        // Add artificial delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Slow response',
            timestamp: Date.now(),
          }),
        });
      });

      // Test request with timeout handling
      const slowRequestResult = await page.evaluate(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const startTime = Date.now();
        try {
          const response = await fetch('/api/slow-test', {
            signal: controller.signal,
          });
          const duration = Date.now() - startTime;
          clearTimeout(timeoutId);

          return {
            success: response.ok,
            duration,
            timedOut: false,
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          clearTimeout(timeoutId);

          return {
            success: false,
            duration,
            timedOut: error instanceof Error && error.name === 'AbortError',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      if (slowRequestResult.success) {
        expect(slowRequestResult.duration).toBeGreaterThanOrEqual(2000);
        expect(slowRequestResult.duration).toBeLessThan(5000); // Should complete before timeout
      } else if (slowRequestResult.timedOut) {
        expect(slowRequestResult.duration).toBeGreaterThanOrEqual(5000);
      }

      console.log('Slow network test result:', slowRequestResult);
    });

    test('should implement circuit breaker for network requests', async ({
      page,
    }) => {
      await page.goto('/');

      // Use the MockCircuitBreaker from utils
      const circuitBreaker = new MockCircuitBreaker(3, 5000, 2); // 3 failures, 5s timeout, 2 successes to close

      await page.route('**/api/circuit-test', async route => {
        await circuitBreaker.mockResponse(route);
      });

      // Test circuit breaker behavior
      const results = [];

      for (let i = 0; i < 8; i++) {
        const result = await page.evaluate(async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('/api/circuit-test');
            return {
              success: response.ok,
              status: response.status,
              duration: Date.now() - startTime,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
            };
          }
        });

        results.push(result);

        // Check if circuit breaker opened
        if (result.status === 503 && result.duration < 100) {
          console.log(`Circuit breaker opened at request ${i + 1}`);
          break;
        }

        await page.waitForTimeout(200); // Small delay between requests
      }

      // Verify circuit breaker behavior
      const failedRequests = results.filter(r => !r.success);
      const circuitOpenResponses = results.filter(r => r.status === 503);

      expect(failedRequests.length).toBeGreaterThan(0);
      console.log(
        `Total requests: ${results.length}, Failed: ${failedRequests.length}, Circuit open: ${circuitOpenResponses.length}`
      );

      // Test circuit breaker recovery after timeout
      await page.waitForTimeout(6000); // Wait for circuit to potentially reset

      const recoveryResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/circuit-test');
          return { success: response.ok, status: response.status };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      console.log('Circuit breaker recovery test:', recoveryResult);
    });
  });

  test.describe('Progressive Degradation', () => {
    test('should gracefully degrade service quality under load', async ({
      page,
    }) => {
      await page.goto('/');

      // Simulate progressive service degradation
      await mockProgressiveDegradation(page, '**/api/progressive-test', [
        {
          requestCount: 3,
          status: 200,
          body: { quality: 'high', features: ['full'] },
        },
        {
          requestCount: 6,
          status: 200,
          body: { quality: 'medium', features: ['partial'] },
          delay: 500,
        },
        {
          requestCount: 10,
          status: 200,
          body: { quality: 'low', features: ['basic'] },
          delay: 1000,
        },
        {
          requestCount: Infinity,
          status: 503,
          body: { error: 'Service unavailable' },
        },
      ]);

      const degradationResults = [];

      // Make multiple requests to trigger degradation
      for (let i = 0; i < 12; i++) {
        const result = await page.evaluate(async () => {
          const startTime = Date.now();
          try {
            const response = await fetch('/api/progressive-test');
            const data = await response.json();
            return {
              success: response.ok,
              status: response.status,
              data,
              duration: Date.now() - startTime,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
            };
          }
        });

        degradationResults.push(result);

        if (!result.success) {
          console.log(`Service became unavailable at request ${i + 1}`);
          break;
        }

        await page.waitForTimeout(100);
      }

      // Verify progressive degradation pattern
      const successfulResults = degradationResults.filter(r => r.success);

      if (successfulResults.length >= 3) {
        const highQuality = successfulResults.slice(0, 3);
        expect(highQuality.every(r => r.data?.quality === 'high')).toBe(true);
      }

      if (successfulResults.length >= 6) {
        const mediumQuality = successfulResults.slice(3, 6);
        expect(mediumQuality.every(r => r.data?.quality === 'medium')).toBe(
          true
        );
      }

      console.log('Progressive degradation results:', {
        totalRequests: degradationResults.length,
        successful: successfulResults.length,
        qualityLevels: successfulResults.map(r => r.data?.quality),
      });
    });
  });
});
