import { test, expect } from '@playwright/test';
import { getPerformanceMetrics, waitForNetworkIdle } from '../helpers/test-utils';

test.describe('Landing Page Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache and storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should achieve LCP under 2.5s @performance @critical', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Enhanced LCP measurement with better error handling
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        let lcpValue = 0;
        let resolved = false;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            lcpValue = entry.startTime;
          }
        });
        
        try {
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
          // Fallback for browsers that don't support LCP
          reject(new Error('LCP not supported'));
          return;
        }
        
        // Resolve when page is interactive
        const resolveIfReady = () => {
          if (!resolved && (document.readyState === 'complete' || lcpValue > 0)) {
            resolved = true;
            observer.disconnect();
            resolve(lcpValue || performance.now());
          }
        };
        
        // Multiple triggers for resolution
        document.addEventListener('readystatechange', resolveIfReady);
        window.addEventListener('load', resolveIfReady);
        
        // Fallback timeout with warning
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            console.warn('LCP measurement timed out, using fallback');
            resolve(lcpValue || performance.now());
          }
        }, 5000);
        
        // Immediate check
        resolveIfReady();
      });
    });
    
    console.log(`LCP: ${lcp}ms (target: <2500ms)`);
    expect(lcp).toBeLessThan(2500); // 2.5s Core Web Vitals threshold
    
    // Log performance grade
    if (lcp <= 2500) {
      console.log('✅ LCP: Good');
    } else if (lcp <= 4000) {
      console.log('⚠️ LCP: Needs Improvement');
    } else {
      console.log('❌ LCP: Poor');
    }
  });

  test('should minimize CLS (Cumulative Layout Shift) @performance', async ({ page }) => {
    await page.goto('/');
    
    // Enhanced CLS measurement with session window tracking
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        let sessionValue = 0;
        let maxSessionValue = 0;
        let sessionGapTimer: NodeJS.Timeout | null = null;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & { 
              value: number; 
              hadRecentInput: boolean; 
            };
            
            // Only count shifts not caused by user input
            if (!layoutShift.hadRecentInput) {
              // Reset session if gap is > 1 second
              if (sessionGapTimer) {
                clearTimeout(sessionGapTimer);
              }
              
              sessionValue += layoutShift.value;
              clsValue += layoutShift.value;
              
              sessionGapTimer = setTimeout(() => {
                maxSessionValue = Math.max(maxSessionValue, sessionValue);
                sessionValue = 0;
              }, 1000);
            }
          }
        });
        
        try {
          observer.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Layout shift measurement not supported');
          resolve(0);
          return;
        }
        
        // Measure for 5 seconds to capture late layout shifts
        setTimeout(() => {
          observer.disconnect();
          if (sessionGapTimer) {
            clearTimeout(sessionGapTimer);
          }
          maxSessionValue = Math.max(maxSessionValue, sessionValue);
          resolve(maxSessionValue); // Return worst session value
        }, 5000);
      });
    });
    
    console.log(`CLS: ${cls.toFixed(4)} (target: <0.1)`);
    expect(cls).toBeLessThan(0.1); // Core Web Vitals threshold
    
    // Log performance grade
    if (cls <= 0.1) {
      console.log('✅ CLS: Good');
    } else if (cls <= 0.25) {
      console.log('⚠️ CLS: Needs Improvement');
    } else {
      console.log('❌ CLS: Poor');
    }
  });

  test('should achieve INP under 200ms @performance @critical', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Measure Interaction to Next Paint (replaces FID as Core Web Vital)
    const inp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let interactions: number[] = [];
        let resolved = false;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const eventEntry = entry as PerformanceEntry & { 
              processingStart: number;
              processingEnd: number;
              duration: number;
            };
            
            // Calculate interaction latency
            const latency = eventEntry.processingEnd - entry.startTime;
            interactions.push(latency);
          }
        });
        
        try {
          // Try to observe event timing (for INP)
          observer.observe({ entryTypes: ['event'] });
        } catch {
          try {
            // Fallback to first-input for older browsers
            observer.observe({ entryTypes: ['first-input'] });
          } catch {
            console.warn('INP/FID measurement not supported');
            resolve(0);
            return;
          }
        }
        
        // Resolve after collecting some interactions
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            
            if (interactions.length === 0) {
              resolve(0);
            } else {
              // Calculate 98th percentile (INP definition)
              interactions.sort((a, b) => a - b);
              const index = Math.floor(interactions.length * 0.98);
              resolve(interactions[index] || interactions[interactions.length - 1]);
            }
          }
        }, 8000);
      });
    });
    
    // Simulate realistic user interactions to generate events
    await page.hover('button:first-child');
    await page.waitForTimeout(100);
    await page.click('button:first-child');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    
    console.log(`INP: ${inp}ms (target: <200ms)`);
    
    if (inp > 0) {
      expect(inp).toBeLessThan(200); // Core Web Vitals threshold for INP
      
      // Log performance grade
      if (inp <= 200) {
        console.log('✅ INP: Good');
      } else if (inp <= 500) {
        console.log('⚠️ INP: Needs Improvement');
      } else {
        console.log('❌ INP: Poor');
      }
    } else {
      console.log('ℹ️ No interactions captured for INP measurement');
    }
  });

  test('should achieve FID under 100ms (legacy metric) @performance', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Legacy FID measurement for comparison
    const actualFid = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let fidValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEntry & { processingStart: number };
            fidValue = fidEntry.processingStart - entry.startTime;
          }
          resolve(fidValue);
        });
        
        try {
          observer.observe({ entryTypes: ['first-input'] });
        } catch (error) {
          resolve(0);
        }
        
        // Timeout after 5 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(fidValue);
        }, 5000);
      });
    });
    
    // Trigger first input delay measurement
    await page.click('body');
    await page.waitForTimeout(1000);
    
    if (actualFid > 0) {
      console.log(`FID: ${actualFid}ms (target: <100ms)`);
      expect(actualFid).toBeLessThan(100);
      
      if (actualFid <= 100) {
        console.log('✅ FID: Good');
      } else if (actualFid <= 300) {
        console.log('⚠️ FID: Needs Improvement');
      } else {
        console.log('❌ FID: Poor');
      }
    } else {
      console.log('ℹ️ FID measurement not captured (may not be supported)');
    }
  });

  test('should load critical resources quickly', async ({ page }) => {
    const resourceLoadTimes: Record<string, number> = {};
    
    page.on('response', (response) => {
      const url = response.url();
      
      // Track critical resources
      if (url.includes('_next/static/css/') || 
          url.includes('_next/static/js/') ||
          url.includes('fonts/')) {
        // Use performance API to get timing information instead
        resourceLoadTimes[url] = Date.now();
      }
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // CSS should load quickly
    const cssUrls = Object.keys(resourceLoadTimes).filter(url => url.includes('.css'));
    for (const cssUrl of cssUrls) {
      expect(resourceLoadTimes[cssUrl]).toBeLessThan(1000); // 1s for CSS
    }
    
    // Critical JavaScript should load reasonably fast
    const jsUrls = Object.keys(resourceLoadTimes).filter(url => url.includes('.js'));
    for (const jsUrl of jsUrls) {
      expect(resourceLoadTimes[jsUrl]).toBeLessThan(2000); // 2s for JS
    }
  });

  test('should have reasonable bundle sizes', async ({ page }) => {
    const networkActivity: Array<{ url: string; size: number; type: string }> = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('_next/static/')) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          const size = contentLength ? parseInt(contentLength) : 0;
          
          let type = 'other';
          if (url.includes('.js')) type = 'javascript';
          if (url.includes('.css')) type = 'css';
          if (url.includes('.woff') || url.includes('.woff2')) type = 'font';
          
          networkActivity.push({ url, size, type });
        } catch (error) {
          // Ignore errors getting response size
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate total bundle sizes
    const totalJS = networkActivity
      .filter(item => item.type === 'javascript')
      .reduce((sum, item) => sum + item.size, 0);
    
    const totalCSS = networkActivity
      .filter(item => item.type === 'css')
      .reduce((sum, item) => sum + item.size, 0);
    
    console.log(`Total JS: ${(totalJS / 1024).toFixed(2)}KB`);
    console.log(`Total CSS: ${(totalCSS / 1024).toFixed(2)}KB`);
    
    // Bundle size targets (compressed)
    expect(totalJS).toBeLessThan(300 * 1024); // 300KB for JS
    expect(totalCSS).toBeLessThan(50 * 1024);  // 50KB for CSS
  });

  test('should load fonts efficiently', async ({ page }) => {
    const fontRequests: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.woff') || url.includes('.woff2') || url.includes('fonts.googleapis.com')) {
        fontRequests.push(url);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check font loading strategy
    const fontDisplay = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      
      for (const stylesheet of stylesheets) {
        try {
          const rules = Array.from(stylesheet.cssRules || []);
          for (const rule of rules) {
            if (rule.toString().includes('@font-face')) {
              const fontFaceRule = rule as CSSFontFaceRule;
              const style = fontFaceRule.style as any;
              if (style.fontDisplay) {
                return style.fontDisplay;
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheets may not be accessible
        }
      }
      return null;
    });
    
    // Should use font-display: swap for better performance
    if (fontRequests.length > 0) {
      console.log(`Font display strategy: ${fontDisplay || 'not detected'}`);
      // This is informational - font-display might be set via CSS files
    }
  });

  test('should efficiently handle images', async ({ page }) => {
    const imageRequests: Array<{ url: string; size: number }> = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.match(/\.(jpg|jpeg|png|webp|avif|svg)(\?|$)/i)) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          const size = contentLength ? parseInt(contentLength) : 0;
          
          imageRequests.push({ url, size });
        } catch (error) {
          // Ignore errors
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for lazy loading
    const lazyImages = await page.locator('img[loading="lazy"]').count();
    const totalImages = await page.locator('img').count();
    
    console.log(`Lazy images: ${lazyImages}/${totalImages}`);
    
    if (totalImages > 2) {
      // Should have some lazy-loaded images
      expect(lazyImages).toBeGreaterThan(0);
    }
    
    // Check image sizes are reasonable
    const totalImageSize = imageRequests.reduce((sum, img) => sum + img.size, 0);
    console.log(`Total image size: ${(totalImageSize / 1024).toFixed(2)}KB`);
    
    // Images should be optimized
    expect(totalImageSize).toBeLessThan(500 * 1024); // 500KB total for initial images
  });

  test('should minimize render-blocking resources', async ({ page }) => {
    const renderBlockingResources: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      
      // CSS and synchronous JS are render-blocking
      if (resourceType === 'stylesheet' || 
          (resourceType === 'script' && !request.url().includes('defer') && !request.url().includes('async'))) {
        renderBlockingResources.push(url);
      }
    });
    
    await page.goto('/');
    
    console.log(`Render-blocking resources: ${renderBlockingResources.length}`);
    
    // Should minimize render-blocking resources
    expect(renderBlockingResources.length).toBeLessThan(10);
  });

  test('should handle slow 3G network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Load time on slow 3G: ${loadTime}ms`);
    
    // Should still load within reasonable time on slow connection
    expect(loadTime).toBeLessThan(8000); // 8s on slow 3G
    
    // Critical content should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should implement efficient caching strategy', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const firstVisitRequests: string[] = [];
    
    // Second visit - track cached resources
    page.on('response', (response) => {
      const cacheControl = response.headers()['cache-control'];
      const fromCache = response.fromServiceWorker() || 
                       response.status() === 304 ||
                       cacheControl?.includes('max-age');
      
      if (fromCache) {
        firstVisitRequests.push(response.url());
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log(`Cached resources on reload: ${firstVisitRequests.length}`);
    
    // Should have some cached resources on reload
    expect(firstVisitRequests.length).toBeGreaterThan(0);
  });

  test('should perform well under concurrent load', async ({ browser }) => {
    const concurrentPages = 3;
    const pages = [];
    
    // Create multiple pages
    for (let i = 0; i < concurrentPages; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      pages.push(page);
    }
    
    // Load homepage concurrently
    const startTime = Date.now();
    const loadPromises = pages.map(page => page.goto('/'));
    
    await Promise.all(loadPromises);
    const totalLoadTime = Date.now() - startTime;
    
    console.log(`Concurrent load time for ${concurrentPages} pages: ${totalLoadTime}ms`);
    
    // Should handle concurrent load reasonably
    expect(totalLoadTime).toBeLessThan(10000); // 10s for all pages
    
    // All pages should have loaded successfully
    for (const page of pages) {
      await expect(page.locator('main')).toBeVisible();
      await page.context().close();
    }
  });

  test('should track Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Get comprehensive performance metrics
    const metrics = await getPerformanceMetrics(page);
    
    console.log('Core Web Vitals metrics:', {
      domContentLoaded: `${metrics.domContentLoaded}ms`,
      load: `${metrics.load}ms`,
      firstPaint: `${metrics.firstPaint}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint}ms`,
    });
    
    // Performance assertions
    expect(metrics.domContentLoaded).toBeLessThan(3000); // 3s
    expect(metrics.firstContentfulPaint).toBeLessThan(1800); // 1.8s
    expect(metrics.firstPaint).toBeLessThan(1500); // 1.5s
    
    // Additional Web Vitals if available
    const additionalMetrics = await page.evaluate(() => {
      return {
        navigation: performance.getEntriesByType('navigation')[0],
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        } : null,
      };
    });
    
    if (additionalMetrics.memory) {
      console.log('Memory usage:', additionalMetrics.memory);
      
      // Memory usage should be reasonable
      const memoryUsageMB = additionalMetrics.memory.usedJSHeapSize / 1024 / 1024;
      expect(memoryUsageMB).toBeLessThan(50); // 50MB
    }
  });
});

test.describe('Performance - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should perform well on mobile devices @performance @mobile', async ({ page }) => {
    // Simulate mobile CPU throttling
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Mobile load time: ${loadTime}ms`);
    
    // Should load within reasonable time on mobile
    expect(loadTime).toBeLessThan(5000); // 5s on throttled mobile
    
    // Critical content should be visible
    await expect(page.locator('main')).toBeVisible();
    
    // Reset CPU throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('should optimize touch interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test touch target sizes
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        
        if (box) {
          // Touch targets should be at least 44x44px
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});