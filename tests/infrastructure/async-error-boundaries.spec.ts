/**
 * Advanced Async Error Boundary Tests
 *
 * This test suite validates comprehensive async error handling,
 * promise rejection management, cleanup mechanisms, and error
 * propagation across component boundaries.
 */

import { test, expect } from '@playwright/test';
import type { TestWindow } from '../types/test-types';

test.describe('Advanced Async Error Boundary Infrastructure', () => {
  test.describe('Promise Rejection Handling', () => {
    test('should catch unhandled promise rejections', async ({ page }) => {
      await page.goto('/');

      // Set up unhandled rejection monitoring
      await page.evaluate(() => {
        const rejections: Array<{
          reason: unknown;
          promise: Promise<unknown>;
          timestamp: number;
          handled: boolean;
        }> = [];

        window.addEventListener('unhandledrejection', event => {
          rejections.push({
            reason: event.reason,
            promise: event.promise,
            timestamp: Date.now(),
            handled: false,
          });

          // Prevent default browser handling
          event.preventDefault();

          // Show custom error UI
          const errorDiv = document.createElement('div');
          errorDiv.setAttribute('data-testid', 'unhandled-rejection-ui');
          errorDiv.innerHTML = `
            <div class="error-boundary async-error">
              <h3>Async Error Detected</h3>
              <p>An unhandled promise rejection occurred.</p>
              <button data-testid="dismiss-async-error">Dismiss</button>
              <button data-testid="report-async-error">Report</button>
            </div>
          `;
          document.body.appendChild(errorDiv);
        });

        window.addEventListener('rejectionhandled', event => {
          const rejection = rejections.find(r => r.promise === event.promise);
          if (rejection) {
            rejection.handled = true;
          }
        });

        // Store rejections globally for testing
        (window as Window).__rejectionTracker = {
          rejections,
          getUnhandledCount: () => rejections.filter(r => !r.handled).length,
          getTotalCount: () => rejections.length,
        };
      });

      // Trigger various unhandled promise rejections
      await page.evaluate(async () => {
        // Simple rejection
        Promise.reject(new Error('Test async error 1'));

        // Async function rejection
        const asyncFail = async () => {
          throw new Error('Test async error 2');
        };
        asyncFail();

        // Fetch rejection
        fetch('/non-existent-endpoint').catch(() => {
          throw new Error('Test async error 3');
        });

        // setTimeout with rejection
        setTimeout(() => {
          Promise.reject(new Error('Test async error 4'));
        }, 100);
      });

      await page.waitForTimeout(500);

      // Verify error UI appeared
      await expect(
        page.locator('[data-testid="unhandled-rejection-ui"]')
      ).toBeVisible();

      // Check rejection tracking
      const rejectionStats = await page.evaluate(
        () => (window as TestWindow).__rejectionTracker
      );

      expect(rejectionStats?.getTotalCount()).toBeGreaterThan(0);
      expect(rejectionStats?.getUnhandledCount()).toBeGreaterThan(0);

      // Test error dismissal
      await page.click('[data-testid="dismiss-async-error"]');
      await expect(
        page.locator('[data-testid="unhandled-rejection-ui"]')
      ).not.toBeVisible();
    });

    test('should handle promise chain failures gracefully', async ({
      page,
    }) => {
      await page.goto('/');

      // Set up promise chain error tracking
      await page.evaluate(() => {
        class PromiseChainError extends Error {
          step: string;
          timestamp: number;
          recovered: boolean;

          constructor(step: string, message: string) {
            super(message);
            this.name = 'PromiseChainError';
            this.step = step;
            this.timestamp = Date.now();
            this.recovered = false;
          }
        }

        const chainErrors: PromiseChainError[] = [];

        const createRecoveryMechanism = (_chainId: string) => {
          const errorHandler = (step: string) => (error: Error | unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorInfo = new PromiseChainError(step, errorMessage);
            chainErrors.push(errorInfo);

            // Attempt recovery
            return new Promise(resolve => {
              setTimeout(() => {
                errorInfo.recovered = true;
                resolve(`Recovered from ${step}`);
              }, 100);
            });
          };

          return {
            recover: () => Promise.resolve('recovered'),
            errorHandler,
          };
        };

        // Store for testing
        (window as TestWindow).__promiseChainTracker = {
          chains: new Map(),
          activeChains: new Set(),
          errors: chainErrors,
          createRecoveryMechanism,
        };
      });

      // Execute complex promise chains with failures
      const chainResults = await page.evaluate(async () => {
        const tracker = (window as TestWindow).__promiseChainTracker;
        const recoveryMechanism = tracker?.createRecoveryMechanism?.('chain1');
        const errorHandler = recoveryMechanism?.errorHandler;

        // Chain 1: Fetch -> Process -> Transform
        const chain1 = fetch('/api/data')
          .catch(
            errorHandler
              ? errorHandler('fetch')
              : () => Promise.resolve('fallback')
          )
          .then((data: unknown) => {
            if (typeof data === 'string' && data.includes('Recovered')) {
              return { recovered: true };
            }
            return (data as Response).json();
          })
          .catch(
            errorHandler
              ? errorHandler('json-parse')
              : () => Promise.resolve('fallback')
          )
          .then((json: unknown) => {
            if (
              json &&
              typeof json === 'object' &&
              'recovered' in json &&
              json.recovered
            ) {
              return { processed: true, recovered: true };
            }
            // Simulate processing error
            throw new Error('Processing failed');
          })
          .catch(
            errorHandler
              ? errorHandler('processing')
              : () => Promise.resolve('fallback')
          )
          .then((result: unknown) => result);

        // Chain 2: Multiple async operations
        const chain2 = Promise.all([
          fetch('/api/users').catch(
            errorHandler
              ? errorHandler('users-fetch')
              : () => Promise.resolve('fallback')
          ),
          fetch('/api/settings').catch(
            errorHandler
              ? errorHandler('settings-fetch')
              : () => Promise.resolve('fallback')
          ),
          fetch('/api/preferences').catch(
            errorHandler
              ? errorHandler('preferences-fetch')
              : () => Promise.resolve('fallback')
          ),
        ])
          .catch(
            errorHandler
              ? errorHandler('parallel-fetch')
              : () => Promise.resolve('fallback')
          )
          .then((results: unknown) => {
            const resultsArray = Array.isArray(results) ? results : [results];
            return resultsArray.map(r => ({ data: r, success: true }));
          })
          .catch(
            errorHandler
              ? errorHandler('results-processing')
              : () => Promise.resolve('fallback')
          );

        const [result1, result2] = await Promise.all([chain1, chain2]);

        return {
          chain1: result1,
          chain2: result2,
          errorCount: tracker?.errors?.length || 0,
          recoveredCount:
            tracker?.errors?.filter((e: unknown) => {
              return (
                e && typeof e === 'object' && 'recovered' in e && e.recovered
              );
            }).length || 0,
        };
      });

      // Verify chain error handling
      expect(chainResults.errorCount).toBeGreaterThan(0);
      expect(chainResults.recoveredCount).toBe(chainResults.errorCount);
      expect(chainResults.chain1).toBeDefined();
      expect(chainResults.chain2).toBeDefined();
    });
  });

  test.describe('Async Component Lifecycle Errors', () => {
    test('should handle errors in useEffect cleanup functions', async ({
      page,
    }) => {
      await page.goto('/');

      // Simulate React-style component lifecycle
      await page.evaluate(() => {
        interface ComponentState {
          mounted: boolean;
          cleanupErrors: Array<{
            componentId: string;
            error: string;
            phase: 'mount' | 'update' | 'unmount';
            timestamp: number;
          }>;
        }

        const componentState: ComponentState = {
          mounted: false,
          cleanupErrors: [],
        };

        const createComponent = (id: string) => {
          const component = {
            id,
            mounted: false,
            cleanupFunctions: [] as Array<() => void>,

            mount() {
              this.mounted = true;

              // Simulate useEffect with cleanup
              const interval = setInterval(() => {
                console.log(`Component ${id} tick`);
              }, 1000);

              const cleanup = () => {
                clearInterval(interval);
                // Simulate cleanup error
                if (Math.random() < 0.5) {
                  throw new Error(`Cleanup error in component ${id}`);
                }
              };

              this.cleanupFunctions.push(cleanup);

              // Add event listeners that need cleanup
              const handleResize = () => console.log(`Resize in ${id}`);
              window.addEventListener('resize', handleResize);

              this.cleanupFunctions.push(() => {
                window.removeEventListener('resize', handleResize);
                // Simulate another cleanup error
                if (Math.random() < 0.3) {
                  throw new Error(`Event cleanup error in component ${id}`);
                }
              });
            },

            unmount() {
              if (!this.mounted) return;

              this.mounted = false;
              this.cleanupFunctions.forEach((cleanup, _index) => {
                try {
                  cleanup();
                } catch (error) {
                  componentState.cleanupErrors.push({
                    componentId: this.id,
                    error: (error as Error).message,
                    phase: 'unmount',
                    timestamp: Date.now(),
                  });
                }
              });

              this.cleanupFunctions = [];
            },
          };

          return component;
        };

        // Store for testing
        (window as TestWindow).__componentLifecycle = {
          components: new Map(),
          state: componentState,
          createComponent,
        };
      });

      // Create and manage components
      const lifecycleResults = await page.evaluate(async () => {
        const lifecycle = (window as TestWindow).__componentLifecycle;
        const components: unknown[] = [];

        // Create multiple components
        for (let i = 0; i < 5; i++) {
          const component = lifecycle?.createComponent?.(`component-${i}`);
          if (
            component &&
            typeof component === 'object' &&
            'mount' in component &&
            typeof component.mount === 'function'
          ) {
            component.mount();
            components.push(component);
          }

          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Unmount all components
        components.forEach((component: unknown) => {
          if (
            component &&
            typeof component === 'object' &&
            'unmount' in component &&
            'id' in component
          ) {
            try {
              (component.unmount as () => void)();
            } catch (error) {
              lifecycle?.state?.cleanupErrors?.push({
                componentId: component.id as string,
                error: (error as Error).message,
                phase: 'unmount',
                timestamp: Date.now(),
              });
            }
          }
        });

        return {
          componentCount: components.length,
          cleanupErrors: lifecycle?.state?.cleanupErrors || [],
          errorRate:
            (lifecycle?.state?.cleanupErrors?.length || 0) / components.length,
        };
      });

      // Verify cleanup error handling
      expect(lifecycleResults.componentCount).toBe(5);
      if (lifecycleResults.cleanupErrors.length > 0) {
        expect(lifecycleResults.errorRate).toBeLessThan(1); // Not all components should error
        lifecycleResults.cleanupErrors.forEach((error: unknown) => {
          if (
            error &&
            typeof error === 'object' &&
            'phase' in error &&
            'componentId' in error
          ) {
            expect(error.phase).toBe('unmount');
            expect(error.componentId).toMatch(/^component-\d+$/);
          }
        });
      }
    });

    test('should handle async component state updates after unmount', async ({
      page,
    }) => {
      await page.goto('/');

      // Simulate component state update after unmount scenario
      await page.evaluate(() => {
        interface AsyncComponentTracker {
          components: Map<
            string,
            {
              id: string;
              mounted: boolean;
              pendingUpdates: number;
              stateUpdateErrors: string[];
            }
          >;
          globalErrors: string[];
        }

        const tracker: AsyncComponentTracker = {
          components: new Map(),
          globalErrors: [],
        };

        const createAsyncComponent = (id: string) => {
          const componentData = {
            id,
            mounted: true,
            pendingUpdates: 0,
            stateUpdateErrors: [] as string[],
          };

          tracker.components.set(id, componentData);

          const component = {
            id,

            // Simulate async data fetching
            async fetchData() {
              if (!tracker.components.get(this.id)?.mounted) {
                const error = `Attempted to update state on unmounted component ${this.id}`;
                tracker.components.get(this.id)?.stateUpdateErrors.push(error);
                tracker.globalErrors.push(error);
                return null;
              }

              tracker.components.get(this.id)!.pendingUpdates++;

              // Simulate API call
              await new Promise(resolve =>
                setTimeout(resolve, Math.random() * 1000)
              );

              // Check if still mounted before updating state
              const componentData = tracker.components.get(this.id);
              if (!componentData?.mounted) {
                const error = `State update attempted after unmount in ${this.id}`;
                componentData?.stateUpdateErrors.push(error);
                tracker.globalErrors.push(error);
                return null;
              }

              componentData.pendingUpdates--;
              return { data: `Data for ${this.id}` };
            },

            // Simulate multiple concurrent async operations
            async startMultipleOperations() {
              const operations = [
                this.fetchData(),
                this.fetchData(),
                this.fetchData(),
              ];

              return Promise.allSettled(operations);
            },

            unmount() {
              const componentData = tracker.components.get(this.id);
              if (componentData) {
                componentData.mounted = false;
              }
            },
          };

          return component;
        };

        // Store for testing
        const trackerWithMethods = tracker as typeof tracker & {
          tracker: typeof tracker;
          createAsyncComponent: typeof createAsyncComponent;
        };
        trackerWithMethods.tracker = tracker;
        trackerWithMethods.createAsyncComponent = createAsyncComponent;
        (window as TestWindow).__asyncComponentTracker = trackerWithMethods;
      });

      // Test async component lifecycle
      const asyncResults = await page.evaluate(async () => {
        const trackerData = (window as TestWindow).__asyncComponentTracker;
        if (!trackerData || !('createAsyncComponent' in trackerData)) {
          return { componentCount: 0, errorCount: 0, mountedCount: 0 };
        }
        const { tracker, createAsyncComponent } = trackerData as {
          tracker: unknown;
          createAsyncComponent: (id: string) => unknown;
        };

        // Create components and start async operations
        const components = [];
        for (let i = 0; i < 3; i++) {
          const component = createAsyncComponent(`async-component-${i}`);
          components.push(component);

          // Start async operations
          if (
            component &&
            typeof component === 'object' &&
            'startMultipleOperations' in component &&
            typeof component.startMultipleOperations === 'function'
          ) {
            component.startMultipleOperations();
          }
        }

        // Wait a bit for operations to start
        await new Promise(resolve => setTimeout(resolve, 200));

        // Unmount some components while operations are in progress
        if (
          components[0] &&
          typeof components[0] === 'object' &&
          'unmount' in components[0] &&
          typeof components[0].unmount === 'function'
        ) {
          components[0].unmount();
        }
        if (
          components[2] &&
          typeof components[2] === 'object' &&
          'unmount' in components[2] &&
          typeof components[2].unmount === 'function'
        ) {
          components[2].unmount();
        }

        // Wait for all operations to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Collect results
        const results = {
          totalComponents: components.length,
          unmountedCount: 2,
          globalErrors:
            tracker &&
            typeof tracker === 'object' &&
            'globalErrors' in tracker &&
            Array.isArray(tracker.globalErrors)
              ? tracker.globalErrors.length
              : 0,
          componentErrors:
            tracker &&
            typeof tracker === 'object' &&
            'components' in tracker &&
            tracker.components instanceof Map
              ? Array.from(tracker.components.values())
                  .map((c: unknown) => {
                    if (
                      c &&
                      typeof c === 'object' &&
                      'id' in c &&
                      'mounted' in c
                    ) {
                      return {
                        id: c.id,
                        mounted: c.mounted,
                        errorCount:
                          'stateUpdateErrors' in c &&
                          Array.isArray(c.stateUpdateErrors)
                            ? c.stateUpdateErrors.length
                            : 0,
                        pendingUpdates:
                          'pendingUpdates' in c
                            ? (c.pendingUpdates as number)
                            : 0,
                      };
                    }
                    return null;
                  })
                  .filter(Boolean)
              : [],
        };

        return results;
      });

      // Verify error handling for unmounted components
      if ('totalComponents' in asyncResults) {
        expect(asyncResults.totalComponents).toBe(3);
        expect(asyncResults.unmountedCount).toBe(2);

        // Should have caught state update errors for unmounted components
        const unmountedWithErrors = asyncResults.componentErrors.filter(
          (c: unknown) => {
            return (
              c &&
              typeof c === 'object' &&
              'mounted' in c &&
              'errorCount' in c &&
              !c.mounted &&
              (c.errorCount as number) > 0
            );
          }
        );
        expect(unmountedWithErrors.length).toBeGreaterThan(0);

        // Mounted component should not have errors
        const mountedComponent = asyncResults.componentErrors.find(
          (c: unknown) => {
            return c && typeof c === 'object' && 'mounted' in c && c.mounted;
          }
        );
        if (
          mountedComponent &&
          typeof mountedComponent === 'object' &&
          'errorCount' in mountedComponent
        ) {
          expect(mountedComponent.errorCount).toBe(0);
        }
      }
    });
  });

  test.describe('Async Error Recovery Mechanisms', () => {
    test('should implement exponential backoff for failed async operations', async ({
      page,
    }) => {
      await page.goto('/');

      // Implement exponential backoff utility
      await page.evaluate(() => {
        interface BackoffConfig {
          initialDelay: number;
          maxDelay: number;
          multiplier: number;
          maxAttempts: number;
          jitter: boolean;
        }

        interface AttemptResult {
          attempt: number;
          delay: number;
          success: boolean;
          error?: string;
          timestamp: number;
        }

        const createExponentialBackoff = (config: BackoffConfig) => {
          const attempts: AttemptResult[] = [];

          const executeWithBackoff = async <T>(
            operation: () => Promise<T>,
            operationName?: string
          ): Promise<T | null> => {
            let currentDelay = config.initialDelay;

            for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
              const attemptResult: AttemptResult = {
                attempt,
                delay: currentDelay,
                success: false,
                timestamp: Date.now(),
              };

              try {
                if (attempt > 1) {
                  await new Promise(resolve =>
                    setTimeout(resolve, currentDelay)
                  );
                }

                const result = await operation();
                attemptResult.success = true;
                attempts.push(attemptResult);
                return result;
              } catch (error) {
                attemptResult.error = (error as Error).message;
                attempts.push(attemptResult);

                if (attempt === config.maxAttempts) {
                  throw new Error(
                    `${operationName || 'Operation'} failed after ${config.maxAttempts} attempts`
                  );
                }

                // Calculate next delay with optional jitter
                currentDelay = Math.min(
                  currentDelay * config.multiplier,
                  config.maxDelay
                );
                if (config.jitter) {
                  currentDelay += Math.random() * currentDelay * 0.1;
                }
              }
            }

            return null;
          };

          return {
            execute: executeWithBackoff,
            getAttempts: () => [...attempts],
          };
        };

        // Store for testing
        (window as TestWindow).__exponentialBackoff = {
          attempts: new Map(),
          maxAttempts: 5,
          createExponentialBackoff,
        };
      });

      // Test backoff mechanism
      const backoffResults = await page.evaluate(async () => {
        const backoffData = (window as TestWindow).__exponentialBackoff;
        if (!backoffData || !('createExponentialBackoff' in backoffData)) {
          return { successAttempts: 0, failureAttempts: 0 };
        }
        const { createExponentialBackoff } = backoffData as {
          createExponentialBackoff: (config: unknown) => {
            execute: (fn: () => Promise<unknown>) => Promise<unknown>;
            getAttempts: () => unknown[];
          };
        };

        // Create backoff instance
        const backoff = createExponentialBackoff({
          initialDelay: 100,
          maxDelay: 2000,
          multiplier: 2,
          maxAttempts: 4,
          jitter: true,
        });

        // Test with eventually successful operation
        let callCount = 0;
        const eventuallySuccessfulOperation = async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error(`Attempt ${callCount} failed`);
          }
          return `Success on attempt ${callCount}`;
        };

        const result1 = await backoff.execute(eventuallySuccessfulOperation);

        // Test with always failing operation
        const alwaysFailingOperation = async () => {
          throw new Error('Always fails');
        };

        let result2 = null;
        try {
          result2 = await backoff.execute(alwaysFailingOperation);
        } catch (error) {
          result2 = { error: (error as Error).message };
        }

        return {
          successResult: result1,
          failureResult: result2,
          attempts: backoff.getAttempts(),
        };
      });

      // Verify backoff behavior
      if ('successResult' in backoffResults) {
        expect(backoffResults.successResult).toBeDefined();
        expect(backoffResults.successResult).toContain('Success on attempt 3');
      }

      if (
        'failureResult' in backoffResults &&
        backoffResults.failureResult &&
        typeof backoffResults.failureResult === 'object' &&
        'error' in backoffResults.failureResult
      ) {
        expect(backoffResults.failureResult).toHaveProperty('error');
        expect(
          (backoffResults.failureResult as { error: string }).error
        ).toContain('failed after 4 attempts');
      }

      // Verify exponential delay pattern
      if (
        'attempts' in backoffResults &&
        Array.isArray(backoffResults.attempts)
      ) {
        const delays = backoffResults.attempts
          .filter(
            (a: unknown): a is { delay: number } =>
              a !== null && typeof a === 'object' && 'delay' in a
          )
          .map(a => a.delay);
        expect(delays.length).toBeGreaterThan(4); // Multiple operations

        // Check that delays increase exponentially (with jitter tolerance)
        const successfulAttempts = backoffResults.attempts
          .filter(
            (
              a: unknown
            ): a is { success: boolean; attempt: number; delay: number } =>
              a !== null &&
              typeof a === 'object' &&
              'success' in a &&
              'attempt' in a &&
              'delay' in a &&
              ((a.success as boolean) || (a.attempt as number) < 4)
          )
          .slice(0, 3);

        for (let i = 1; i < successfulAttempts.length; i++) {
          const current = successfulAttempts[i];
          const previous = successfulAttempts[i - 1];
          if (current && previous) {
            expect(current.delay).toBeGreaterThan(previous.delay * 1.5);
          }
        }
      }
    });

    test('should implement circuit breaker for async operations', async ({
      page,
    }) => {
      await page.goto('/');

      // Implement circuit breaker pattern
      await page.evaluate(() => {
        interface CircuitBreakerState {
          state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
          failures: number;
          lastFailureTime: number;
          lastSuccessTime: number;
          operationHistory: Array<{
            timestamp: number;
            success: boolean;
            duration: number;
            blocked: boolean;
          }>;
        }

        const createCircuitBreaker = (config: {
          failureThreshold: number;
          resetTimeout: number;
          monitoringPeriod: number;
        }) => {
          const state: CircuitBreakerState = {
            state: 'CLOSED',
            failures: 0,
            lastFailureTime: 0,
            lastSuccessTime: Date.now(),
            operationHistory: [],
          };

          const recordOperation = (
            success: boolean,
            duration: number,
            blocked = false
          ) => {
            state.operationHistory.push({
              timestamp: Date.now(),
              success,
              duration,
              blocked,
            });

            // Keep only recent history
            const cutoff = Date.now() - config.monitoringPeriod;
            state.operationHistory = state.operationHistory.filter(
              op => op.timestamp > cutoff
            );
          };

          const shouldAllowOperation = () => {
            const now = Date.now();

            if (state.state === 'CLOSED') {
              return true;
            }

            if (state.state === 'OPEN') {
              if (now - state.lastFailureTime > config.resetTimeout) {
                state.state = 'HALF_OPEN';
                return true;
              }
              return false;
            }

            if (state.state === 'HALF_OPEN') {
              return true;
            }

            return false;
          };

          const onSuccess = () => {
            state.lastSuccessTime = Date.now();

            if (state.state === 'HALF_OPEN') {
              state.state = 'CLOSED';
              state.failures = 0;
            } else if (state.state === 'CLOSED') {
              state.failures = Math.max(0, state.failures - 1);
            }
          };

          const onFailure = () => {
            state.lastFailureTime = Date.now();
            state.failures++;

            if (state.failures >= config.failureThreshold) {
              state.state = 'OPEN';
            }

            if (state.state === 'HALF_OPEN') {
              state.state = 'OPEN';
            }
          };

          const execute = async <T>(
            operation: () => Promise<T>
          ): Promise<T> => {
            if (!shouldAllowOperation()) {
              recordOperation(false, 0, true);
              throw new Error('Circuit breaker is OPEN');
            }

            const start = Date.now();
            try {
              const result = await operation();
              const duration = Date.now() - start;
              onSuccess();
              recordOperation(true, duration);
              return result;
            } catch (error) {
              const duration = Date.now() - start;
              onFailure();
              recordOperation(false, duration);
              throw error;
            }
          };

          const getState = () => ({ ...state });

          return { execute, getState };
        };

        // Store for testing
        (window as TestWindow).__circuitBreaker = {
          createCircuitBreaker,
        };
      });

      // Test circuit breaker
      const circuitResults = await page.evaluate(async () => {
        const { createCircuitBreaker } = (window as TestWindow)
          .__circuitBreaker!;

        const breaker = createCircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 1000,
          monitoringPeriod: 5000,
        });

        // Create failing operation
        let callCount = 0;
        const unreliableOperation = async () => {
          callCount++;
          if (callCount <= 5) {
            throw new Error(`Operation failed (call ${callCount})`);
          }
          return `Success on call ${callCount}`;
        };

        const results = [];

        // Execute operations to trigger circuit breaker
        for (let i = 0; i < 8; i++) {
          try {
            const result = await breaker.execute(unreliableOperation);
            results.push({
              success: true,
              result,
              state: breaker.getState().state,
            });
          } catch (error) {
            results.push({
              success: false,
              error: (error as Error).message,
              state: breaker.getState().state,
            });
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Wait for reset timeout
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Try operation after reset
        try {
          const resetResult = await breaker.execute(unreliableOperation);
          results.push({
            success: true,
            result: resetResult,
            state: breaker.getState().state,
          });
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            state: breaker.getState().state,
          });
        }

        return {
          operations: results,
          finalState: breaker.getState(),
          blockedOperations: results.filter(r =>
            r.error?.includes('Circuit breaker is OPEN')
          ).length,
        };
      });

      // Verify circuit breaker behavior
      expect(circuitResults.operations.length).toBe(9);
      expect(circuitResults.blockedOperations).toBeGreaterThan(0);

      // Should have transitioned through states
      const states = circuitResults.operations.map(op => op.state);
      expect(states).toContain('CLOSED');
      expect(states).toContain('OPEN');

      // Final operation after reset should succeed
      const lastOperation =
        circuitResults.operations[circuitResults.operations.length - 1];
      expect(lastOperation?.success).toBe(true);
    });
  });
});
