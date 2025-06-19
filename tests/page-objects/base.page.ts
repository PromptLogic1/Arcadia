/**
 * Base Page Object
 *
 * This class provides common functionality for all page objects.
 * Follows the Page Object Model pattern for better test organization.
 */

import type { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a locator with timeout and visibility options
   */
  protected getLocator(
    selector: string,
    options?: {
      hasText?: string;
      nth?: number;
    }
  ): Locator {
    let locator = this.page.locator(selector);

    if (options?.hasText) {
      locator = locator.filter({ hasText: options.hasText });
    }

    if (options?.nth !== undefined) {
      locator = locator.nth(options.nth);
    }

    return locator;
  }

  /**
   * Click an element with proper error handling
   */
  public async clickElement(
    selector: string,
    options?: {
      force?: boolean;
      timeout?: number;
    }
  ): Promise<void> {
    const element = this.getLocator(selector);
    await element.click({
      force: options?.force,
      timeout: options?.timeout ?? 30000,
    });
  }

  /**
   * Fill an input field
   */
  public async fillInput(selector: string, value: string): Promise<void> {
    const input = this.getLocator(selector);
    await input.fill(value);
  }

  /**
   * Check if element is visible
   */
  public async isElementVisible(
    selector: string,
    timeout = 5000
  ): Promise<boolean> {
    try {
      await this.getLocator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content from an element
   */
  public async getElementText(selector: string): Promise<string | null> {
    const element = this.getLocator(selector);
    return element.textContent();
  }

  /**
   * Wait for navigation
   */
  public async waitForNavigation(urlPattern?: RegExp | string): Promise<void> {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `tests/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Get current URL
   */
  get url(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
