import { test, expect } from '@playwright/test';

/**
 * Infrastructure smoke tests
 * These tests verify that the basic infrastructure is working
 * Created by Infrastructure Foundation Agent
 */

test.describe('Infrastructure Health', () => {
  test('application should be accessible', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Arcadia/);
    
    // Verify basic page structure
    await expect(page.locator('body')).toBeVisible();
  });

  test('health endpoints should respond', async ({ page, request }) => {
    // Test liveness probe
    const liveResponse = await request.get('/api/health/live');
    expect(liveResponse.ok()).toBeTruthy();
    
    const liveData = await liveResponse.json();
    expect(liveData.alive).toBe(true);
    expect(liveData.timestamp).toBeDefined();
    
    // Test readiness probe
    const readyResponse = await request.get('/api/health/ready');
    // Note: readiness might be 503 if dependencies aren't ready, but should respond
    expect([200, 503]).toContain(readyResponse.status());
    
    const readyData = await readyResponse.json();
    expect(readyData.ready).toBeDefined();
    expect(readyData.dependencies).toBeDefined();
  });

  test('environment variables should be loaded', async ({ page }) => {
    // Navigate to a page that would fail if env vars are missing
    await page.goto('/');
    
    // Check for Supabase configuration in console
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Wait a bit for any initialization console logs
    await page.waitForTimeout(2000);
    
    // Should not see errors about missing environment variables
    const envErrors = logs.filter(log => 
      log.includes('SUPABASE_URL') || 
      log.includes('missing') ||
      log.includes('undefined')
    );
    
    expect(envErrors.length).toBe(0);
  });
  
  test('basic navigation should work', async ({ page }) => {
    await page.goto('/');
    
    // Check that JavaScript is working (interactive elements)
    // Look for any buttons or interactive elements
    const interactiveElements = page.locator('button, [role="button"], a[href]');
    const count = await interactiveElements.count();
    
    // Should have at least some interactive elements
    expect(count).toBeGreaterThan(0);
  });
});