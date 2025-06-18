/**
 * Enhanced performance tests with type safety and comprehensive metrics
 */

import { test, expect } from '@playwright/test';
import { 
  collectPerformanceMetrics, 
  analyzeBundles, 
  checkPerformanceBudgets,
  simulateNetworkCondition,
  resetNetworkCondition,
  NETWORK_CONDITIONS,
  PERFORMANCE_BUDGETS,
  measureTimeToInteractive,
  getResourceTimingBreakdown
} from './fixtures/performance';

test.describe('Enhanced Performance Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache and storage safely
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        // Storage access may be restricted in some contexts
        console.warn('Storage clear failed:', error);
      }
    });
  });

  test('should meet all performance budgets (2024 Core Web Vitals) @critical @performance', async ({ page }) => {
    await page.goto('/');
    
    // Collect comprehensive metrics
    const metrics = await collectPerformanceMetrics(page);
    
    // Check against budgets
    const homepageBudgets = PERFORMANCE_BUDGETS.homepage;
    if (!homepageBudgets) {
      throw new Error('Homepage performance budgets not found');
    }
    const budgetResults = checkPerformanceBudgets(metrics, homepageBudgets);
    
    // Log all metrics for monitoring (2024 standards)
    console.log('Performance Metrics (2024 Standards):', {
      LCP: `${metrics.largestContentfulPaint}ms`,
      INP: `${metrics.interactionToNextPaint}ms`, // 2024 Core Web Vital
      FID: `${metrics.firstInputDelay}ms (legacy)`,
      CLS: metrics.cumulativeLayoutShift.toFixed(3),
      FCP: `${metrics.firstContentfulPaint}ms`,
      TTI: `${metrics.timeToInteractive}ms`,
      TBT: `${metrics.totalBlockingTime}ms`,
      'Total Size': `${(metrics.totalSize / 1024).toFixed(2)}KB`,
      'JS Heap': `${(metrics.jsHeapUsed / 1024 / 1024).toFixed(2)}MB`,
      'Performance Grade': metrics.performanceGrade,
    });
    
    // Color-coded performance grading
    const gradeColor = metrics.performanceGrade === 'Good' ? '🟢' : 
                     metrics.performanceGrade === 'Needs Improvement' ? '🟡' : '🔴';
    console.log(`${gradeColor} Overall Performance Grade: ${metrics.performanceGrade}`);
    
    // Assert all budgets pass
    const violations = budgetResults.filter(result => !result.passed);
    if (violations.length > 0) {
      console.error('\n❌ Performance Budget Violations:');
      violations.forEach(violation => {
        const severity = violation.budget.severity === 'error' ? '🔴' : '🟡';
        console.error(
          `${severity} ${violation.budget.metric}: ` +
          `${violation.actual} > ${violation.budget.budget} ${violation.budget.unit}`
        );
      });
    }
    
    expect(violations).toHaveLength(0);
    
    // 2024 Core Web Vitals assertions
    expect(metrics.largestContentfulPaint).toBeLessThan(2500); // Good LCP
    expect(metrics.interactionToNextPaint).toBeLessThan(200); // Good INP (2024 standard)
    expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1); // Good CLS
    
    // Performance grade should be at least "Needs Improvement"
    expect(['Good', 'Needs Improvement']).toContain(metrics.performanceGrade);
  });

  test('should analyze bundle sizes and composition', async ({ page }) => {
    await page.goto('/');
    
    const bundleMetrics = await analyzeBundles(page);
    
    console.log('Bundle Analysis:', {
      'Main Bundle': `${(bundleMetrics.mainBundle / 1024).toFixed(2)}KB`,
      'Vendor Bundle': `${(bundleMetrics.vendorBundle / 1024).toFixed(2)}KB`,
      'CSS Bundle': `${(bundleMetrics.cssBundle / 1024).toFixed(2)}KB`,
      'Total Size': `${(bundleMetrics.totalSize / 1024).toFixed(2)}KB`,
      'Estimated Gzip': `${(bundleMetrics.gzipSize / 1024).toFixed(2)}KB`,
      'Chunk Count': bundleMetrics.chunks.length,
    });
    
    // Log largest chunks
    const largestChunks = bundleMetrics.chunks
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
    
    console.log('Largest chunks:');
    largestChunks.forEach(chunk => {
      console.log(`  - ${chunk.name}: ${(chunk.size / 1024).toFixed(2)}KB`);
    });
    
    // Assert bundle size constraints
    expect(bundleMetrics.mainBundle).toBeLessThan(200 * 1024); // 200KB
    expect(bundleMetrics.vendorBundle).toBeLessThan(150 * 1024); // 150KB
    expect(bundleMetrics.totalSize).toBeLessThan(400 * 1024); // 400KB total
  });

  test('should perform well on slow network conditions', async ({ page }) => {
    // Test different network conditions
    const networkTests = [
      { condition: NETWORK_CONDITIONS['Slow 3G'], maxLoadTime: 8000 },
      { condition: NETWORK_CONDITIONS['Fast 3G'], maxLoadTime: 5000 },
      { condition: NETWORK_CONDITIONS['4G'], maxLoadTime: 3000 },
    ];
    
    for (const { condition, maxLoadTime } of networkTests) {
      if (!condition) {
        throw new Error('Network condition is undefined');
      }
      console.log(`\nTesting ${condition.name} network:`);
      
      // Apply network condition
      await simulateNetworkCondition(page, condition);
      
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      console.log(`  Load time: ${loadTime}ms (max: ${maxLoadTime}ms)`);
      
      // Collect metrics under network constraint
      const metrics = await collectPerformanceMetrics(page);
      console.log(`  FCP: ${metrics.firstContentfulPaint}ms`);
      console.log(`  LCP: ${metrics.largestContentfulPaint}ms`);
      
      // Assert performance under network constraint
      expect(loadTime).toBeLessThan(maxLoadTime);
      expect(metrics.firstContentfulPaint).toBeLessThan(maxLoadTime * 0.5);
      
      // Reset network condition
      await resetNetworkCondition(page);
    }
  });

  test('should optimize resource loading', async ({ page }) => {
    await page.goto('/');
    
    const resourceBreakdown = await getResourceTimingBreakdown(page);
    
    console.log('Resource Loading Breakdown:');
    Object.entries(resourceBreakdown).forEach(([type, data]) => {
      console.log(`  ${type}:`);
      console.log(`    Count: ${data.count}`);
      console.log(`    Total Size: ${(data.totalSize / 1024).toFixed(2)}KB`);
      console.log(`    Avg Duration: ${(data.totalDuration / data.count).toFixed(2)}ms`);
    });
    
    // Check resource optimization
    expect(resourceBreakdown.scripts.count).toBeLessThan(20); // Limit script files
    expect(resourceBreakdown.stylesheets.count).toBeLessThan(10); // Limit CSS files
    
    // Images should be optimized
    if (resourceBreakdown.images.count > 0) {
      const avgImageSize = resourceBreakdown.images.totalSize / resourceBreakdown.images.count;
      expect(avgImageSize).toBeLessThan(100 * 1024); // 100KB average
    }
  });

  test('should measure accurate Time to Interactive', async ({ page }) => {
    await page.goto('/');
    
    const tti = await measureTimeToInteractive(page);
    console.log(`Time to Interactive: ${tti}ms`);
    
    // Also measure using performance metrics
    const metrics = await collectPerformanceMetrics(page);
    
    // TTI should be reasonable
    expect(tti).toBeLessThan(3800); // 3.8s target
    expect(metrics.totalBlockingTime).toBeLessThan(300); // 300ms TBT target
  });

  test('should handle concurrent user load efficiently', async ({ browser }) => {
    const concurrentUsers = 5;
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts (simulating different users)
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    // Load homepage concurrently
    // Debug: Testing with ${concurrentUsers} concurrent users...
    const startTime = Date.now();
    
    const loadPromises = pages.map(async (page, index) => {
      const pageStartTime = Date.now();
      await page.goto('/');
      const pageLoadTime = Date.now() - pageStartTime;
      
      const metrics = await collectPerformanceMetrics(page);
      
      return {
        userIndex: index,
        loadTime: pageLoadTime,
        metrics,
      };
    });
    
    const results = await Promise.all(loadPromises);
    const totalTime = Date.now() - startTime;
    
    console.log(`\nConcurrent Load Test Results:`);
    console.log(`Total time for ${concurrentUsers} users: ${totalTime}ms`);
    
    results.forEach(result => {
      console.log(`User ${result.userIndex + 1}:`);
      // Performance:   Load time = result.loadTimems
      console.log(`  LCP: ${result.metrics.largestContentfulPaint}ms`);
      console.log(`  FCP: ${result.metrics.firstContentfulPaint}ms`);
    });
    
    // Calculate statistics
    const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
    const maxLoadTime = Math.max(...results.map(r => r.loadTime));
    
    console.log(`\nStatistics:`);
    // Performance:   Average load time = avgLoadTimems
    // Performance:   Max load time = maxLoadTimems
    
    // Assert reasonable performance under load
    expect(avgLoadTime).toBeLessThan(5000); // 5s average
    expect(maxLoadTime).toBeLessThan(8000); // 8s max
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should implement effective caching strategy', async ({ page }) => {
    // First visit - cold cache
    console.log('First visit (cold cache):');
    await page.goto('/');
    const coldMetrics = await collectPerformanceMetrics(page);
    console.log(`  Total requests: ${coldMetrics.totalRequests}`);
    console.log(`  Total size: ${(coldMetrics.totalSize / 1024).toFixed(2)}KB`);
    
    // Second visit - warm cache
    console.log('\nSecond visit (warm cache):');
    await page.reload();
    const warmMetrics = await collectPerformanceMetrics(page);
    console.log(`  Total requests: ${warmMetrics.totalRequests}`);
    console.log(`  Cached requests: ${warmMetrics.cachedRequests}`);
    console.log(`  Total size: ${(warmMetrics.totalSize / 1024).toFixed(2)}KB`);
    
    // Calculate cache effectiveness
    const cacheRatio = warmMetrics.cachedRequests / warmMetrics.totalRequests;
    console.log(`  Cache hit ratio: ${(cacheRatio * 100).toFixed(2)}%`);
    
    // Assert caching is effective
    expect(warmMetrics.cachedRequests).toBeGreaterThan(0);
    expect(cacheRatio).toBeGreaterThan(0.3); // At least 30% cache hit rate
    expect(warmMetrics.totalSize).toBeLessThan(coldMetrics.totalSize * 0.7); // 30% reduction
  });

  test('should optimize critical rendering path', async ({ page }) => {
    const criticalResources: string[] = [];
    
    // Track critical resources
    page.on('response', response => {
      const url = response.url();
      const timing = (response as unknown as { timing?: () => { responseEnd?: number } }).timing?.();
      
      if (timing && typeof timing.responseEnd === 'number' && timing.responseEnd < 1000) { // Resources loaded within 1s
        if (url.includes('.css') || url.includes('.js') || url.includes('font')) {
          criticalResources.push(url);
        }
      }
    });
    
    await page.goto('/');
    const metrics = await collectPerformanceMetrics(page);
    
    console.log('Critical Rendering Path Analysis:');
    console.log(`  First Paint: ${metrics.firstPaint}ms`);
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  Critical resources: ${criticalResources.length}`);
    
    // Critical metrics should be fast
    expect(metrics.firstPaint).toBeLessThan(1000); // 1s
    expect(metrics.firstContentfulPaint).toBeLessThan(1800); // 1.8s
    expect(criticalResources.length).toBeLessThan(10); // Limited critical resources
  });

  test('should maintain performance with real user interactions and measure INP @performance @inp', async ({ page }) => {
    await page.goto('/');
    
    // Initial metrics
    const initialMetrics = await collectPerformanceMetrics(page);
    
    // Set up INP measurement
    await page.evaluate(() => {
      (window as Window).inpMeasurements = [];
      
      // Enhanced INP measurement
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              const eventEntry = entry as PerformanceEntry & { 
                interactionId?: number;
                processingStart?: number;
                processingEnd?: number;
              };
              if (eventEntry.interactionId) {
                const inp = (eventEntry.processingStart || 0) - eventEntry.startTime;
                (window as Window).inpMeasurements!.push({
                  inp: inp,
                  target: entry.name,
                  timestamp: eventEntry.startTime
                });
              }
            });
          });
          
          observer.observe({ entryTypes: ['event'] });
        } catch (error) {
          console.warn('INP measurement setup failed:', error);
        }
      }
    });
    
    // Simulate user interactions with INP measurement
    const interactions = [
      {
        name: 'scroll',
        action: async () => {
          await page.evaluate(() => window.scrollTo(0, 500));
          await page.waitForTimeout(100);
        }
      },
      {
        name: 'button_click',
        action: async () => {
          const button = page.locator('button').first();
          if (await button.count() > 0) {
            await button.click();
            await page.waitForTimeout(200);
          }
        }
      },
      {
        name: 'hover',
        action: async () => {
          const link = page.locator('a').first();
          if (await link.count() > 0) {
            await link.hover();
            await page.waitForTimeout(100);
          }
        }
      },
      {
        name: 'input_interaction',
        action: async () => {
          const input = page.locator('input').first();
          if (await input.count() > 0) {
            await input.click();
            await input.fill('test input');
            await page.waitForTimeout(200);
          }
        }
      },
    ];
    
    // Perform interactions and measure INP
    for (const { name, action } of interactions) {
      console.log(`Performing interaction: ${name}`);
      await action();
    }
    
    // Wait for interactions to be processed
    await page.waitForTimeout(1000);
    
    // Get INP measurements
    const inpData = await page.evaluate(() => (window as Window).inpMeasurements || []);
    
    console.log('\n🖱️ Interaction to Next Paint (INP) Analysis:');
    console.log(`Total interactions measured: ${inpData.length}`);
    
    if (inpData.length > 0) {
      const inpValues = inpData.map((m: { inp: number }) => m.inp);
      const maxINP = Math.max(...inpValues);
      const avgINP = inpValues.reduce((sum: number, val: number) => sum + val, 0) / inpValues.length;
      
      console.log(`Max INP: ${maxINP.toFixed(2)}ms`);
      console.log(`Average INP: ${avgINP.toFixed(2)}ms`);
      
      // Log individual interactions
      inpData.forEach((measurement: { target: string; inp: number }, index: number) => {
        console.log(`  ${index + 1}. ${measurement.target}: ${measurement.inp.toFixed(2)}ms`);
      });
      
      // INP assertions (2024 Core Web Vital)
      expect(maxINP).toBeLessThan(500); // Poor threshold
      expect(avgINP).toBeLessThan(200); // Good threshold for average
      
      // Count interactions with good INP
      const goodINP = inpValues.filter((inp: number) => inp < 200).length;
      const goodINPRatio = goodINP / inpValues.length;
      
      console.log(`Good INP ratio: ${(goodINPRatio * 100).toFixed(1)}%`);
      expect(goodINPRatio).toBeGreaterThan(0.75); // 75% of interactions should have good INP
    }
    
    // Measure performance after interactions
    const afterMetrics = await collectPerformanceMetrics(page);
    
    console.log('\n📊 Performance impact of interactions:');
    console.log(`  Memory before: ${(initialMetrics.jsHeapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory after: ${(afterMetrics.jsHeapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory increase: ${((afterMetrics.jsHeapUsed - initialMetrics.jsHeapUsed) / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  INP (collected): ${afterMetrics.interactionToNextPaint}ms`);
    
    // Memory should not increase significantly
    const memoryIncrease = afterMetrics.jsHeapUsed - initialMetrics.jsHeapUsed;
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    
    // INP should be within acceptable limits
    expect(afterMetrics.interactionToNextPaint).toBeLessThan(500); // Poor threshold
  });
});