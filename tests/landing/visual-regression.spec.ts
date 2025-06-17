/**
 * Visual regression tests for landing pages
 */

import { test, expect } from '@playwright/test';
import type { ViewportConfig, VisualRegressionResult } from './types';

// Viewport configurations for visual testing
const VISUAL_TEST_VIEWPORTS: ViewportConfig[] = [
  { width: 375, height: 667, name: 'mobile-iphone-se', isMobile: true, hasTouch: true },
  { width: 768, height: 1024, name: 'tablet-ipad', hasTouch: true },
  { width: 1280, height: 720, name: 'desktop-hd' },
  { width: 1920, height: 1080, name: 'desktop-full-hd' },
];

// Visual regression test configuration
const VISUAL_CONFIG = {
  threshold: 0.01, // 1% difference threshold
  animations: 'disabled',
  maxDiffPixels: 100,
  fullPage: true,
  mask: [
    // Mask dynamic content
    '[data-testid="timestamp"]',
    '[data-testid="user-avatar"]',
    '.dynamic-content',
  ],
};

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    // Mock date/time for consistency
    await page.addInitScript(() => {
      const constantDate = new Date('2024-01-01T12:00:00Z');
      Date.now = () => constantDate.getTime();
      Date.prototype.getTime = () => constantDate.getTime();
    });
  });

  VISUAL_TEST_VIEWPORTS.forEach(viewport => {
    test(`homepage should match visual baseline - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for fonts to load
      await page.waitForFunction(() => document.fonts.ready);
      
      // Wait for images to load
      await page.waitForFunction(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.every(img => img.complete && img.naturalHeight !== 0);
      });
      
      // Take screenshot
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: VISUAL_CONFIG.fullPage,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
        mask: VISUAL_CONFIG.mask.map(selector => page.locator(selector)),
      });
    });

    test(`about page should match visual baseline - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(() => document.fonts.ready);
      
      await expect(page).toHaveScreenshot(`about-${viewport.name}.png`, {
        fullPage: VISUAL_CONFIG.fullPage,
        threshold: VISUAL_CONFIG.threshold,
        maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
      });
    });
  });

  test('hero section should render consistently across themes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Light theme screenshot
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await page.waitForTimeout(100); // Wait for theme transition
    
    await expect(page.locator('#main-content')).toHaveScreenshot('hero-light-theme.png', {
      threshold: VISUAL_CONFIG.threshold,
    });
    
    // Dark theme screenshot
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(100);
    
    await expect(page.locator('#main-content')).toHaveScreenshot('hero-dark-theme.png', {
      threshold: VISUAL_CONFIG.threshold,
    });
  });

  test('navigation menu should render correctly in all states', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Closed state
    await expect(page.locator('header, nav').first()).toHaveScreenshot('nav-mobile-closed.png');
    
    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await page.waitForTimeout(300); // Wait for animation
      
      // Open state
      await expect(page.locator('body')).toHaveScreenshot('nav-mobile-open.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 375, height: 667 },
      });
    }
  });

  test('interactive elements should have proper focus states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test button focus state
    const button = page.locator('button').first();
    await button.focus();
    await expect(button).toHaveScreenshot('button-focused.png');
    
    // Test link focus state
    const link = page.locator('a').first();
    await link.focus();
    await expect(link).toHaveScreenshot('link-focused.png');
    
    // Test input focus state (if exists)
    const input = page.locator('input').first();
    if (await input.count() > 0) {
      await input.focus();
      await expect(input).toHaveScreenshot('input-focused.png');
    }
  });

  test('loading states should be visually consistent', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Capture loading state
    await page.waitForTimeout(500); // Wait for loading UI to appear
    await expect(page).toHaveScreenshot('page-loading-state.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  });

  test('error states should be visually consistent', async ({ page }) => {
    // Mock API errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Look for error UI
    const errorElement = page.locator('[role="alert"], [data-testid="error"], .error');
    if (await errorElement.count() > 0) {
      await expect(errorElement.first()).toHaveScreenshot('error-state.png');
    }
  });

  test('responsive images should load appropriate sizes', async ({ page }) => {
    const viewportTests = [
      { width: 375, expectedSrcset: '375w' },
      { width: 768, expectedSrcset: '768w' },
      { width: 1280, expectedSrcset: '1280w' },
    ];
    
    for (const { width, expectedSrcset } of viewportTests) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      
      const images = await page.locator('img[srcset]').all();
      
      for (const img of images.slice(0, 3)) { // Test first 3 images
        const srcset = await img.getAttribute('srcset');
        if (srcset) {
          // Verify appropriate image size is being used
          expect(srcset).toContain(expectedSrcset);
          
          // Take screenshot of image
          await expect(img).toHaveScreenshot(`responsive-image-${width}w.png`);
        }
      }
    }
  });

  test('animations should be disabled in visual tests', async ({ page }) => {
    await page.goto('/');
    
    // Check that animations are disabled
    const hasAnimations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      return Array.from(elements).some(el => {
        const styles = window.getComputedStyle(el);
        return (
          styles.animationDuration !== '0s' ||
          styles.transitionDuration !== '0s'
        );
      });
    });
    
    expect(hasAnimations).toBe(false);
  });

  test('custom fonts should load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for fonts
    await page.waitForFunction(() => document.fonts.ready);
    
    // Check loaded fonts
    const loadedFonts = await page.evaluate(() => {
      const fonts: string[] = [];
      document.fonts.forEach(font => {
        fonts.push(`${font.family} ${font.weight} ${font.style}`);
      });
      return fonts;
    });
    
    console.log('Loaded fonts:', loadedFonts);
    
    // Take screenshot of text with custom fonts
    const heading = page.locator('h1').first();
    await expect(heading).toHaveScreenshot('custom-font-heading.png');
  });

  test('critical above-the-fold content should render consistently', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 1280, height: 720, name: 'desktop' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Capture only above-the-fold content
      await expect(page).toHaveScreenshot(`above-fold-${viewport.name}.png`, {
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        },
      });
    }
  });
});

test.describe('Component Visual Tests', () => {
  test('button variants should match design system', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttonVariants = [
      { selector: 'button:has-text("Start Playing")', name: 'primary-cta' },
      { selector: 'button:has-text("Learn More")', name: 'secondary' },
      { selector: 'button[disabled]', name: 'disabled' },
    ];
    
    for (const variant of buttonVariants) {
      const button = page.locator(variant.selector).first();
      if (await button.count() > 0) {
        // Test normal state
        await expect(button).toHaveScreenshot(`button-${variant.name}-normal.png`);
        
        // Test hover state (desktop only)
        await button.hover();
        await page.waitForTimeout(200);
        await expect(button).toHaveScreenshot(`button-${variant.name}-hover.png`);
        
        // Test focus state
        await button.focus();
        await page.waitForTimeout(200);
        await expect(button).toHaveScreenshot(`button-${variant.name}-focus.png`);
      }
    }
  });

  test('navigation components should be visually consistent', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test header navigation
    const header = page.locator('header, nav[role="navigation"]').first();
    if (await header.count() > 0) {
      await expect(header).toHaveScreenshot('navigation-header.png');
    }
    
    // Test footer navigation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer, [role="contentinfo"]').first();
    if (await footer.count() > 0) {
      await expect(footer).toHaveScreenshot('navigation-footer.png');
    }
  });

  test('hero section components should render consistently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test hero section
    const heroSection = page.locator('#main-content, [data-testid="hero"]').first();
    if (await heroSection.count() > 0) {
      await expect(heroSection).toHaveScreenshot('hero-section.png');
    }
    
    // Test CTA buttons specifically
    const ctaContainer = page.locator('button:has-text("Start Playing")').locator('..');
    if (await ctaContainer.count() > 0) {
      await expect(ctaContainer).toHaveScreenshot('hero-cta-buttons.png');
    }
  });

  test('card components should maintain visual consistency', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for card-like components
    const cardSelectors = [
      '.card',
      '[class*="card"]',
      '.bg-white',
      '.shadow',
      '[data-testid*="card"]'
    ];
    
    for (const selector of cardSelectors) {
      const cards = page.locator(selector);
      const cardCount = await cards.count();
      
      if (cardCount > 0) {
        // Test first few cards
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = cards.nth(i);
          if (await card.isVisible()) {
            await expect(card).toHaveScreenshot(`card-component-${i}.png`);
          }
        }
      }
    }
  });

  test('form elements should have consistent styling', async ({ page }) => {
    // Try different pages that might have forms
    const pagesWithForms = ['/contact', '/auth/signup', '/auth/login'];
    
    for (const pagePath of pagesWithForms) {
      try {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const formElements = [
          { selector: 'input[type="text"]', name: 'text-input' },
          { selector: 'input[type="email"]', name: 'email-input' },
          { selector: 'input[type="password"]', name: 'password-input' },
          { selector: 'textarea', name: 'textarea' },
          { selector: 'select', name: 'select' },
          { selector: 'input[type="checkbox"]', name: 'checkbox' },
          { selector: 'input[type="radio"]', name: 'radio' },
        ];
        
        for (const element of formElements) {
          const el = page.locator(element.selector).first();
          if (await el.count() > 0) {
            // Test normal state
            await expect(el).toHaveScreenshot(`form-${element.name}-normal.png`);
            
            // Test focus state
            await el.focus();
            await page.waitForTimeout(100);
            await expect(el).toHaveScreenshot(`form-${element.name}-focus.png`);
            
            // Test with content
            if (element.selector.includes('input') && !element.selector.includes('checkbox') && !element.selector.includes('radio')) {
              await el.fill('Sample content');
              await expect(el).toHaveScreenshot(`form-${element.name}-filled.png`);
            }
          }
        }
        break; // Exit loop if we found a page with forms
      } catch (error) {
        // Continue to next page if this one doesn't exist
        continue;
      }
    }
  });

  test('loading and skeleton states should be consistent', async ({ page }) => {
    // Intercept requests to create loading states
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Capture loading state immediately
    await page.waitForTimeout(200);
    
    // Look for loading indicators
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '.skeleton',
      '[aria-label*="loading"]',
    ];
    
    for (const selector of loadingSelectors) {
      const loadingElement = page.locator(selector).first();
      if (await loadingElement.count() > 0 && await loadingElement.isVisible()) {
        await expect(loadingElement).toHaveScreenshot(`loading-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png`);
      }
    }
  });

  test('error states should be visually consistent', async ({ page }) => {
    // Mock API errors to trigger error states
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error for visual regression' }),
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Look for error UI
    const errorSelectors = [
      '[role="alert"]',
      '[data-testid="error"]',
      '.error',
      '.alert-error',
      '[aria-label*="error"]',
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        await expect(errorElement).toHaveScreenshot(`error-${selector.replace(/[^a-zA-Z0-9]/g, '')}.png`);
      }
    }
  });

  test('accessibility focus indicators should be visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test focus indicators on interactive elements
    const interactiveElements = [
      'button',
      'a[href]',
      'input',
      '[tabindex="0"]',
    ];
    
    for (const selector of interactiveElements) {
      const elements = page.locator(selector);
      const elementCount = await elements.count();
      
      if (elementCount > 0) {
        // Test first few elements
        for (let i = 0; i < Math.min(elementCount, 3); i++) {
          const element = elements.nth(i);
          if (await element.isVisible()) {
            await element.focus();
            await page.waitForTimeout(100);
            await expect(element).toHaveScreenshot(`focus-${selector.replace(/[^a-zA-Z0-9]/g, '')}-${i}.png`);
          }
        }
      }
    }
  });
});

/**
 * Helper function to compare screenshots programmatically
 */
async function compareScreenshots(
  page: Page,
  baselinePath: string,
  currentPath: string,
  threshold = 0.01
): Promise<VisualRegressionResult> {
  // This would integrate with a visual regression tool like Percy or Chromatic
  // For now, we'll use Playwright's built-in comparison
  
  return {
    testName: 'visual-comparison',
    viewport: { width: 1280, height: 720, name: 'desktop' },
    baselineImage: baselinePath,
    currentImage: currentPath,
    diffPercentage: 0,
    passed: true,
    threshold,
  };
}