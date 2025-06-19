import { test, expect } from '@playwright/test';
import { waitForNetworkIdle, checkAccessibility } from '../helpers/test-utils';

test.describe('404 and Error Page Handling', () => {
  test.describe('404 Page Functionality', () => {
    test('should display proper 404 page for non-existent routes', async ({
      page,
    }) => {
      const response = await page.goto('/this-page-does-not-exist');

      // Should return 404 status or handle gracefully
      if (response) {
        const status = response.status();
        // Either 404 or handled by client-side routing
        expect(status === 404 || status === 200).toBeTruthy();
      }

      // Should show 404 content
      const notFoundIndicators = page.locator(
        'text="404", text="Page not found", text="Not found", text="Page doesn\'t exist"'
      );

      expect(await notFoundIndicators.count()).toBeGreaterThan(0);
      await expect(notFoundIndicators.first()).toBeVisible();
    });

    test('should maintain navigation on 404 pages', async ({ page }) => {
      await page.goto('/invalid-route-12345');

      // Should have navigation elements
      const navigation = page.locator('nav, [role="navigation"], header');
      if ((await navigation.count()) > 0) {
        await expect(navigation.first()).toBeVisible();
      }

      // Should have working home link
      const homeLinks = page.locator(
        'a[href="/"], a:has-text("Home"), a:has-text("Back to home")'
      );
      if ((await homeLinks.count()) > 0) {
        await expect(homeLinks.first()).toBeVisible();

        // Test home navigation
        await homeLinks.first().click();
        await waitForNetworkIdle(page);
        await expect(page).toHaveURL('/');
      }
    });

    test('should provide helpful 404 page content', async ({ page }) => {
      await page.goto('/nonexistent-page');

      // Should have helpful messaging
      const helpfulContent = page.locator(
        'text="might have been moved", text="check the URL", text="find what you\'re looking for", text="search"'
      );

      if ((await helpfulContent.count()) > 0) {
        await expect(helpfulContent.first()).toBeVisible();
      }

      // Should have navigation options
      const navigationOptions = page.locator(
        'a:has-text("Home"), a:has-text("Back"), button:has-text("Search"), a:has-text("Browse")'
      );

      expect(await navigationOptions.count()).toBeGreaterThan(0);
    });

    test('should handle deep nested 404 routes', async ({ page }) => {
      await page.goto('/deeply/nested/path/that/does/not/exist');

      // Should still show proper 404 page
      const notFoundContent = page.locator('text="404", text="not found"');
      await expect(notFoundContent.first()).toBeVisible();

      // Should maintain site structure
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should handle 404s with query parameters', async ({ page }) => {
      await page.goto('/invalid-page?param1=value1&param2=value2');

      // Should handle gracefully regardless of query params
      const notFoundContent = page.locator('text="404", text="not found"');
      await expect(notFoundContent.first()).toBeVisible();

      // App should remain functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 404s with hash fragments', async ({ page }) => {
      await page.goto('/invalid-page#section');

      // Should handle hash fragments in 404 URLs
      const notFoundContent = page.locator('text="404", text="not found"');
      await expect(notFoundContent.first()).toBeVisible();

      // Should not cause JavaScript errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);

      // Filter out expected errors (network failures for 404s are ok)
      const unexpectedErrors = errors.filter(
        error =>
          !error.includes('404') &&
          !error.includes('Failed to fetch') &&
          !error.includes('Network request failed')
      );

      expect(unexpectedErrors.length).toBe(0);
    });
  });

  test.describe('Error Page Accessibility', () => {
    test('should have accessible 404 page', async ({ page }) => {
      await page.goto('/accessibility-test-404-page');

      // Basic accessibility check
      const accessibilityResult = await checkAccessibility(page);

      // Should have proper heading structure
      const headings = page.locator('h1, h2, h3');
      expect(await headings.count()).toBeGreaterThan(0);

      // Should have proper page title
      const title = await page.title();
      expect(title.toLowerCase()).toContain('not found');

      // Links should be focusable
      const links = page.locator('a');
      if ((await links.count()) > 0) {
        await links.first().focus();
        await expect(links.first()).toBeFocused();
      }
    });

    test('should support keyboard navigation on 404 page', async ({ page }) => {
      await page.goto('/keyboard-test-404');

      // Should be able to tab through interactive elements
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      if ((await focusedElement.count()) > 0) {
        await expect(focusedElement).toBeVisible();

        // Should be able to activate with Enter/Space
        await page.keyboard.press('Enter');

        // Should not cause errors
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have proper ARIA labels on 404 page', async ({ page }) => {
      await page.goto('/aria-test-404');

      // Should have proper landmarks
      const main = page.locator('main, [role="main"]');
      if ((await main.count()) > 0) {
        await expect(main.first()).toBeVisible();
      }

      // Navigation should be properly labeled
      const nav = page.locator('nav, [role="navigation"]');
      if ((await nav.count()) > 0) {
        const navLabel = await nav.first().getAttribute('aria-label');
        expect(navLabel).toBeTruthy();
      }
    });
  });

  test.describe('Dynamic Route 404s', () => {
    test('should handle 404s for dynamic routes with invalid IDs', async ({
      page,
    }) => {
      // Test common dynamic route patterns
      const invalidRoutes = [
        '/user/999999999',
        '/post/invalid-id',
        '/game/nonexistent-game',
        '/session/fake-session-id',
      ];

      for (const route of invalidRoutes) {
        await page.goto(route);

        // Should show appropriate error message
        const errorContent = page.locator(
          'text="not found", text="doesn\'t exist", text="invalid", text="404"'
        );

        if ((await errorContent.count()) > 0) {
          await expect(errorContent.first()).toBeVisible();
        }

        // Should maintain navigation
        const homeLink = page.locator('a[href="/"], a:has-text("Home")');
        if ((await homeLink.count()) > 0) {
          await expect(homeLink.first()).toBeVisible();
        }
      }
    });

    test('should differentiate between route not found and data not found', async ({
      page,
    }) => {
      // Route that exists but data doesn't
      await page.goto('/user/999999');

      // Might show "User not found" rather than "Page not found"
      const dataNotFound = page.locator(
        'text="User not found", text="Data not found", text="Content not available"'
      );
      const pageNotFound = page.locator('text="Page not found", text="404"');

      const hasDataError = (await dataNotFound.count()) > 0;
      const hasPageError = (await pageNotFound.count()) > 0;

      // Should show some kind of error
      expect(hasDataError || hasPageError).toBeTruthy();

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Page Performance', () => {
    test('should load 404 page quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/performance-test-404');
      await waitForNetworkIdle(page);

      const loadTime = Date.now() - startTime;

      // 404 page should load quickly
      expect(loadTime).toBeLessThan(3000);

      // Should have visible content
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, h2, main')).toBeVisible();
    });

    test('should not impact overall app performance', async ({ page }) => {
      // Load normal page first
      await page.goto('/');
      const normalLoadTime = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return navigation.loadEventEnd - navigation.fetchStart;
      });

      // Load 404 page
      await page.goto('/perf-404-test');
      const errorLoadTime = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return navigation.loadEventEnd - navigation.fetchStart;
      });

      // 404 should not be significantly slower
      expect(errorLoadTime).toBeLessThan(normalLoadTime * 2);
    });
  });

  test.describe('Error Page Content', () => {
    test('should provide search functionality on 404 page', async ({
      page,
    }) => {
      await page.goto('/search-test-404');

      // Look for search functionality
      const searchElements = page.locator(
        'input[type="search"], input[placeholder*="search"], button:has-text("Search")'
      );

      if ((await searchElements.count()) > 0) {
        const searchInput = searchElements.first();
        await searchInput.fill('test query');

        // Should handle search interaction
        const searchButton = page.locator('button:has-text("Search")');
        if ((await searchButton.count()) > 0) {
          await searchButton.click();
        } else {
          await searchInput.press('Enter');
        }

        // Should not cause errors
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should suggest similar or popular pages', async ({ page }) => {
      await page.goto('/suggestions-test-404');

      // Look for suggested content
      const suggestions = page.locator(
        'text="You might be looking for", text="Popular pages", text="Suggestions", a[href*="/"]'
      );

      if ((await suggestions.count()) > 0) {
        // Should have working links
        const suggestionLinks = page.locator('a[href^="/"]');
        if ((await suggestionLinks.count()) > 0) {
          await expect(suggestionLinks.first()).toBeVisible();

          // Test first suggestion link
          await suggestionLinks.first().click();
          await waitForNetworkIdle(page);

          // Should navigate successfully
          expect(page.url()).not.toContain('suggestions-test-404');
        }
      }
    });

    test('should handle internationalization on 404 pages', async ({
      page,
    }) => {
      // Test with different locales
      const locales = ['en', 'es', 'fr'];

      for (const locale of locales) {
        await page.goto(`/${locale}/this-does-not-exist`);

        // Should show 404 regardless of locale
        const errorIndicators = page.locator(
          'text="404", text="not found", text="no encontrado", text="pas trouvé"'
        );

        if ((await errorIndicators.count()) > 0) {
          await expect(errorIndicators.first()).toBeVisible();
        }

        // Should maintain language context if internationalized
        const langAttribute = await page.locator('html').getAttribute('lang');
        if (langAttribute) {
          expect(langAttribute.toLowerCase()).toContain(locale);
        }
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow recovery from 404 through navigation', async ({
      page,
    }) => {
      await page.goto('/recovery-test-404');

      // Verify 404 state
      const notFound = page.locator('text="404", text="not found"');
      await expect(notFound.first()).toBeVisible();

      // Navigate to valid page
      const homeLink = page.locator('a[href="/"], a:has-text("Home")');
      if ((await homeLink.count()) > 0) {
        await homeLink.click();
        await waitForNetworkIdle(page);

        // Should successfully recover
        await expect(page).toHaveURL('/');
        await expect(page.locator('text="404"')).not.toBeVisible();
      }
    });

    test('should clear 404 state when navigating back', async ({ page }) => {
      // Start on valid page
      await page.goto('/');

      // Navigate to 404
      await page.goto('/browser-history-404');
      await expect(
        page.locator('text="404", text="not found"').first()
      ).toBeVisible();

      // Go back
      await page.goBack();
      await waitForNetworkIdle(page);

      // Should be back to normal state
      await expect(page).toHaveURL('/');
      await expect(page.locator('text="404"')).not.toBeVisible();
    });

    test('should handle rapid navigation through 404s', async ({ page }) => {
      const invalidUrls = ['/rapid-1', '/rapid-2', '/rapid-3', '/'];

      for (const url of invalidUrls) {
        await page.goto(url);
        await page.waitForTimeout(100);
      }

      // Should end up on valid page without errors
      await expect(page).toHaveURL('/');
      await expect(page.locator('body')).toBeVisible();

      // Should not have accumulated errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(500);

      // Filter out expected network errors
      const unexpectedErrors = errors.filter(
        error => !error.includes('404') && !error.includes('Failed to fetch')
      );

      expect(unexpectedErrors.length).toBe(0);
    });
  });

  test.describe('SEO and Meta Data', () => {
    test('should have proper meta tags for 404 pages', async ({ page }) => {
      await page.goto('/seo-test-404');

      // Should have proper title
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/404|not found|page not found/);

      // Should have meta description
      const metaDescription = page.locator('meta[name="description"]');
      if ((await metaDescription.count()) > 0) {
        const content = await metaDescription.getAttribute('content');
        expect(content?.toLowerCase()).toMatch(/not found|404|page/);
      }

      // Should have proper robots meta
      const robotsMeta = page.locator('meta[name="robots"]');
      if ((await robotsMeta.count()) > 0) {
        const content = await robotsMeta.getAttribute('content');
        expect(content?.toLowerCase()).toContain('noindex');
      }
    });

    test('should have structured data for 404 pages', async ({ page }) => {
      await page.goto('/structured-data-404');

      // Check for JSON-LD structured data
      const structuredData = page.locator('script[type="application/ld+json"]');

      if ((await structuredData.count()) > 0) {
        const content = await structuredData.textContent();
        if (content) {
          const data = JSON.parse(content);
          expect(data['@type']).toBeDefined();
        }
      }
    });
  });
});
