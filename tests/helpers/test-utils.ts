import { Page } from '@playwright/test';

/**
 * Wait for all images on the page to load
 */
export async function waitForImagesLoaded(page: Page) {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete && img.naturalHeight !== 0);
  });
}

/**
 * Wait for all animations to complete
 */
export async function waitForAnimations(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.getAnimations()).map(animation => animation.finished)
    );
  });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string) {
  return await page.evaluate((sel) => {
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
 * Mock API responses
 */
export async function mockApiResponse(
  page: Page,
  pattern: string | RegExp,
  response: {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
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
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Check accessibility of page or element
 */
export async function checkAccessibility(page: Page, selector?: string) {
  // Basic accessibility checks
  const violations: string[] = [];
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
  if (imagesWithoutAlt > 0) {
    violations.push(`${imagesWithoutAlt} images without alt text`);
  }
  
  // Check for form inputs without labels
  const inputsWithoutLabels = await page.$$eval(
    'input:not([type="hidden"]):not([type="submit"]):not([aria-label]):not([aria-labelledby])',
    inputs => inputs.filter(input => {
      // Type assertion for HTMLInputElement
      const inputEl = input as HTMLInputElement;
      return !inputEl.labels || inputEl.labels.length === 0;
    }).length
  );
  if (inputsWithoutLabels > 0) {
    violations.push(`${inputsWithoutLabels} form inputs without labels`);
  }
  
  // Check for buttons without accessible text
  const buttonsWithoutText = await page.$$eval(
    'button',
    buttons => buttons.filter(btn => 
      !btn.textContent?.trim() && 
      !btn.getAttribute('aria-label') &&
      !btn.getAttribute('aria-labelledby')
    ).length
  );
  if (buttonsWithoutText > 0) {
    violations.push(`${buttonsWithoutText} buttons without accessible text`);
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Take a full page screenshot with scroll
 */
export async function takeFullPageScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(page: Page) {
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
    
    return {
      domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
      load: navTiming.loadEventEnd - navTiming.fetchStart,
      firstPaint: performance
        .getEntriesByType('paint')
        .find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance
        .getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
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
) {
  const results = [];
  
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
) {
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
export async function waitForStore(page: Page, storeName: string) {
  await page.waitForFunction(
    (name) => (window as any).__zustand && (window as any).__zustand[name],
    storeName,
    { timeout: 5000 }
  );
}

/**
 * Get Zustand store state
 */
export async function getStoreState(page: Page, storeName: string) {
  return await page.evaluate((name) => {
    return (window as any).__zustand?.[name]?.getState();
  }, storeName);
}