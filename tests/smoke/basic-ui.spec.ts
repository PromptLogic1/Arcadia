import { test, expect } from '@playwright/test';
import { 
  waitForNetworkIdle, 
  checkAccessibility, 
  getPerformanceMetrics,
  waitForImagesLoaded 
} from '../helpers/test-utils';
import { TIMEOUTS } from '../helpers/test-data';

test.describe('Basic UI Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Check that page loaded
    await expect(page).toHaveTitle(/Arcadia/i);
    
    // Check for key elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check for hero section
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
    
    // Wait for images to load
    await waitForImagesLoaded(page);
    
    // Check performance metrics
    const metrics = await getPerformanceMetrics(page);
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.load).toBeLessThan(5000);
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that navigation menu is visible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Test navigation links
    const navLinks = [
      { text: 'About', href: '/about' },
      { text: 'Play', href: '/play' },
      { text: 'Community', href: '/community' },
    ];
    
    for (const link of navLinks) {
      const linkElement = nav.getByText(link.text, { exact: false });
      await expect(linkElement).toBeVisible();
      
      // Click and verify navigation
      await linkElement.click();
      await page.waitForURL(`**${link.href}**`);
      expect(page.url()).toContain(link.href);
      
      // Go back to homepage for next test
      await page.goto('/');
    }
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');
    
    // Find theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="Theme"]').first();
    
    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class') || '';
    const isDarkMode = initialTheme.includes('dark');
    
    // Click theme toggle
    await themeToggle.click();
    
    // Wait for theme change
    await page.waitForTimeout(TIMEOUTS.animation);
    
    // Check that theme changed
    const newTheme = await htmlElement.getAttribute('class') || '';
    const isNowDarkMode = newTheme.includes('dark');
    
    expect(isNowDarkMode).toBe(!isDarkMode);
  });

  test('responsive design works', async ({ page }) => {
    await page.goto('/');
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForNetworkIdle(page);
    
    // Desktop navigation should be visible
    const desktopNav = page.locator('nav').first();
    await expect(desktopNav).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(TIMEOUTS.animation);
    
    // Mobile menu button should be visible
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    await expect(mobileMenuButton).toBeVisible();
    
    // Click mobile menu
    await mobileMenuButton.click();
    
    // Mobile navigation should appear
    const mobileNav = page.locator('nav[aria-label*="mobile"], nav[aria-label*="Mobile"], [data-testid="mobile-nav"]').first();
    await expect(mobileNav).toBeVisible();
  });

  test('error boundaries work', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/this-page-does-not-exist-404');
    
    // Should get 404 response
    expect(response?.status()).toBe(404);
    
    // Should show 404 page content
    await expect(page.locator('h1, h2')).toContainText(/404|not found/i);
    
    // Should still have header/footer
    await expect(page.locator('header')).toBeVisible();
  });

  test('basic accessibility checks pass', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Run accessibility checks
    const accessibility = await checkAccessibility(page);
    
    // Log any violations for debugging
    if (!accessibility.passed) {
      console.log('Accessibility violations:', accessibility.violations);
    }
    
    // Basic checks should pass
    expect(accessibility.violations.length).toBeLessThanOrEqual(5); // Allow some violations for now
  });

  test('loading states work correctly', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/api/**', async route => {
      await page.waitForTimeout(1000); // Simulate delay
      await route.continue();
    });
    
    await page.goto('/');
    
    // Check for loading indicators
    const loadingElements = page.locator('[data-testid="loading"], .loading, [aria-busy="true"]');
    
    // Wait for loading to complete
    await waitForNetworkIdle(page);
    
    // Loading indicators should be gone
    await expect(loadingElements).toHaveCount(0);
  });

  test('footer links work', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Check for common footer links
    const footerLinks = [
      'Privacy',
      'Terms',
      'Contact',
    ];
    
    for (const linkText of footerLinks) {
      const link = footer.getByText(linkText, { exact: false });
      const linkCount = await link.count();
      
      if (linkCount > 0) {
        await expect(link.first()).toBeVisible();
      }
    }
  });

  test('forms have proper validation', async ({ page }) => {
    // Go to login page which should have a form
    await page.goto('/auth/login');
    
    // Find form
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // Try to submit empty form
    const submitButton = form.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show validation errors
    const errorMessages = page.locator('[role="alert"], .error-message, [aria-invalid="true"]');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await waitForImagesLoaded(page);
    
    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    // Check each image for alt text
    let imagesWithoutAlt = 0;
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt++;
        const src = await img.getAttribute('src');
        console.log(`Image without alt text: ${src}`);
      }
    }
    
    // Most images should have alt text
    const percentageWithAlt = ((imageCount - imagesWithoutAlt) / imageCount) * 100;
    expect(percentageWithAlt).toBeGreaterThan(80); // At least 80% should have alt text
  });
});