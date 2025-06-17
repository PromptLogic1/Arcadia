import { Page } from '@playwright/test';
import type { TestWindow, A11yViolation } from '../auth/types/test-types';

/**
 * Wait for all images on the page to load
 */
export async function waitForImagesLoaded(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete && img.naturalHeight !== 0);
  });
}

/**
 * Wait for all animations to complete
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.getAnimations()).map(animation => animation.finished)
    );
  });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel: string) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Mock API responses with proper typing
 */
export async function mockApiResponse<T = unknown>(
  page: Page,
  pattern: string | RegExp,
  response: {
    status?: number;
    body?: T;
    headers?: Record<string, string>;
  }
): Promise<void> {
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      headers: response.headers,
      body: JSON.stringify(response.body || {}),
    });
  });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Enhanced accessibility check with proper typing
 */
export async function checkAccessibility(page: Page, selector?: string): Promise<{
  passed: boolean;
  violations: A11yViolation[];
}> {
  const violations: A11yViolation[] = [];
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.evaluate((sel?: string) => {
    const root = sel ? document.querySelector(sel) : document;
    if (!root) return 0;
    return root.querySelectorAll('img:not([alt])').length;
  }, selector);
  
  if (imagesWithoutAlt > 0) {
    violations.push({
      id: 'image-alt',
      impact: 'serious',
      description: `${imagesWithoutAlt} images without alt text`,
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
      nodes: [],
    });
  }
  
  // Check for form inputs without labels
  const inputsWithoutLabels = await page.evaluate((sel?: string) => {
    const root = sel ? document.querySelector(sel) : document;
    if (!root) return 0;
    
    const inputs = root.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([aria-label]):not([aria-labelledby])'
    );
    
    let unlabeledCount = 0;
    inputs.forEach(input => {
      const inputEl = input as HTMLInputElement;
      const hasLabel = inputEl.labels && inputEl.labels.length > 0;
      if (!hasLabel) unlabeledCount++;
    });
    
    return unlabeledCount;
  }, selector);
  
  if (inputsWithoutLabels > 0) {
    violations.push({
      id: 'label',
      impact: 'serious',
      description: `${inputsWithoutLabels} form inputs without labels`,
      help: 'Form elements must have labels',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
      nodes: [],
    });
  }
  
  // Check for buttons without accessible text
  const buttonsWithoutText = await page.evaluate((sel?: string) => {
    const root = sel ? document.querySelector(sel) : document;
    if (!root) return 0;
    
    const buttons = root.querySelectorAll('button');
    let count = 0;
    
    buttons.forEach(btn => {
      const hasText = btn.textContent?.trim() || 
                     btn.getAttribute('aria-label') ||
                     btn.getAttribute('aria-labelledby');
      if (!hasText) count++;
    });
    
    return count;
  }, selector);
  
  if (buttonsWithoutText > 0) {
    violations.push({
      id: 'button-name',
      impact: 'critical',
      description: `${buttonsWithoutText} buttons without accessible text`,
      help: 'Buttons must have discernible text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/button-name',
      nodes: [],
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Take a full page screenshot with scroll
 */
export async function takeFullPageScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Get performance metrics with proper typing
 */
export async function getPerformanceMetrics(page: Page): Promise<{
  domContentLoaded: number;
  load: number;
  firstPaint: number;
  firstContentfulPaint: number;
}> {
  const performanceTimings = await page.evaluate(() => {
    // Use Navigation Timing API v2
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navTiming = navEntries[0];
    
    if (!navTiming) {
      return {
        domContentLoaded: 0,
        load: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
      };
    }
    
    const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    return {
      domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
      load: navTiming.loadEventEnd - navTiming.fetchStart,
      firstPaint: firstPaint?.startTime || 0,
      firstContentfulPaint: firstContentfulPaint?.startTime || 0,
    };
  });
  
  return performanceTimings;
}

/**
 * Test responsive behavior
 */
export async function testResponsive(
  page: Page,
  url: string,
  viewports: Array<{ width: number; height: number; name: string }>
): Promise<Array<{
  viewport: string;
  screenshot: Buffer;
  timestamp: string;
}>> {
  const results: Array<{
    viewport: string;
    screenshot: Buffer;
    timestamp: string;
  }> = [];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await waitForNetworkIdle(page);
    
    const screenshot = await page.screenshot({
      fullPage: true,
    });
    
    results.push({
      viewport: viewport.name,
      screenshot,
      timestamp: new Date().toISOString(),
    });
  }
  
  return results;
}

/**
 * Fill form with test data
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string | boolean>
): Promise<void> {
  for (const [field, value] of Object.entries(formData)) {
    const input = page.locator(`[name="${field}"], [id="${field}"], [aria-label="${field}"]`).first();
    
    if (typeof value === 'boolean') {
      const isChecked = await input.isChecked();
      if (isChecked !== value) {
        await input.click();
      }
    } else {
      await input.fill(value);
    }
  }
}

/**
 * Wait for Zustand store to be ready
 */
export async function waitForStore(page: Page, storeName: string): Promise<void> {
  await page.waitForFunction(
    (name: string) => {
      const testWindow = window as TestWindow;
      return testWindow.__zustand !== undefined && testWindow.__zustand[name] !== undefined;
    },
    storeName,
    { timeout: 5000 }
  );
}

/**
 * Get Zustand store state with proper typing
 */
export async function getStoreState<T = unknown>(page: Page, storeName: string): Promise<T | null> {
  return await page.evaluate((name: string) => {
    const testWindow = window as TestWindow;
    const store = testWindow.__zustand?.[name];
    if (!store) return null;
    return store.getState() as T;
  }, storeName);
}