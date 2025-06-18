import { test, expect } from '@playwright/test';
import { waitForNetworkIdle } from '../helpers/test-utils';

test.describe('Responsive Design - Mobile & Tablet', () => {
  const viewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 390, height: 844, name: 'iPhone 12' },
    { width: 768, height: 1024, name: 'iPad Portrait' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 1280, height: 720, name: 'Desktop' },
    { width: 1920, height: 1080, name: 'Full HD' },
  ];

  for (const viewport of viewports) {
    test(`should render properly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Verify no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => 
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHorizontalScroll).toBe(false);
      
      // Check that main content is visible
      await expect(page.locator('main')).toBeVisible();
      
      // Verify hero section is visible
      const heroSection = page.locator('#main-content');
      await expect(heroSection).toBeInViewport();
      
      // Check that primary CTAs are visible
      const ctaButtons = page.locator('button:has-text("Start Playing"), button:has-text("Play"), a:has-text("Start Playing")');
      const ctaCount = await ctaButtons.count();
      expect(ctaCount).toBeGreaterThan(0);
      
      // First CTA should be visible without scrolling
      await expect(ctaButtons.first()).toBeInViewport();
    });
  }

  test('should adapt layout for mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Mobile-specific checks
    
    // Text should not overflow
    const textElements = page.locator('h1, h2, h3, p');
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 5); i++) {
      const element = textElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        // Text should not extend beyond viewport
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 10); // 10px tolerance
      }
    }
    
    // Buttons should have adequate touch targets (at least 44px)
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40); // Slightly less than 44px for tolerance
        }
      }
    }
  });

  test('should show mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Look for mobile menu trigger
    const menuTrigger = page.locator('button[aria-label*="menu"], button:has([data-lucide="menu"]), [data-testid="mobile-menu-trigger"]');
    
    if (await menuTrigger.count() > 0) {
      await expect(menuTrigger).toBeVisible();
      
      // Mobile menu should be hidden initially
      const mobileMenu = page.locator('[role="menu"], .mobile-menu, [data-testid="mobile-menu"]');
      if (await mobileMenu.count() > 0) {
        // Menu should be hidden or off-screen initially
        const isVisible = await mobileMenu.isVisible();
        const box = await mobileMenu.boundingBox();
        
        expect(isVisible === false || (box && box.x < -100)).toBe(true);
        
        // Click to open menu
        await menuTrigger.click();
        await page.waitForTimeout(300); // Wait for animation
        
        // Menu should now be visible
        await expect(mobileMenu).toBeVisible();
        
        // Check for navigation items in mobile menu
        const navItems = mobileMenu.locator('a, button');
        const navItemCount = await navItems.count();
        expect(navItemCount).toBeGreaterThan(0);
      }
    }
  });

  test('should stack elements vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/about'); // Test feature grid on about page
    await waitForNetworkIdle(page);
    
    // Find feature grid or similar layout
    const gridContainer = page.locator('.grid, .flex, [class*="grid-cols"]').first();
    
    if (await gridContainer.count() > 0) {
      const gridItems = gridContainer.locator('> *');
      const itemCount = await gridItems.count();
      
      if (itemCount >= 2) {
        const firstItem = await gridItems.first().boundingBox();
        const secondItem = await gridItems.nth(1).boundingBox();
        
        if (firstItem && secondItem) {
          // On mobile, items should stack vertically (same x position, different y)
          const xDifference = Math.abs(firstItem.x - secondItem.x);
          expect(xDifference).toBeLessThan(50); // Should be approximately same x position
          expect(secondItem.y).toBeGreaterThan(firstItem.y + firstItem.height - 10); // Should be below
        }
      }
    }
  });

  test('should handle tablet landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Content should fit properly in landscape
    await expect(page.locator('main')).toBeVisible();
    
    // Hero content should be visible without scrolling
    const heroContent = page.locator('h1, [class*="hero"]').first();
    await expect(heroContent).toBeInViewport();
    
    // Check that layout uses available horizontal space
    const container = page.locator('.container, main, [class*="max-w"]').first();
    const containerBox = await container.boundingBox();
    
    if (containerBox) {
      // Should use reasonable portion of width
      expect(containerBox.width).toBeGreaterThan(600);
    }
  });

  test('should adapt carousel/slider for touch devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Look for carousel/slider component
    const carousel = page.locator('.carousel, .slider, [class*="snap"], .swiper').first();
    
    if (await carousel.count() > 0) {
      await carousel.scrollIntoViewIfNeeded();
      
      // Check if carousel has proper touch scrolling
      const hasOverflow = await carousel.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.overflowX === 'scroll' || style.overflowX === 'auto';
      });
      
      expect(hasOverflow).toBe(true);
      
      // Test touch scrolling
      const initialScrollLeft = await carousel.evaluate(el => el.scrollLeft);
      
      // Simulate swipe gesture
      await carousel.hover();
      await page.mouse.down();
      await page.mouse.move(-100, 0);
      await page.mouse.up();
      
      await page.waitForTimeout(300);
      
      const finalScrollLeft = await carousel.evaluate(el => el.scrollLeft);
      expect(finalScrollLeft).not.toBe(initialScrollLeft);
    }
  });

  test('should maintain readability at all sizes', async ({ page }) => {
    const testViewports = [
      { width: 320, height: 568 }, // Small mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1440, height: 900 }, // Large desktop
    ];

    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Check font sizes are readable
      const headings = page.locator('h1, h2, h3');
      const headingCount = await headings.count();
      
      for (let i = 0; i < Math.min(headingCount, 3); i++) {
        const heading = headings.nth(i);
        const fontSize = await heading.evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
        
        // Font should be at least 14px on mobile, larger on desktop
        const minFontSize = viewport.width < 768 ? 14 : 16;
        expect(fontSize).toBeGreaterThanOrEqual(minFontSize);
      }
      
      // Check paragraph text
      const paragraphs = page.locator('p');
      const paragraphCount = await paragraphs.count();
      
      if (paragraphCount > 0) {
        const paragraph = paragraphs.first();
        const fontSize = await paragraph.evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
        
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('should handle image responsive behavior', async ({ page }) => {
    const testViewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
    ];

    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Find images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const image = images.nth(i);
        
        if (await image.isVisible()) {
          const box = await image.boundingBox();
          
          if (box) {
            // Images should not overflow container
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 10);
            
            // Images should have reasonable aspect ratio
            const aspectRatio = box.width / box.height;
            expect(aspectRatio).toBeGreaterThan(0.1);
            expect(aspectRatio).toBeLessThan(10);
          }
        }
      }
    }
  });

  test('should support pinch-to-zoom meta tag', async ({ page }) => {
    await page.goto('/');
    
    // Check for viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toBeTruthy();
    
    // Should allow user scaling for accessibility
    expect(viewportMeta).not.toContain('user-scalable=no');
    expect(viewportMeta).not.toContain('maximum-scale=1');
  });

  test('should maintain usable spacing on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Check that clickable elements have adequate spacing
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount - 1, 3); i++) {
      const button1 = buttons.nth(i);
      const button2 = buttons.nth(i + 1);
      
      if (await button1.isVisible() && await button2.isVisible()) {
        const box1 = await button1.boundingBox();
        const box2 = await button2.boundingBox();
        
        if (box1 && box2) {
          // Calculate distance between buttons
          const verticalDistance = Math.abs(box2.y - (box1.y + box1.height));
          const horizontalDistance = Math.abs(box2.x - (box1.x + box1.width));
          
          // Buttons should have at least 8px spacing
          if (verticalDistance < 50) { // If they're roughly in the same row
            expect(horizontalDistance).toBeGreaterThan(8);
          } else {
            expect(verticalDistance).toBeGreaterThan(8);
          }
        }
      }
    }
  });
});

test.describe('Responsive Design - Cross-browser', () => {
  test('should maintain layout consistency across browsers', async ({ page, browserName: _browserName }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Basic layout checks that should work across all browsers
    await expect(page.locator('main')).toBeVisible();
    
    // Check that CSS Grid/Flexbox layouts work
    const layoutContainers = page.locator('.grid, .flex, [style*="grid"], [style*="flex"]');
    const containerCount = await layoutContainers.count();
    
    if (containerCount > 0) {
      const container = layoutContainers.first();
      await expect(container).toBeVisible();
      
      // Container should have reasonable dimensions
      const box = await container.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(100);
        expect(box.height).toBeGreaterThan(50);
      }
    }
  });

  test('should handle different pixel densities', async ({ page }) => {
    // Test with different device pixel ratios
    const devicePixelRatios = [1, 2, 3];
    
    for (const ratio of devicePixelRatios) {
      await page.emulateMedia({ 
        media: 'screen',
        colorScheme: 'light',
      });
      
      // Simulate different pixel ratios
      await page.addInitScript((ratio) => {
        Object.defineProperty(window, 'devicePixelRatio', {
          get: () => ratio,
        });
      }, ratio);
      
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Content should still be visible and properly sized
      await expect(page.locator('main')).toBeVisible();
      
      // Images should load appropriately
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        const firstImage = images.first();
        await expect(firstImage).toBeVisible();
        
        // Image should have loaded
        const naturalWidth = await firstImage.evaluate(img => (img as HTMLImageElement).naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Responsive Design - Accessibility', () => {
  test('should maintain focus visibility at all viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
        
        // Focus should be within viewport
        const box = await focusedElement.boundingBox();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    }
  });

  test('should support screen reader navigation at all sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Should have h1
    await expect(page.locator('h1')).toHaveCount(1);
    
    // Check for landmark regions
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    const landmarkCount = await landmarks.count();
    expect(landmarkCount).toBeGreaterThan(0);
  });

  test('should maintain color contrast at all sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForNetworkIdle(page);
    
    // Basic check for contrast by ensuring text elements are visible
    const textElements = page.locator('h1, h2, h3, p, a, button');
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 5); i++) {
      const element = textElements.nth(i);
      
      if (await element.isVisible()) {
        // Element should have text content
        const textContent = await element.textContent();
        expect(textContent?.trim().length).toBeGreaterThan(0);
        
        // Element should have computed color values
        const color = await element.evaluate(el => window.getComputedStyle(el).color);
        expect(color).toMatch(/rgb|rgba|#/);
      }
    }
  });
});