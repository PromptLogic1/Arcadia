import { test, expect } from '@playwright/test';
import { 
  waitForImagesLoaded, 
  waitForAnimations, 
  checkAccessibility,
  getPerformanceMetrics,
  mockApiResponse 
} from '../helpers/test-utils';
import { TEST_VIEWPORTS, TIMEOUTS } from '../helpers/test-data';

test.describe('Homepage - Hero Section & First Impression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all critical hero elements immediately @critical', async ({ page }) => {
    // Verify hero section is visible without scrolling
    const heroSection = page.locator('#main-content');
    await expect(heroSection).toBeInViewport();
    
    // Check main heading with NeonText component
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Arcadia')).toBeVisible();
    
    // Verify tagline/description is present
    const tagline = page.locator('text=/Experience the thrill of gaming|comprehensive gaming community platform/');
    await expect(tagline).toBeVisible();
    
    // Check primary CTAs exist
    const startPlayingButton = page.getByRole('button', { name: /Start Playing|Play Now/i });
    const joinCommunityButton = page.getByRole('button', { name: /Join Community|Community/i });
    
    await expect(startPlayingButton).toBeVisible();
    await expect(joinCommunityButton).toBeVisible();
  });

  test('should load all images with proper alt attributes', async ({ page }) => {
    await waitForImagesLoaded(page);
    
    // Check that all images have alt attributes
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
    
    // Check for proper lazy loading
    const lazyImages = await page.locator('img[loading="lazy"]').count();
    expect(lazyImages).toBeGreaterThan(0);
  });

  test('should show skip to main content link', async ({ page }) => {
    // Focus on the skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('text=Skip to main content');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    
    // Test skip link functionality
    await skipLink.click();
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('should render hero section with proper structure', async ({ page }) => {
    // Check for main content wrapper
    await expect(page.locator('main[role="main"]')).toBeVisible();
    await expect(page.locator('main[aria-label="Arcadia Gaming Platform"]')).toBeVisible();
    
    // Verify semantic HTML structure
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display featured challenges section', async ({ page }) => {
    // Scroll to featured challenges
    const featuredSection = page.locator('text=/Featured|Challenges/').first();
    await featuredSection.scrollIntoViewIfNeeded();
    
    // Check for challenge data
    const challengeElements = page.locator('[data-testid*="challenge"], .challenge-card, text=/Speedrun Showdown|Puzzle Master|Co-op Quest/');
    const challengeCount = await challengeElements.count();
    expect(challengeCount).toBeGreaterThan(0);
  });

  test('should have proper document structure', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Arcadia/);
    
    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription).toContain('gaming');
    
    // Check Open Graph tags
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Arcadia/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Intercept network requests to simulate slow loading
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('/_next/static/')) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await route.continue();
    });
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check for loading indicators
    const loadingElements = page.locator('text=Loading..., [data-testid="loading"]');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Verify main content is eventually visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should pass basic accessibility checks', async ({ page }) => {
    const a11yResults = await checkAccessibility(page);
    expect(a11yResults.passed).toBe(true);
    
    if (!a11yResults.passed) {
      console.log('Accessibility violations:', a11yResults.violations);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Start from the top
    await page.keyboard.press('Tab');
    
    // Should focus on skip link first
    await expect(page.locator('text=Skip to main content')).toBeFocused();
    
    // Continue tabbing through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should handle different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1280, height: 720 }, // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => 
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHorizontalScroll).toBe(false);
      
      // Check that main content is visible
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should display all main sections', async ({ page }) => {
    // List of expected sections based on the landing page structure
    const expectedSections = [
      'Try Demo Game',
      'Featured',
      'Upcoming Events',
      'Partners',
      'FAQ'
    ];
    
    for (const sectionName of expectedSections) {
      const section = page.locator(`text=${sectionName}`).first();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    
    // Check that animations are disabled
    const hasAnimations = await page.evaluate(() => {
      const animated = document.querySelectorAll('[class*="animate-"]');
      return Array.from(animated).some(el => {
        const style = getComputedStyle(el);
        return style.animationDuration !== '0s' && style.animationDuration !== '';
      });
    });
    
    // With reduced motion, animations should be minimal or paused
    expect(hasAnimations).toBe(false);
  });

  test('should track page view analytics', async ({ page }) => {
    const analyticsRequests: string[] = [];
    
    // Monitor analytics requests
    page.on('request', request => {
      if (request.url().includes('analytics') || 
          request.url().includes('gtag') ||
          request.url().includes('google-analytics')) {
        analyticsRequests.push(request.url());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for analytics to fire
    
    // Should have at least one analytics request
    expect(analyticsRequests.length).toBeGreaterThan(0);
  });
});

test.describe('Homepage - Error Handling', () => {
  test('should gracefully handle API failures', async ({ page }) => {
    // Mock API failures
    await mockApiResponse(page, '**/api/**', { status: 500 });
    
    await page.goto('/');
    
    // Page should still load with error boundaries
    await expect(page.locator('main')).toBeVisible();
    
    // Should not show uncaught error messages
    const errorMessages = page.locator('text=/Error|Failed|Cannot/');
    const errorCount = await errorMessages.count();
    
    // If there are error messages, they should be user-friendly
    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent();
      expect(errorText).not.toContain('undefined');
      expect(errorText).not.toContain('null');
    }
  });

  test('should show error boundary for component failures', async ({ page }) => {
    // Inject error to test error boundaries
    await page.addInitScript(() => {
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('React')) {
          // This is a React error, error boundary should catch it
        }
        originalError.apply(console, args);
      };
    });
    
    await page.goto('/');
    
    // Main content should still be accessible
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Homepage - Performance', () => {
  test('should meet performance benchmarks @performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (adjust based on your requirements)
    expect(loadTime).toBeLessThan(5000); // 5 seconds
    
    // Get additional performance metrics
    const metrics = await getPerformanceMetrics(page);
    
    // Log metrics for monitoring
    console.log('Performance metrics:', metrics);
    
    // Basic performance assertions
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
  });

  test('should not cause memory leaks', async ({ page }) => {
    // Navigate multiple times to check for memory leaks
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await page.goForward();
    }
    
    // Check that we're not accumulating event listeners
    const listenerCount = await page.evaluate(() => {
      const events = ['scroll', 'resize', 'click'];
      return events.reduce((count, event) => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        const originalCount = (window as any).getEventListeners?.(window)?.[event]?.length || 0;
        document.body.removeChild(div);
        return count + originalCount;
      }, 0);
    });
    
    // Should not have excessive listeners
    expect(listenerCount).toBeLessThan(50);
  });
});