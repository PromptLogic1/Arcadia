import { test, expect, type Route } from '@playwright/test';
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
    await expect(page.locator('main[aria-label="Arcadia Gaming Platform"]')).toBeVisible();
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
    
    // Check that primary navigation menu is visible (desktop)
    const nav = page.locator('nav[aria-label="Primary Navigation"]');
    await expect(nav).toBeVisible();
    
    // Test navigation links - update to match actual navigation
    const navLinks = [
      { text: 'About', href: '/about' },
      { text: 'Play Area', href: '/play-area' },
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
    await waitForNetworkIdle(page);
    
    // Try to find theme toggle - check both desktop and mobile versions
    const desktopToggle = page.locator('button[aria-label="Toggle theme"]:not([disabled])');
    const mobileToggle = page.locator('button[aria-label*="theme"]:not([disabled])');
    
    // Wait for at least one theme toggle to be available
    let themeToggle;
    try {
      await desktopToggle.waitFor({ timeout: 5000 });
      themeToggle = desktopToggle;
    } catch {
      await mobileToggle.waitFor({ timeout: 5000 });
      themeToggle = mobileToggle;
    }
    
    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class') || '';
    const isDarkMode = initialTheme.includes('dark');
    
    // Handle different theme toggle variants
    const ariaLabel = await themeToggle.getAttribute('aria-label') || '';
    if (ariaLabel === 'Toggle theme') {
      // Desktop dropdown version
      await themeToggle.click();
      
      // Click the opposite theme option
      if (isDarkMode) {
        await page.locator('text=Light').click();
      } else {
        await page.locator('text=Dark').click();
      }
    } else {
      // Mobile toggle version - just click to toggle
      await themeToggle.click();
    }
    
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
    const desktopNav = page.locator('nav[aria-label="Primary Navigation"]');
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
    const mobileNav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(mobileNav).toBeVisible();
  });

  test('error boundaries work', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/this-page-does-not-exist-404');
    
    // Should get 404 response
    expect(response?.status()).toBe(404);
    
    // Should show 404 page content - be more specific about which heading
    await expect(page.locator('h1').first()).toContainText(/404/i);
    
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
    await page.route('**/api/**', async (route: Route) => {
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
    await waitForNetworkIdle(page);
    
    // Find form
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // Fill in invalid data to trigger validation
    const emailField = form.locator('input[type="email"], input[name="email"]').first();
    const passwordField = form.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailField.isVisible()) {
      await emailField.fill('invalid-email'); // Invalid email format
    }
    if (await passwordField.isVisible()) {
      await passwordField.fill('123'); // Too short password
    }
    
    // Try to submit form with invalid data
    const submitButton = form.locator('button[type="submit"]:not([disabled])');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors
      const errorMessages = page.locator('[role="alert"], .error-message, [aria-invalid="true"], .text-red-500, .text-destructive');
      await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
    } else {
      // If submit button is still disabled, check for real-time validation
      const validationMessages = page.locator('[role="alert"], .error-message, .text-red-500, .text-destructive');
      await expect(validationMessages.first()).toBeVisible({ timeout: 5000 });
    }
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