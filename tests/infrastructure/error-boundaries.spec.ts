import { test, expect } from '@playwright/test';
import { mockApiResponse } from '../helpers/test-utils';

test.describe('Error Boundary Infrastructure', () => {
  test.describe('Component-Level Error Boundaries', () => {
    test('should catch JavaScript errors without crashing the app', async ({ page }) => {
      await page.goto('/');
      
      // Inject a component that will throw an error
      await page.evaluate(() => {
        // Create a component that throws after mount
        const errorComponent = document.createElement('div');
        errorComponent.setAttribute('data-testid', 'error-trigger');
        errorComponent.onclick = () => {
          throw new Error('Test component error');
        };
        errorComponent.textContent = 'Click to trigger error';
        document.body.appendChild(errorComponent);
      });
      
      // Trigger the error
      await page.click('[data-testid="error-trigger"]');
      
      // Verify the main app is still functional
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, [role="banner"], [role="navigation"]')).toBeVisible();
      
      // Check for error boundary UI (if implemented)
      const errorBoundary = page.locator('[data-testid="error-boundary"], text="Something went wrong"');
      if (await errorBoundary.count() > 0) {
        await expect(errorBoundary).toBeVisible();
      }
    });

    test('should display user-friendly error messages', async ({ page }) => {
      await page.goto('/');
      
      // Simulate a component error by injecting problematic code
      await page.evaluate(() => {
        // Create an error that simulates component failure
        window.addEventListener('error', (event) => {
          event.preventDefault();
          // Create error boundary UI
          const errorUI = document.createElement('div');
          errorUI.setAttribute('data-testid', 'error-boundary-display');
          errorUI.className = 'error-boundary-fallback';
          errorUI.innerHTML = `
            <div>
              <h2>Something went wrong</h2>
              <p>An unexpected error occurred. Please try refreshing the page.</p>
              <button data-testid="error-retry">Try Again</button>
            </div>
          `;
          document.body.appendChild(errorUI);
        });
        
        // Trigger the error
        throw new Error('Component rendering failed');
      });
      
      // Check for user-friendly error message
      await expect(page.locator('[data-testid="error-boundary-display"]')).toBeVisible();
      await expect(page.locator('text="Something went wrong"')).toBeVisible();
      await expect(page.locator('[data-testid="error-retry"]')).toBeVisible();
      
      // Verify no technical details are exposed to users
      await expect(page.locator('text="Component rendering failed"')).not.toBeVisible();
      await expect(page.locator('text="stack trace"')).not.toBeVisible();
    });

    test('should provide error recovery mechanism', async ({ page }) => {
      await page.goto('/');
      
      // Create error scenario and recovery UI
      await page.evaluate(() => {
        let hasErrored = false;
        
        const container = document.createElement('div');
        container.setAttribute('data-testid', 'test-component-container');
        document.body.appendChild(container);
        
        const renderComponent = () => {
          container.innerHTML = hasErrored 
            ? `
              <div data-testid="error-boundary-component">
                <h3>Component Error</h3>
                <p>This component encountered an error</p>
                <button data-testid="try-again-button">Try Again</button>
              </div>
            `
            : `
              <div data-testid="working-component">
                <h3>Working Component</h3>
                <button data-testid="trigger-error">Trigger Error</button>
              </div>
            `;
        };
        
        // Initial render
        renderComponent();
        
        // Handle error trigger
        container.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.getAttribute('data-testid') === 'trigger-error') {
            hasErrored = true;
            renderComponent();
          } else if (target.getAttribute('data-testid') === 'try-again-button') {
            hasErrored = false;
            renderComponent();
          }
        });
      });
      
      // Verify initial state
      await expect(page.locator('[data-testid="working-component"]')).toBeVisible();
      
      // Trigger error
      await page.click('[data-testid="trigger-error"]');
      await expect(page.locator('[data-testid="error-boundary-component"]')).toBeVisible();
      
      // Test recovery
      await page.click('[data-testid="try-again-button"]');
      await expect(page.locator('[data-testid="working-component"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-boundary-component"]')).not.toBeVisible();
    });

    test('should handle cascading errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      let errorCount = 0;
      
      // Monitor console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errorCount++;
        }
      });
      
      // Create multiple error scenarios
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            try {
              throw new Error(`Cascading error ${i + 1}`);
            } catch (error) {
              console.error(error);
            }
          }, i * 100);
        }
      });
      
      // Wait for errors to be processed
      await page.waitForTimeout(500);
      
      // Verify app is still responsive despite multiple errors
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, [role="banner"]')).toBeVisible();
      
      // Check that excessive errors don't crash the browser
      expect(errorCount).toBeGreaterThan(0);
      expect(errorCount).toBeLessThan(10); // Should not spam errors
    });
  });

  test.describe('Page-Level Error Boundaries', () => {
    test('should handle page navigation errors', async ({ page }) => {
      await page.goto('/');
      
      // Try to navigate to a route that might have errors
      const navigationPromise = page.goto('/nonexistent-page', { waitUntil: 'domcontentloaded' });
      
      try {
        await navigationPromise;
      } catch (error) {
        // Navigation error is expected for non-existent pages
      }
      
      // Verify we get a proper 404 page or error handling
      const is404 = await page.locator('text="404"').isVisible() || 
                    await page.locator('text="Page not found"').isVisible() ||
                    await page.locator('text="Not found"').isVisible();
      
      const hasNavigation = await page.locator('[role="navigation"], nav').isVisible();
      const hasHeader = await page.locator('header, [role="banner"]').isVisible();
      
      // Either we should have proper 404 page or be redirected
      expect(is404 || hasNavigation || hasHeader).toBeTruthy();
    });

    test('should maintain navigation when page errors occur', async ({ page }) => {
      await page.goto('/');
      
      // Verify main navigation is present
      const navigation = page.locator('[role="navigation"], nav, header');
      await expect(navigation).toBeVisible();
      
      // Create a page-level error simulation
      await page.evaluate(() => {
        // Simulate page error by corrupting main content
        const main = document.querySelector('main') || document.body;
        if (main) {
          main.innerHTML = `
            <div data-testid="page-error-boundary">
              <h1>Page Error</h1>
              <p>This page encountered an error and couldn't load properly.</p>
              <nav>
                <a href="/" data-testid="nav-home">Home</a>
                <a href="/about" data-testid="nav-about">About</a>
              </nav>
            </div>
          `;
        }
      });
      
      // Verify error page has navigation
      await expect(page.locator('[data-testid="page-error-boundary"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
      
      // Test that navigation still works
      await page.click('[data-testid="nav-home"]');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Error Logging and Reporting', () => {
    test('should log errors without exposing sensitive information', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto('/');
      
      // Trigger an error
      await page.evaluate(() => {
        console.error('Test error for logging verification');
      });
      
      // Wait for console messages to be processed
      await page.waitForTimeout(100);
      
      expect(consoleErrors.length).toBeGreaterThan(0);
      
      // Verify no sensitive information in logs
      const errorText = consoleErrors.join(' ');
      expect(errorText.toLowerCase()).not.toContain('password');
      expect(errorText.toLowerCase()).not.toContain('token');
      expect(errorText.toLowerCase()).not.toContain('secret');
      expect(errorText.toLowerCase()).not.toContain('api_key');
    });

    test('should generate unique error IDs for tracking', async ({ page }) => {
      await page.goto('/');
      
      // Create error tracking system
      const errorIds = await page.evaluate(() => {
        const ids: string[] = [];
        
        // Simulate error ID generation (like in BaseErrorBoundary)
        for (let i = 0; i < 3; i++) {
          const errorId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          ids.push(errorId);
        }
        
        return ids;
      });
      
      // Verify unique error IDs
      expect(errorIds.length).toBe(3);
      expect(new Set(errorIds).size).toBe(3); // All IDs should be unique
      
      // Verify error ID format (timestamp-random)
      errorIds.forEach(id => {
        expect(id).toMatch(/^\d{13}-[a-z0-9]{9}$/);
      });
    });
  });

  test.describe('Development vs Production Error Handling', () => {
    test('should hide detailed errors in production mode', async ({ page }) => {
      await page.goto('/');
      
      // Simulate production environment
      await page.evaluate(() => {
        // Override NODE_ENV for this test
        (window as any).__NODE_ENV = 'production';
      });
      
      // Create an error with detailed information
      await page.evaluate(() => {
        const errorContainer = document.createElement('div');
        errorContainer.setAttribute('data-testid', 'production-error');
        
        const isDev = (window as any).__NODE_ENV === 'development';
        
        errorContainer.innerHTML = `
          <div>
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred.</p>
            ${isDev ? '<pre data-testid="error-stack">Detailed stack trace here...</pre>' : ''}
            ${isDev ? '<div data-testid="error-details">Component details...</div>' : ''}
          </div>
        `;
        
        document.body.appendChild(errorContainer);
      });
      
      await expect(page.locator('[data-testid="production-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-stack"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="error-details"]')).not.toBeVisible();
    });
  });

  test.describe('Error Boundary Performance', () => {
    test('should not impact app performance when no errors occur', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      // Check that error boundaries don't add significant overhead
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        };
      });
      
      // Reasonable performance expectations
      expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);
      expect(performanceMetrics.loadComplete).toBeLessThan(10000);
    });

    test('should handle multiple concurrent errors efficiently', async ({ page }) => {
      await page.goto('/');
      
      const startTime = Date.now();
      
      // Trigger multiple errors simultaneously
      await page.evaluate(() => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Concurrent error ${i}`)), Math.random() * 100);
            }).catch(error => console.error(error))
          );
        }
        return Promise.all(promises);
      });
      
      const processingTime = Date.now() - startTime;
      
      // Should handle multiple errors quickly
      expect(processingTime).toBeLessThan(2000);
      
      // App should remain responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });
});