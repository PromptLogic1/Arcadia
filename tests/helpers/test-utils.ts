/**
 * Enhanced test utilities with proper typing
 * 
 * This module provides comprehensive test utilities for infrastructure,
 * accessibility, performance, and network testing with full type safety.
 */

import type { Page, Locator, Route } from '@playwright/test';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  domContentLoaded: number;
  load: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

/**
 * Accessibility violation interface
 */
export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

/**
 * Accessibility check result
 */
export interface AccessibilityResult {
  passed: boolean;
  violations: AccessibilityViolation[];
  incomplete: AccessibilityViolation[];
  inapplicable: string[];
  passes: string[];
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = 30000,
  _idleTime = 500
): Promise<void> {
  return page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for all images to load
 */
export async function waitForImagesLoaded(
  page: Page,
  timeout = 30000
): Promise<void> {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete && img.naturalHeight !== 0);
  }, undefined, { timeout });
}

/**
 * Get performance metrics from the page
 */
export async function getPerformanceMetrics(
  page: Page
): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const metrics: PerformanceMetrics = {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      load: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
    };

    // Add paint metrics if available
    paint.forEach(entry => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });

    // Add Core Web Vitals if available
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.largestContentfulPaint = entry.startTime;
            } else if (entry.entryType === 'layout-shift' && !('hadRecentInput' in entry && entry.hadRecentInput)) {
              metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + (('value' in entry && typeof entry.value === 'number') ? entry.value : 0);
            } else if (entry.entryType === 'first-input' && 'processingStart' in entry && typeof entry.processingStart === 'number') {
              metrics.firstInputDelay = entry.processingStart - entry.startTime;
            }
          });
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift', 'first-input'] });
      } catch {
        // PerformanceObserver not supported
      }
    }

    return metrics;
  });
}

/**
 * Basic accessibility check using simple DOM queries
 */
export async function checkAccessibility(
  page: Page,
  _options?: {
    includeTags?: string[];
    excludeTags?: string[];
  }
): Promise<AccessibilityResult> {
  const violations: AccessibilityViolation[] = [];
  
  // Basic accessibility checks
  const checks = await page.evaluate(() => {
    const issues: AccessibilityViolation[] = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])'));
    imagesWithoutAlt.forEach((img, index) => {
      issues.push({
        id: 'image-alt',
        impact: 'serious',
        description: 'Images must have alternate text',
        help: 'Images must have alternate text',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
        nodes: [{
          html: img.outerHTML,
          target: [`img:nth-child(${index + 1})`]
        }]
      });
    });
    
    // Check for form controls without labels
    const inputsWithoutLabels = Array.from(document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])'));
    inputsWithoutLabels.forEach((input, index) => {
      const hasLabel = document.querySelector(`label[for="${(input as HTMLInputElement).id}"]`);
      if (!hasLabel && (input as HTMLInputElement).type !== 'hidden') {
        issues.push({
          id: 'label',
          impact: 'critical',
          description: 'Form elements must have labels',
          help: 'Form elements must have labels',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/label',
          nodes: [{
            html: input.outerHTML,
            target: [`input:nth-child(${index + 1})`]
          }]
        });
      }
    });
    
    // Check for heading order
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push({
          id: 'heading-order',
          impact: 'moderate',
          description: 'Heading levels should only increase by one',
          help: 'Heading levels should only increase by one',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/heading-order',
          nodes: [{
            html: heading.outerHTML,
            target: [`${heading.tagName.toLowerCase()}:nth-child(${index + 1})`]
          }]
        });
      }
      lastLevel = level;
    });
    
    // Check for color contrast (simplified check)
    // const elementsWithColor = Array.from(document.querySelectorAll('*')).filter(el => {
    //   const style = window.getComputedStyle(el);
    //   return style.color && style.backgroundColor && 
    //          style.color !== 'rgba(0, 0, 0, 0)' && 
    //          style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    // });
    
    return issues;
  });
  
  violations.push(...checks);
  
  return {
    passed: violations.length === 0,
    violations,
    incomplete: [],
    inapplicable: [],
    passes: violations.length === 0 ? ['basic-accessibility'] : []
  };
}

/**
 * Mock API response helper
 */
export async function mockApiResponse(
  page: Page,
  pattern: string | RegExp,
  response: {
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
    delay?: number;
  }
): Promise<void> {
  await page.route(pattern, async (route: Route) => {
    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }
    
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      headers: response.headers,
      body: JSON.stringify(response.body || {})
    });
  });
}

/**
 * Get element text safely
 */
export async function getElementText(
  locator: Locator,
  timeout = 5000
): Promise<string | null> {
  try {
    await locator.waitFor({ timeout });
    return await locator.textContent();
  } catch {
    return null;
  }
}

/**
 * Check if element exists
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout = 1000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for element to be stable (not moving)
 */
export async function waitForElementStable(
  locator: Locator,
  timeout = 5000
): Promise<void> {
  let lastBox = await locator.boundingBox();
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const currentBox = await locator.boundingBox();
    
    if (lastBox && currentBox &&
        lastBox.x === currentBox.x &&
        lastBox.y === currentBox.y &&
        lastBox.width === currentBox.width &&
        lastBox.height === currentBox.height) {
      return;
    }
    
    lastBox = currentBox;
  }
  
  throw new Error(`Element did not stabilize within ${timeout}ms`);
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(
  locator: Locator,
  options?: {
    behavior?: 'auto' | 'smooth';
    block?: 'start' | 'center' | 'end' | 'nearest';
    inline?: 'start' | 'center' | 'end' | 'nearest';
  }
): Promise<void> {
  await locator.evaluate((element, scrollOptions) => {
    element.scrollIntoView(scrollOptions);
  }, options || { behavior: 'smooth' as ScrollBehavior, block: 'center' as ScrollLogicalPosition });
}

/**
 * Take full page screenshot
 */
export async function takeFullPageScreenshot(
  page: Page,
  filename?: string
): Promise<Buffer> {
  return page.screenshot({
    fullPage: true,
    path: filename,
    type: 'png'
  });
}

/**
 * Get page console logs
 */
export async function getConsoleLogs(
  page: Page
): Promise<Array<{ type: string; text: string; timestamp: number }>> {
  const logs: Array<{ type: string; text: string; timestamp: number }> = [];
  
  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });
  
  return logs;
}

/**
 * Wait with exponential backoff
 */
export async function waitWithBackoff(
  condition: () => Promise<boolean>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<boolean> {
  const {
    maxAttempts = 10,
    initialDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2
  } = options;
  
  let attempt = 0;
  let delay = initialDelay;
  
  while (attempt < maxAttempts) {
    try {
      if (await condition()) {
        return true;
      }
    } catch {
      // Condition failed, continue retrying
    }
    
    attempt++;
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * backoffFactor, maxDelay);
  }
  
  return false;
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T = unknown>(
  text: string,
  fallback: T | null = null
): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Retry function with configurable options
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
  } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, exponentialBackoff = false } = options;
  
  let lastError: Error | undefined;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === attempts - 1) {
        throw lastError;
      }
      
      const waitTime = exponentialBackoff ? delay * Math.pow(2, i) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Retry failed after maximum attempts');
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
 * Fill form fields based on test data
 */
export async function fillForm(page: Page, data: Record<string, unknown>): Promise<void> {
  for (const [field, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    
    const selector = `[name="${field}"], [data-testid="${field}"], #${field}`;
    const element = page.locator(selector).first();
    
    if (await element.isVisible()) {
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const inputType = await element.getAttribute('type');
      
      if (tagName === 'select') {
        await element.selectOption(String(value));
      } else if (inputType === 'checkbox' || inputType === 'radio') {
        await element.setChecked(Boolean(value));
      } else {
        await element.fill(String(value));
      }
    }
  }
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(element: Locator): Promise<boolean> {
  return await element.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  });
}

/**
 * Get state from Zustand store
 */
export async function getStoreState(page: Page, storeName: string): Promise<unknown> {
  return await page.evaluate((name) => {
    const win = window as unknown as Record<string, unknown>;
    const store = win[name];
    if (store && typeof store === 'object' && 'getState' in store && typeof store.getState === 'function') {
      return store.getState();
    }
    return null;
  }, storeName);
}

/**
 * Wait for store state to match condition
 */
export async function waitForStore(
  page: Page, 
  storeName: string, 
  condition: (state: unknown) => boolean,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await getStoreState(page, storeName);
    if (condition(state)) {
      return;
    }
    await page.waitForTimeout(100);
  }
  
  throw new Error(`Store condition not met within ${timeout}ms`);
}

/**
 * Test responsive design helper - wrapper around Playwright test
 * This is a placeholder for type compatibility
 */
export async function testResponsive(
  _name: string,
  _fn: (args: { page: Page; viewport: ViewportConfig }) => Promise<void>
): Promise<void> {
  // This would be implemented as a custom test wrapper
  // For now, it's just for type compatibility
  // Test: Responsive validation
}

/**
 * Viewport configuration type
 */
export interface ViewportConfig {
  width: number;
  height: number;
  name: string;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  userAgent?: string;
}