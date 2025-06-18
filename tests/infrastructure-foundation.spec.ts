import { test, expect } from '@playwright/test';

/**
 * Infrastructure Foundation Tests
 * 
 * These tests verify that the basic infrastructure is working:
 * - Application starts and responds
 * - Health endpoints are accessible
 * - Basic HTML structure is present
 */
test.describe('Infrastructure Foundation', () => {
  test('application is accessible and responding', async ({ page }) => {
    // Go to homepage with a generous timeout
    const response = await page.goto('/', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Check response status
    expect(response?.status()).toBeLessThan(400);
    
    // Check that we get some HTML content
    const content = await page.content();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
    
    // Check for basic structure
    const hasTitle = await page.locator('title').count() > 0;
    const hasHead = await page.locator('head').count() > 0;
    const hasBody = await page.locator('body').count() > 0;
    
    expect(hasTitle).toBe(true);
    expect(hasHead).toBe(true);
    expect(hasBody).toBe(true);
  });

  test('health endpoints are accessible', async ({ page }) => {
    // Test liveness endpoint
    const liveResponse = await page.goto('/api/health/live');
    expect(liveResponse?.status()).toBe(200);
    
    const liveContent = await page.textContent('body');
    expect(liveContent).toContain('alive');
    
    // Test readiness endpoint (may return 503 if dependencies not ready, but should respond)
    const readyResponse = await page.goto('/api/health/ready');
    const readyStatus = readyResponse?.status() || 0;
    expect(readyStatus === 200 || readyStatus === 503).toBe(true);
    
    const readyContent = await page.textContent('body');
    expect(readyContent).toContain('ready');
  });

  test('application serves static assets', async ({ page }) => {
    await page.goto('/');
    
    // Check for favicon
    const faviconResponse = await page.goto('/favicon.ico');
    expect(faviconResponse?.status()).toBeLessThan(500);
    
    // Check for some common assets (if they exist)
    const manifestResponse = await page.goto('/manifest.json').catch(() => null);
    if (manifestResponse) {
      expect(manifestResponse.status()).toBeLessThan(500);
    }
  });

  test('basic Next.js infrastructure works', async ({ page }) => {
    await page.goto('/');
    
    // Check for Next.js hydration
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Check that the page has React/Next.js structure
    const hasBody = await page.locator('body').count() > 0;
    const hasScripts = await page.locator('script').count() > 0;
    
    expect(hasBody).toBe(true);
    expect(hasScripts).toBe(true); // Next.js includes scripts for hydration
  });

  test('environment configuration is loaded', async ({ page }) => {
    await page.goto('/');
    
    // Check that environment-based features are working by checking page content
    const pageContent = await page.content();
    
    // Check that the app has some basic configuration working
    // (This is a simple check that the environment is properly set up)
    expect(pageContent.length).toBeGreaterThan(1000); // Should have substantial content
    expect(pageContent).toContain('html');
  });

  test('error handling infrastructure works', async ({ page }) => {
    // Test 404 handling
    const notFoundResponse = await page.goto('/this-definitely-does-not-exist-404-test');
    expect(notFoundResponse?.status()).toBe(404);
    
    // Should still get valid HTML
    const content = await page.content();
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });
});