import { test, expect } from '@playwright/test';

test.describe('Playwright Setup Verification', () => {
  test('local development server is running', async ({ page }) => {
    // This test verifies that the Next.js dev server starts correctly
    await page.goto('/');

    // Check that we get a valid response
    const response = await page.evaluate(() => {
      return {
        readyState: document.readyState,
        title: document.title,
        hasBody: !!document.body,
      };
    });

    expect(response.readyState).toBe('complete');
    expect(response.hasBody).toBe(true);
    expect(response.title).toBeTruthy();
  });

  test('Playwright is configured correctly', async ({ page, browserName }) => {
    // This test verifies basic Playwright configuration
    await page.goto('/');

    // Check viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(1280);
    expect(viewportSize?.height).toBe(720);

    // Check browser name
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);

    // Check base URL is working
    expect(page.url()).toMatch(/http:\/\/localhost:\d+\//);
  });
});
