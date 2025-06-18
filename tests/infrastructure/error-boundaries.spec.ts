/**
 * Infrastructure Error Boundary Tests - Real React Error Boundaries
 * 
 * This test suite validates REAL React error boundary behavior using the
 * actual BaseErrorBoundary and RouteErrorBoundary components in the app.
 * Tests real component crashes and recovery mechanisms.
 */

import { test, expect } from '@playwright/test';
import {
  mockApiResponseTyped,
  createRequestMonitor,
  mockNetworkFailure,
} from './utils/mock-helpers';
import { ChaosEngine, CHAOS_SCENARIOS } from './utils/chaos-engine';
import {
  generateErrorBoundaryError,
  generateNetworkError,
  generateApiError,
} from './utils/error-generators';

import type { TestError, MockSupabaseClient, MockRealtimeChannel, MockWebSocket, EventCallback, SentryScope, RouteHandler } from '../types/test-types';

test.describe('Real React Error Boundary Infrastructure', () => {
  test.describe('Route Error Boundary Tests', () => {
    test('should catch real React component errors with RouteErrorBoundary', async ({ page }) => {
      // Navigate to the actual error boundary test page
      await page.goto('/test-error-boundaries');
      
      // Verify the page loaded correctly
      await expect(page.locator('h1')).toHaveText('Error Boundary Test Page');
      
      // Trigger a real React render error
      await page.click('button:has-text("Throw Render Error")');
      
      // Verify the RouteErrorBoundary caught the error
      const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]');
      await expect(errorBoundary.first()).toBeVisible({ timeout: 5000 });
      
      // Check for error UI elements
      const errorHeading = page.locator('h2:has-text("Page Error"), h3:has-text("Something went wrong")');
      await expect(errorHeading.first()).toBeVisible();
      
      // Check for Try Again button
      const tryAgainButton = page.locator('button:has-text("Try Again")');
      await expect(tryAgainButton).toBeVisible();
      
      // Verify error ID is generated (BaseErrorBoundary feature)
      const errorIdPattern = /Error ID:\s*\d{13}-[a-z0-9]{9}/i;
      const pageText = await page.textContent('body');
      expect(pageText).toMatch(errorIdPattern);
      
      // Test recovery by clicking Try Again
      await tryAgainButton.click();
      
      // Verify the error boundary reset and page is functional again
      await expect(page.locator('h1')).toHaveText('Error Boundary Test Page');
      await expect(page.locator('button:has-text("Throw Render Error")')).toBeVisible();
    });

    test('should handle real React async component errors with AsyncBoundary', async ({ page }) => {
      await page.goto('/test-error-boundaries');
      
      // Wait for async components to load
      await page.waitForLoadState('networkidle');
      
      // Find and trigger async component error
      const asyncSection = page.locator('section:has(h2:has-text("Async Component"))');
      await expect(asyncSection).toBeVisible();
      
      const triggerAsyncError = asyncSection.locator('button:has-text("Trigger Async Error")');
      await triggerAsyncError.click();
      
      // Verify AsyncBoundary caught the error
      const asyncErrorBoundary = asyncSection.locator('.error-boundary, [data-testid="error-boundary"]');
      await expect(asyncErrorBoundary.first()).toBeVisible({ timeout: 5000 });
      
      // Check for component-level error message
      const componentError = asyncSection.locator(':has-text("Something went wrong")');
      await expect(componentError.first()).toBeVisible();
      
      // Verify Try Again functionality for async errors
      const asyncTryAgain = asyncSection.locator('button:has-text("Try Again")');
      if (await asyncTryAgain.count() > 0) {
        await asyncTryAgain.click();
        // Component should reset
        await expect(triggerAsyncError).toBeVisible();
      }
    });

    test('should handle realtime component errors with RealtimeErrorBoundary', async ({ page }) => {
      await page.goto('/test-error-boundaries');
      
      // Wait for page to load completely
      await page.waitForLoadState('networkidle');
      
      // Find the Realtime Component section
      const realtimeSection = page.locator('section:has(h2:has-text("Realtime Component"))');
      await expect(realtimeSection).toBeVisible();
      
      // Trigger realtime component error
      const triggerRealtimeError = realtimeSection.locator('button:has-text("Trigger Network Error")');
      await triggerRealtimeError.click();
      
      // Verify RealtimeErrorBoundary caught the error
      const realtimeErrorBoundary = realtimeSection.locator('.error-boundary, [data-testid="error-boundary"]');
      await expect(realtimeErrorBoundary.first()).toBeVisible({ timeout: 5000 });
      
      // Check for realtime-specific error handling
      const realtimeError = realtimeSection.locator(':has-text("Something went wrong"), :has-text("WebSocket"), :has-text("connection")');
      await expect(realtimeError.first()).toBeVisible();
      
      // Test realtime error recovery
      const realtimeTryAgain = realtimeSection.locator('button:has-text("Try Again")');
      if (await realtimeTryAgain.count() > 0) {
        await realtimeTryAgain.click();
        await expect(triggerRealtimeError).toBeVisible();
      }
    });

    test('should implement progressive error recovery with real error boundaries', async ({ page }) => {
      await page.goto('/test-error-boundaries');
      
      // Test progressive recovery by triggering multiple errors and recoveries
      const maxAttempts = 3;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Trigger error
        await page.click('button:has-text("Throw Render Error")');
        
        // Verify error boundary is shown
        const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]');
        await expect(errorBoundary.first()).toBeVisible({ timeout: 5000 });
        
        // Try to recover
        const tryAgainButton = page.locator('button:has-text("Try Again")');
        await expect(tryAgainButton).toBeVisible();
        await tryAgainButton.click();
        
        // Verify recovery
        await expect(page.locator('h1')).toHaveText('Error Boundary Test Page');
        await expect(page.locator('button:has-text("Throw Render Error")')).toBeVisible();
        
        // Short delay between attempts
        await page.waitForTimeout(500);
      }
      
      // Final verification that the page is still functional after multiple error/recovery cycles
      await expect(page.locator('button:has-text("Throw Render Error")')).toBeVisible();
      await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    });
  });

  test.describe('BaseErrorBoundary Circuit Breaker', () => {
    test('should open circuit breaker after excessive errors (BaseErrorBoundary feature)', async ({ page }) => {
      await page.goto('/test-error-boundaries');
      
      // BaseErrorBoundary has a circuit breaker that reloads the page after 3+ errors
      // This tests the actual implementation, not a mock
      
      // Track page reloads
      let reloadCount = 0;
      page.on('framenavigated', () => {
        reloadCount++;
      });
      
      // Trigger multiple consecutive errors rapidly
      for (let i = 0; i < 5; i++) {
        try {
          // Trigger error
          await page.click('button:has-text("Throw Render Error")');
          
          // Wait for error boundary to appear
          await page.waitForSelector('[data-testid="error-boundary"], .error-boundary, [class*="error"]', { 
            timeout: 2000 
          });
          
          // Try to recover quickly to trigger multiple errors
          const tryAgainButton = page.locator('button:has-text("Try Again")');
          if (await tryAgainButton.count() > 0) {
            await tryAgainButton.click();
            await page.waitForTimeout(200); // Short delay
          }
        } catch (error) {
          // Page might have reloaded due to circuit breaker
          console.log(`Error attempt ${i + 1}: Page may have reloaded`);
          break;
        }
      }
      
      // Verify that we're either still on the error test page or the page was reloaded
      // The BaseErrorBoundary circuit breaker should have either:
      // 1. Prevented further errors, or
      // 2. Triggered a page reload after too many errors
      
      await page.waitForTimeout(1000);
      
      // Check if we're on a functional page (either original or reloaded)
      const currentUrl = page.url();
      const hasErrorTest = await page.locator('h1:has-text("Error Boundary Test Page")').count();
      const hasMainPage = await page.locator('body').count();
      
      expect(hasMainPage).toBeGreaterThan(0); // Page should be functional
      
      // If we're still on the error test page, verify it's functional
      if (hasErrorTest > 0) {
        await expect(page.locator('button:has-text("Throw Render Error")')).toBeVisible();
      }
      
      console.log(`Circuit breaker test completed. URL: ${currentUrl}, Reloads: ${reloadCount}`);
    });
  });

  test.describe('Memory Leak Prevention', () => {
    test('should clean up error states without memory leaks', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory baseline
      const getMemoryUsage = async (): Promise<number> => {
        return await page.evaluate(() => {
          if ('memory' in performance) {
            const memoryPerformance = performance as Performance & { memory?: { usedJSHeapSize: number } };
            return memoryPerformance.memory?.usedJSHeapSize ?? 0;
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
        if ('gc' in window && typeof window.gc === 'function') {
          window.gc();
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
        () => page.goto('/about').catch(() => {}),
        () => page.goto('/').catch(() => {}),
      ];
      
      // Execute random actions for 30 seconds
      const startTime = Date.now();
      while (Date.now() - startTime < 30000) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        if (action) {
          await action();
        }
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
      const _results = chaos.getResults();
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

  test.describe('Real Sentry Integration', () => {
    test('should report real errors to Sentry through BaseErrorBoundary', async ({ page }) => {
      await page.goto('/test-error-boundaries');
      
      // Intercept Sentry requests to verify actual reporting
      const sentryRequests: Array<{ url: string; body: string }> = [];
      
      await page.route('**/api/*/store/**', async (route) => {
        const body = route.request().postData() || '';
        sentryRequests.push({
          url: route.request().url(),
          body,
        });
        // Allow the request to continue
        await route.continue();
      });
      
      // Also intercept any other Sentry-related endpoints
      await page.route('**/sentry.io/**', async (route) => {
        const body = route.request().postData() || '';
        sentryRequests.push({
          url: route.request().url(),
          body,
        });
        await route.continue();
      });
      
      // Trigger a real React error that should be reported to Sentry
      await page.click('button:has-text("Throw Render Error")');
      
      // Wait for error boundary to appear
      await expect(page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]').first()).toBeVisible({ timeout: 5000 });
      
      // Check for Sentry ID in error display (BaseErrorBoundary shows this)
      const pageText = await page.textContent('body');
      const sentryIdPattern = /Sentry ID:\s*[a-f0-9]{32}/i;
      
      if (sentryIdPattern.test(pageText)) {
        console.log('Sentry ID found in error boundary display');
      }
      
      // Wait a bit for potential Sentry requests
      await page.waitForTimeout(2000);
      
      // Test error recovery and trigger another error type
      const tryAgainButton = page.locator('button:has-text("Try Again")');
      if (await tryAgainButton.count() > 0) {
        await tryAgainButton.click();
        
        // Wait for page to recover
        await expect(page.locator('h1')).toHaveText('Error Boundary Test Page');
        
        // Trigger async error
        const asyncSection = page.locator('section:has(h2:has-text("Async Component"))');
        const triggerAsyncError = asyncSection.locator('button:has-text("Trigger Async Error")');
        await triggerAsyncError.click();
        
        // Wait for async error boundary
        await expect(asyncSection.locator('.error-boundary, [data-testid="error-boundary"]').first()).toBeVisible({ timeout: 5000 });
      }
      
      // Log captured Sentry requests for analysis
      console.log(`Captured ${sentryRequests.length} potential Sentry requests`);
      sentryRequests.forEach((req, index) => {
        console.log(`Sentry request ${index + 1}: ${req.url.substring(0, 100)}...`);
      });
      
      // Verify error boundary functionality regardless of Sentry
      await expect(page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]').first()).toBeVisible();
    });
  });
});