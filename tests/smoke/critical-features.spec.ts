import { test, expect } from '@playwright/test';
import { waitForNetworkIdle } from '../helpers/test-utils';
import { TIMEOUTS } from '../helpers/test-data';

test.describe('Critical Features Smoke Tests', () => {
  test.describe('Landing Page', () => {
    test('hero section displays correctly', async ({ page }) => {
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Check hero section
      const heroSection = page.locator('section').filter({ 
        has: page.locator('h1, h2').filter({ hasText: /welcome|arcadia|play|game/i })
      }).first();
      
      await expect(heroSection).toBeVisible();
      
      // Check for CTA buttons
      const ctaButtons = heroSection.locator('button, a[role="button"]');
      const ctaCount = await ctaButtons.count();
      expect(ctaCount).toBeGreaterThan(0);
      
      // Check first CTA is visible and clickable
      if (ctaCount > 0) {
        const firstCta = ctaButtons.first();
        await expect(firstCta).toBeVisible();
        await expect(firstCta).toBeEnabled();
      }
    });

    test('featured games carousel works', async ({ page }) => {
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Look for carousel/slider
      const carousel = page.locator('[data-testid*="carousel"], [class*="carousel"], [class*="slider"], [role="region"][aria-label*="carousel"]').first();
      
      if (await carousel.isVisible()) {
        // Check for navigation buttons
        // const prevButton = carousel.locator('button[aria-label*="previous"], button[aria-label*="prev"]').first();
        const nextButton = carousel.locator('button[aria-label*="next"]').first();
        
        // If navigation exists, test it
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(TIMEOUTS.animation);
        }
      }
    });

    test('upcoming events section loads', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      
      // Look for events section
      const eventsSection = page.locator('section').filter({
        has: page.locator('h2, h3').filter({ hasText: /event|upcoming|tournament/i })
      }).first();
      
      if (await eventsSection.isVisible()) {
        // Check for event cards/items
        const eventItems = eventsSection.locator('[class*="card"], [class*="event"], article');
        const eventCount = await eventItems.count();
        
        if (eventCount > 0) {
          await expect(eventItems.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Authentication Pages', () => {
    test('login page loads and has required elements', async ({ page }) => {
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      
      // Check page title/heading
      await expect(page.locator('h1, h2').filter({ hasText: /sign in|log in/i }).first()).toBeVisible();
      
      // Check form elements
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Email input
      const emailInput = form.locator('input[type="email"], input[name="email"], input[id="email"]').first();
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeEnabled();
      
      // Password input
      const passwordInput = form.locator('input[type="password"], input[name="password"], input[id="password"]').first();
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toBeEnabled();
      
      // Submit button
      const submitButton = form.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
      
      // Link to sign up
      const signUpLink = page.locator('a').filter({ hasText: /sign up|create account|register/i }).first();
      await expect(signUpLink).toBeVisible();
    });

    test('signup page loads and has required elements', async ({ page }) => {
      await page.goto('/auth/signup');
      await waitForNetworkIdle(page);
      
      // Check page title/heading
      await expect(page.locator('h1, h2').filter({ hasText: /sign up|create account|register/i }).first()).toBeVisible();
      
      // Check form elements
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Required inputs
      const requiredInputs = [
        { selector: 'input[type="email"], input[name="email"]', label: 'Email' },
        { selector: 'input[type="password"], input[name="password"]', label: 'Password' },
      ];
      
      for (const input of requiredInputs) {
        const inputElement = form.locator(input.selector).first();
        await expect(inputElement).toBeVisible();
        await expect(inputElement).toBeEnabled();
      }
      
      // Submit button
      const submitButton = form.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText(/sign up|create|register/i);
    });
  });

  test.describe('Main Navigation Routes', () => {
    const routes = [
      { path: '/play', title: /play|games|arcade/i },
      { path: '/community', title: /community|discuss|forum/i },
      { path: '/about', title: /about|story|mission/i },
    ];
    
    for (const route of routes) {
      test(`${route.path} page loads correctly`, async ({ page }) => {
        await page.goto(route.path);
        await waitForNetworkIdle(page);
        
        // Check for main heading
        await expect(page.locator('h1, h2').filter({ hasText: route.title }).first()).toBeVisible();
        
        // Page should have content
        const mainContent = page.locator('main, [role="main"]').first();
        await expect(mainContent).toBeVisible();
        
        // Check that it's not showing an error
        const errorElement = page.locator('[data-testid="error"], .error-boundary, [role="alert"]').first();
        const errorCount = await errorElement.count();
        
        if (errorCount > 0) {
          const errorText = await errorElement.textContent();
          expect(errorText).not.toMatch(/error|failed|something went wrong/i);
        }
      });
    }
  });

  test.describe('Play Area', () => {
    test('play area hub loads', async ({ page }) => {
      await page.goto('/play');
      await waitForNetworkIdle(page);
      
      // Should show game categories or featured games
      const gameCards = page.locator('[data-testid*="game"], [class*="game-card"], article[class*="card"]');
      const gameCount = await gameCards.count();
      
      if (gameCount > 0) {
        await expect(gameCards.first()).toBeVisible();
        
        // Check if games have titles
        const firstGameTitle = gameCards.first().locator('h3, h4, [class*="title"]').first();
        await expect(firstGameTitle).toBeVisible();
      }
      
      // Check for game categories/filters
      const filters = page.locator('[role="tablist"], [data-testid*="filter"], [class*="category"]');
      if (await filters.isVisible()) {
        const filterButtons = filters.locator('button, [role="tab"]');
        const filterCount = await filterButtons.count();
        expect(filterCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Community Section', () => {
    test('community page loads with discussions', async ({ page }) => {
      await page.goto('/community');
      await waitForNetworkIdle(page);
      
      // Check for discussions list or create button
      const createButton = page.locator('button, a').filter({ hasText: /create|new discussion|post/i }).first();
      
      // Check for discussion items
      const discussions = page.locator('[data-testid*="discussion"], [class*="discussion"], article[class*="post"]');
      const discussionCount = await discussions.count();
      
      // Should have either discussions or a way to create them
      if (discussionCount === 0) {
        await expect(createButton).toBeVisible();
      } else {
        await expect(discussions.first()).toBeVisible();
        
        // Check discussion has title and metadata
        const firstDiscussion = discussions.first();
        const title = firstDiscussion.locator('h3, h4, [class*="title"]').first();
        await expect(title).toBeVisible();
      }
    });
  });

  test.describe('User Settings', () => {
    test('settings page is accessible', async ({ page }) => {
      await page.goto('/settings');
      
      // Might redirect to login if not authenticated
      const currentUrl = page.url();
      
      if (currentUrl.includes('/auth/login')) {
        // That's fine, authentication is working
        await expect(page.locator('form')).toBeVisible();
      } else {
        // Settings page loaded
        await expect(page.locator('h1, h2').filter({ hasText: /settings|preferences|profile/i }).first()).toBeVisible();
        
        // Should have settings sections
        const settingsSections = page.locator('[role="tablist"], [data-testid*="settings"], section[class*="settings"]');
        await expect(settingsSections.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      
      await page.goto('/');
      
      // Page should still load
      await expect(page.locator('header')).toBeVisible();
      
      // Might show error notifications
      const errorNotifications = page.locator('[role="alert"], [data-testid*="error"], .error-message');
      
      // If errors are shown, they should be user-friendly
      if (await errorNotifications.first().isVisible()) {
        const errorText = await errorNotifications.first().textContent();
        expect(errorText).not.toContain('500');
        expect(errorText).not.toContain('undefined');
      }
    });

    test('handles network offline gracefully', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.setOffline(true);
      
      // Try to navigate
      await page.getByRole('link', { name: /about/i }).first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Should show offline message or cached content
      await page.waitForTimeout(1000);
      
      // Check if offline message appears
      const offlineMessage = page.locator('text=/offline|no internet|connection/i');
      const isOfflineMessageVisible = await offlineMessage.isVisible().catch(() => false);
      
      // Page should handle offline state somehow
      expect(isOfflineMessageVisible || page.url().includes('/about')).toBeTruthy();
    });
  });
});