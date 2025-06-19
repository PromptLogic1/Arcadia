import type { Page, BrowserContext, Route } from '@playwright/test';
import type {
  TestWindow,
  AuthErrorResponse,
  LoginResponse,
  SignupResponse,
  TestAuthState,
  A11yViolation,
  EmailVerificationResponse,
  ResendVerificationResponse,
} from '../types/test-types';

/**
 * Check if window has XSS test property (typed)
 */
export async function checkXSSExecution(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const testWindow = window as TestWindow;
    return testWindow.xssTest === true;
  });
}

/**
 * Get Zustand auth store state with proper typing
 */
export async function getAuthStoreState(
  page: Page
): Promise<TestAuthState | null> {
  return await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const authStore = testWindow.__zustand?.['auth-store'];

    if (!authStore) return null;

    const state = authStore.getState();
    return state as TestAuthState;
  });
}

/**
 * Wait for auth store to be initialized
 */
export async function waitForAuthStore(
  page: Page,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const testWindow = window as TestWindow;
      return testWindow.__zustand?.['auth-store'] !== undefined;
    },
    { timeout }
  );
}

/**
 * Mock typed auth API responses
 */
export async function mockAuthResponse<
  T extends
    | LoginResponse
    | SignupResponse
    | AuthErrorResponse
    | EmailVerificationResponse
    | ResendVerificationResponse,
>(
  page: Page,
  pattern: string | RegExp,
  response: {
    status: number;
    body: T;
    headers?: Record<string, string>;
  }
): Promise<void> {
  await page.route(pattern, async (route: Route) => {
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      headers: response.headers,
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Get auth-related cookies with proper typing
 */
export async function getAuthCookies(context: BrowserContext): Promise<{
  sessionCookie?: {
    name: string;
    value: string;
    expires?: number;
  };
  refreshCookie?: {
    name: string;
    value: string;
    expires?: number;
  };
}> {
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(
    c =>
      c.name.includes('auth') ||
      c.name.includes('session') ||
      c.name.includes('sb-')
  );

  const refreshCookie = cookies.find(
    c => c.name.includes('refresh') || c.name.includes('sb-refresh')
  );

  return {
    sessionCookie: sessionCookie
      ? {
          name: sessionCookie.name,
          value: sessionCookie.value,
          expires: sessionCookie.expires,
        }
      : undefined,
    refreshCookie: refreshCookie
      ? {
          name: refreshCookie.name,
          value: refreshCookie.value,
          expires: refreshCookie.expires,
        }
      : undefined,
  };
}

/**
 * Clear all auth-related storage
 */
export async function clearAuthStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear localStorage auth keys
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (
        key.includes('auth') ||
        key.includes('user') ||
        key.includes('session') ||
        key.includes('supabase')
      ) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage auth keys
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (
        key.includes('auth') ||
        key.includes('user') ||
        key.includes('session') ||
        key.includes('supabase')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  });
}

/**
 * Get performance metrics for auth operations
 */
export async function measureAuthPerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  await operation();
  return Date.now() - startTime;
}

/**
 * Check form validation errors with proper typing
 */
export async function getFormValidationErrors(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const errorElements = document.querySelectorAll(
      '[role="alert"], .error-message, [data-testid="error"]'
    );
    const errors: string[] = [];

    errorElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text) errors.push(text);
    });

    return errors;
  });
}

/**
 * Fill auth form with proper data attributes
 */
export async function fillAuthForm(
  page: Page,
  formData: Record<string, string | boolean>
): Promise<void> {
  for (const [field, value] of Object.entries(formData)) {
    // Try multiple selector strategies based on common patterns
    const selectors = [
      `[data-testid="auth-${field}-input"]`, // Auth form specific data-testid
      `[data-testid="${field}"]`,
      `[name="${field}"]`,
      `[id="${field}"]`,
      `[id="field-${field}"]`, // Generated ID pattern
      `[id="field-${field
        .toLowerCase()
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()}"]`, // camelCase to kebab-case
      `label:has-text("${field.charAt(0).toUpperCase() + field.slice(1)}")`,
    ];

    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        if (typeof value === 'boolean') {
          const isChecked = await element.isChecked();
          if (isChecked !== value) {
            await element.click();
          }
        } else {
          await element.fill(value);
        }
        break;
      }
    }
  }
}

/**
 * Enhanced accessibility check with proper typing
 */
export async function checkAuthAccessibility(
  page: Page,
  selector?: string
): Promise<{
  passed: boolean;
  violations: A11yViolation[];
}> {
  const violations: A11yViolation[] = [];

  // Check for missing alt text
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
      'input:not([type="hidden"]):not([type="submit"])'
    );
    let count = 0;

    inputs.forEach(input => {
      const hasLabel =
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby') ||
        (input.id && root.querySelector(`label[for="${input.id}"]`));
      if (!hasLabel) count++;
    });

    return count;
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

  // Check for color contrast (simplified check)
  const lowContrastElements = await page.evaluate((sel?: string) => {
    const root = sel ? document.querySelector(sel) : document;
    if (!root) return 0;

    // This is a simplified check - real contrast checking is more complex
    const elements = root.querySelectorAll('*');
    let count = 0;

    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const bgColor = styles.backgroundColor;

      // Very basic check - just ensure text isn't same color as background
      if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
        count++;
      }
    });

    return count;
  }, selector);

  if (lowContrastElements > 0) {
    violations.push({
      id: 'color-contrast',
      impact: 'serious',
      description: `${lowContrastElements} elements with potential contrast issues`,
      help: 'Elements must have sufficient color contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
      nodes: [],
    });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Wait for auth redirect with proper typing
 */
export async function waitForAuthRedirect(
  page: Page,
  expectedUrlPattern: RegExp | string,
  options?: { timeout?: number }
): Promise<boolean> {
  try {
    await page.waitForURL(expectedUrlPattern, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get auth error message from page
 */
export async function getAuthErrorMessage(page: Page): Promise<string | null> {
  const errorSelectors = [
    '[role="alert"]',
    '[data-testid="auth-error"]',
    '.error-message',
    '.auth-error',
  ];

  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible()) {
      return await element.textContent();
    }
  }

  return null;
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout = 5000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get performance metrics from page
 */
export async function getPerformanceMetrics(page: Page): Promise<{
  firstContentfulPaint: number;
  domContentLoaded: number;
  loadComplete: number;
}> {
  return await page.evaluate(() => {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const fcp = paint.find(
          entry => entry.name === 'first-contentful-paint'
        );

        resolve({
          firstContentfulPaint: fcp ? fcp.startTime : 0,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        });
      } else {
        window.addEventListener('load', () => {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');

          const fcp = paint.find(
            entry => entry.name === 'first-contentful-paint'
          );

          resolve({
            firstContentfulPaint: fcp ? fcp.startTime : 0,
            domContentLoaded:
              navigation.domContentLoadedEventEnd - navigation.fetchStart,
            loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          });
        });
      }
    });
  });
}
