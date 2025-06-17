/**
 * Advanced Performance Monitoring & Core Web Vitals Tests
 * 
 * This test suite validates comprehensive performance monitoring,
 * Core Web Vitals tracking, memory leak detection, and performance
 * degradation scenarios under various conditions.
 */

import { test, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import type { PerformanceError } from './types/errors';
import { generatePerformanceError } from './utils/error-generators';
import { ChaosEngine } from './utils/chaos-engine';

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcp: number;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing: {
    navigationStart: number;
    loadEventEnd: number;
    domContentLoadedEventEnd: number;
  };
}

test.describe('Performance Monitoring Infrastructure', () => {
  test.describe('Core Web Vitals Validation', () => {
    test('should meet all Core Web Vitals thresholds', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Measure Core Web Vitals with comprehensive error handling
      const metrics = await page.evaluate(() => {
        return new Promise<PerformanceMetrics>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Performance measurement timeout'));
          }, 30000);
          
          const metrics: Partial<PerformanceMetrics> = {
            lcp: 0,
            fid: 0,
            cls: 0,
            ttfb: 0,
            fcp: 0,
            timing: {
              navigationStart: 0,
              loadEventEnd: 0,
              domContentLoadedEventEnd: 0,
            },
          };
          
          let collectedMetrics = 0;
          const expectedMetrics = 3; // LCP, FID, CLS
          
          const tryResolve = () => {
            collectedMetrics++;
            if (collectedMetrics >= expectedMetrics) {
              clearTimeout(timeout);
              resolve(metrics as PerformanceMetrics);
            }
          };
          
          // Largest Contentful Paint
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              metrics.lcp = lastEntry.startTime;
              tryResolve();
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries() as PerformanceEventTiming[];
            entries.forEach(entry => {
              metrics.fid = entry.processingStart - entry.startTime;
            });
            tryResolve();
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries() as LayoutShift[];
            entries.forEach(entry => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            metrics.cls = clsValue;
            tryResolve();
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // Navigation Timing
          const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navEntries.length > 0) {
            const navEntry = navEntries[0];
            metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            metrics.timing = {
              navigationStart: navEntry.navigationStart,
              loadEventEnd: navEntry.loadEventEnd,
              domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd,
            };
          }
          
          // First Contentful Paint
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime;
          }
          
          // Memory usage (if available)
          if ('memory' in performance) {
            metrics.memory = {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            };
          }
          
          // Trigger some user interactions for FID
          setTimeout(() => {
            const button = document.createElement('button');
            button.onclick = () => console.log('clicked');
            document.body.appendChild(button);
            button.click();
            button.remove();
          }, 100);
        });
      });
      
      // Validate Core Web Vitals thresholds
      expect(metrics.lcp).toBeLessThan(2500); // Good LCP < 2.5s
      expect(metrics.fid).toBeLessThan(100); // Good FID < 100ms
      expect(metrics.cls).toBeLessThan(0.1); // Good CLS < 0.1
      expect(metrics.ttfb).toBeLessThan(800); // Good TTFB < 800ms
      expect(metrics.fcp).toBeLessThan(1800); // Good FCP < 1.8s
      
      // Log metrics for analysis
      console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
    });

    test('should maintain performance under stress conditions', async ({ page, context }) => {
      const chaos = new ChaosEngine(context);
      
      // Add performance stress scenarios
      chaos.addScenario({
        name: 'memory-pressure',
        probability: 0.7,
        duration: 5000,
        severity: 'medium',
      });
      
      chaos.addScenario({
        name: 'cpu-spike',
        probability: 0.5,
        duration: 3000,
        severity: 'low',
      });
      
      await chaos.start(page);
      await page.goto('/');
      
      // Perform stress operations
      const stressResults = await page.evaluate(async () => {
        const results: Array<{ operation: string; duration: number; success: boolean }> = [];
        
        // CPU-intensive operations
        const cpuStart = performance.now();
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += Math.sqrt(i);
        }
        const cpuDuration = performance.now() - cpuStart;
        results.push({ operation: 'cpu-intensive', duration: cpuDuration, success: sum > 0 });
        
        // Memory allocation
        const memStart = performance.now();
        const arrays: number[][] = [];
        try {
          for (let i = 0; i < 100; i++) {
            arrays.push(new Array(10000).fill(i));
          }
          const memDuration = performance.now() - memStart;
          results.push({ operation: 'memory-allocation', duration: memDuration, success: true });
        } catch (error) {
          results.push({ operation: 'memory-allocation', duration: performance.now() - memStart, success: false });
        }
        
        // DOM manipulation stress
        const domStart = performance.now();
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.textContent = `Stress test element ${i}`;
          fragment.appendChild(div);
        }
        document.body.appendChild(fragment);
        const domDuration = performance.now() - domStart;
        results.push({ operation: 'dom-manipulation', duration: domDuration, success: true });
        
        // Cleanup
        document.querySelectorAll('[textContent*="Stress test element"]').forEach(el => el.remove());
        
        return results;
      });
      
      await chaos.stop(page);
      
      // Validate stress test results
      stressResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(10000); // Should complete within 10s
      });
      
      // Verify app is still functional after stress
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, [role="banner"]')).toBeVisible();
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should detect and prevent memory leaks during navigation', async ({ page }) => {
      await page.goto('/');
      
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });
      
      if (!initialMemory) {
        test.skip('Memory API not available in this browser');
        return;
      }
      
      // Perform multiple navigation cycles
      const navigationCycles = 5;
      const memorySnapshots: number[] = [initialMemory];
      
      for (let i = 0; i < navigationCycles; i++) {
        // Navigate through different routes
        await page.goto('/game');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        await page.goto('/community');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
        
        // Take memory snapshot
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory.usedJSHeapSize;
        });
        
        memorySnapshots.push(currentMemory);
      }
      
      // Analyze memory trend
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const maxAcceptableGrowth = 50 * 1024 * 1024; // 50MB
      
      console.log('Memory Growth Analysis:', {
        initial: initialMemory,
        final: memorySnapshots[memorySnapshots.length - 1],
        growth: memoryGrowth,
        snapshots: memorySnapshots,
      });
      
      expect(memoryGrowth).toBeLessThan(maxAcceptableGrowth);
      
      // Check for excessive memory spikes
      const maxSnapshot = Math.max(...memorySnapshots);
      const memorySpike = maxSnapshot - initialMemory;
      const maxAcceptableSpike = 100 * 1024 * 1024; // 100MB spike tolerance
      
      expect(memorySpike).toBeLessThan(maxAcceptableSpike);
    });

    test('should clean up event listeners and prevent accumulation', async ({ page }) => {
      await page.goto('/');
      
      // Track event listener accumulation
      const listenerCounts = await page.evaluate(() => {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        
        const listenerRegistry = new Map<EventTarget, Map<string, Set<EventListener>>>();
        
        // Override addEventListener to track listeners
        EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
          if (!listenerRegistry.has(this)) {
            listenerRegistry.set(this, new Map());
          }
          const targetListeners = listenerRegistry.get(this)!;
          if (!targetListeners.has(type)) {
            targetListeners.set(type, new Set());
          }
          targetListeners.get(type)!.add(listener);
          
          return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Override removeEventListener to track cleanup
        EventTarget.prototype.removeEventListener = function(type: string, listener: any, options?: any) {
          const targetListeners = listenerRegistry.get(this);
          if (targetListeners?.has(type)) {
            targetListeners.get(type)!.delete(listener);
          }
          
          return originalRemoveEventListener.call(this, type, listener, options);
        };
        
        return {
          getListenerCount: () => {
            let total = 0;
            listenerRegistry.forEach(targetMap => {
              targetMap.forEach(listenerSet => {
                total += listenerSet.size;
              });
            });
            return total;
          },
          cleanup: () => {
            EventTarget.prototype.addEventListener = originalAddEventListener;
            EventTarget.prototype.removeEventListener = originalRemoveEventListener;
          }
        };
      });
      
      const initialListenerCount = await page.evaluate(() => 
        (window as any).__listenerTracker.getListenerCount()
      );
      
      // Add and remove components that use event listeners
      for (let i = 0; i < 10; i++) {
        await page.evaluate((index) => {
          // Create component with event listeners
          const component = document.createElement('div');
          component.setAttribute('data-testid', `test-component-${index}`);
          
          const clickHandler = () => console.log(`Click ${index}`);
          const mouseHandler = () => console.log(`Mouse ${index}`);
          const keyHandler = () => console.log(`Key ${index}`);
          
          component.addEventListener('click', clickHandler);
          component.addEventListener('mouseover', mouseHandler);
          document.addEventListener('keydown', keyHandler);
          
          document.body.appendChild(component);
          
          // Store handlers for cleanup
          (component as any).__handlers = { clickHandler, mouseHandler, keyHandler };
        }, i);
        
        await page.waitForTimeout(100);
        
        // Remove component and clean up listeners
        await page.evaluate((index) => {
          const component = document.querySelector(`[data-testid="test-component-${index}"]`) as any;
          if (component && component.__handlers) {
            component.removeEventListener('click', component.__handlers.clickHandler);
            component.removeEventListener('mouseover', component.__handlers.mouseHandler);
            document.removeEventListener('keydown', component.__handlers.keyHandler);
            component.remove();
          }
        }, i);
      }
      
      const finalListenerCount = await page.evaluate(() => 
        (window as any).__listenerTracker.getListenerCount()
      );
      
      // Cleanup tracking
      await page.evaluate(() => {
        (window as any).__listenerTracker.cleanup();
      });
      
      // Verify no listener accumulation
      const listenerGrowth = finalListenerCount - initialListenerCount;
      expect(listenerGrowth).toBeLessThanOrEqual(5); // Allow small tolerance for framework listeners
      
      console.log('Event Listener Analysis:', {
        initial: initialListenerCount,
        final: finalListenerCount,
        growth: listenerGrowth,
      });
    });
  });

  test.describe('Bundle Performance Monitoring', () => {
    test('should monitor resource loading performance', async ({ page, context }) => {
      const resourceMetrics: Array<{
        name: string;
        type: string;
        size: number;
        duration: number;
        cached: boolean;
      }> = [];
      
      // Monitor all network resources
      context.on('response', async (response) => {
        const request = response.request();
        const url = request.url();
        
        // Skip data URLs and external resources
        if (url.startsWith('data:') || !url.includes(process.env.PLAYWRIGHT_TEST_BASE_URL || 'localhost')) {
          return;
        }
        
        const timing = response.timing();
        const headers = response.headers();
        
        resourceMetrics.push({
          name: url.split('/').pop() || 'unknown',
          type: request.resourceType(),
          size: parseInt(headers['content-length'] || '0'),
          duration: timing.responseEnd - timing.requestStart,
          cached: headers['cache-control']?.includes('max-age') || false,
        });
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Analyze resource performance
      const jsResources = resourceMetrics.filter(r => r.type === 'script');
      const cssResources = resourceMetrics.filter(r => r.type === 'stylesheet');
      const imageResources = resourceMetrics.filter(r => r.type === 'image');
      
      const totalJSSize = jsResources.reduce((sum, r) => sum + r.size, 0);
      const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
      const totalImageSize = imageResources.reduce((sum, r) => sum + r.size, 0);
      
      // Performance budgets
      expect(totalJSSize).toBeLessThan(500 * 1024); // 500KB JS budget
      expect(totalCSSSize).toBeLessThan(100 * 1024); // 100KB CSS budget
      expect(totalImageSize).toBeLessThan(1024 * 1024); // 1MB image budget
      
      // Loading time budgets
      const slowResources = resourceMetrics.filter(r => r.duration > 3000);
      expect(slowResources.length).toBe(0); // No resources should take > 3s
      
      // Caching validation
      const uncachedCriticalResources = resourceMetrics.filter(r => 
        (r.type === 'script' || r.type === 'stylesheet') && 
        !r.cached &&
        r.size > 10 * 1024 // Larger than 10KB
      );
      expect(uncachedCriticalResources.length).toBeLessThanOrEqual(2); // Most resources should be cacheable
      
      console.log('Resource Performance Analysis:', {
        totalJS: `${Math.round(totalJSSize / 1024)}KB`,
        totalCSS: `${Math.round(totalCSSSize / 1024)}KB`,
        totalImages: `${Math.round(totalImageSize / 1024)}KB`,
        slowResources: slowResources.length,
        uncachedCritical: uncachedCriticalResources.length,
        resourceCount: resourceMetrics.length,
      });
    });

    test('should validate lazy loading performance', async ({ page }) => {
      await page.goto('/');
      
      // Monitor lazy-loaded content
      const lazyLoadMetrics = await page.evaluate(() => {
        return new Promise<{
          aboveFoldImages: number;
          lazyImages: number;
          loadingStrategy: string;
          intersectionObserverSupport: boolean;
        }>((resolve) => {
          const metrics = {
            aboveFoldImages: 0,
            lazyImages: 0,
            loadingStrategy: 'unknown',
            intersectionObserverSupport: 'IntersectionObserver' in window,
          };
          
          // Count images by loading strategy
          const images = document.querySelectorAll('img');
          images.forEach(img => {
            const rect = img.getBoundingClientRect();
            const isAboveFold = rect.top < window.innerHeight;
            
            if (img.loading === 'lazy') {
              metrics.lazyImages++;
              if (isAboveFold) {
                metrics.loadingStrategy = 'immediate-lazy-above-fold';
              }
            } else if (isAboveFold) {
              metrics.aboveFoldImages++;
            }
          });
          
          // Set loading strategy
          if (metrics.aboveFoldImages > 0 && metrics.lazyImages > 0) {
            metrics.loadingStrategy = 'hybrid-loading';
          } else if (metrics.lazyImages > 0) {
            metrics.loadingStrategy = 'all-lazy';
          } else {
            metrics.loadingStrategy = 'all-eager';
          }
          
          resolve(metrics);
        });
      });
      
      // Validate lazy loading implementation
      expect(lazyLoadMetrics.intersectionObserverSupport).toBe(true);
      expect(lazyLoadMetrics.loadingStrategy).toBe('hybrid-loading');
      expect(lazyLoadMetrics.aboveFoldImages).toBeGreaterThan(0); // Some above-fold images should load immediately
      
      console.log('Lazy Loading Analysis:', lazyLoadMetrics);
    });
  });

  test.describe('Performance Error Detection', () => {
    test('should detect and report performance regressions', async ({ page }) => {
      await page.goto('/');
      
      // Establish performance baseline
      const baselineMetrics = await page.evaluate(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart,
          loadComplete: navigationTiming.loadEventEnd - navigationTiming.navigationStart,
          firstByte: navigationTiming.responseStart - navigationTiming.requestStart,
        };
      });
      
      // Simulate performance regression scenario
      await page.addScriptTag({
        content: `
          // Simulate slow operations
          function simulateSlowOperation() {
            const start = Date.now();
            while (Date.now() - start < 100) {
              // CPU-intensive loop
              Math.random();
            }
          }
          
          // Add performance regression
          setInterval(simulateSlowOperation, 500);
        `,
      });
      
      // Measure performance impact
      const regressionMetrics = await page.evaluate(() => {
        return new Promise<{
          frameDrops: number;
          responseTime: number;
          memoryIncrease: number;
        }>((resolve) => {
          let frameDrops = 0;
          let lastFrameTime = performance.now();
          const frameThreshold = 16.67; // 60fps threshold
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const frameDuration = currentTime - lastFrameTime;
            
            if (frameDuration > frameThreshold * 2) {
              frameDrops++;
            }
            
            lastFrameTime = currentTime;
            
            if (frameDrops < 20) { // Measure for up to 20 potential drops
              requestAnimationFrame(measureFrame);
            } else {
              const memoryAfter = 'memory' in performance 
                ? (performance as any).memory.usedJSHeapSize 
                : 0;
              
              // Measure response time
              const responseStart = performance.now();
              setTimeout(() => {
                const responseTime = performance.now() - responseStart;
                
                resolve({
                  frameDrops,
                  responseTime,
                  memoryIncrease: memoryAfter,
                });
              }, 100);
            }
          };
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      // Generate performance error if thresholds exceeded
      if (regressionMetrics.frameDrops > 10) {
        const perfError = generatePerformanceError('throughput', {
          threshold: 60,
          actual: 60 - regressionMetrics.frameDrops,
          duration: 5000,
          impactLevel: 'high',
        });
        
        console.warn('Performance regression detected:', perfError);
      }
      
      // Validate performance within acceptable bounds
      expect(regressionMetrics.frameDrops).toBeLessThan(15); // Allow some frame drops
      expect(regressionMetrics.responseTime).toBeLessThan(200); // Response time under 200ms
      
      console.log('Performance Regression Analysis:', {
        ...regressionMetrics,
        baseline: baselineMetrics,
      });
    });

    test('should handle performance error recovery', async ({ page }) => {
      await page.goto('/');
      
      // Inject performance monitoring
      await page.evaluate(() => {
        interface PerformanceMonitor {
          errors: Array<{
            type: string;
            threshold: number;
            actual: number;
            timestamp: number;
          }>;
          recovery: Array<{
            type: string;
            recoveryTime: number;
            successful: boolean;
          }>;
        }
        
        const monitor: PerformanceMonitor = {
          errors: [],
          recovery: [],
        };
        
        // Monitor memory usage
        const checkMemory = () => {
          if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            if (usagePercent > 80) {
              monitor.errors.push({
                type: 'memory',
                threshold: 80,
                actual: usagePercent,
                timestamp: Date.now(),
              });
              
              // Attempt recovery
              const recoveryStart = Date.now();
              if ((window as any).gc) {
                (window as any).gc();
              }
              
              setTimeout(() => {
                const newUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                monitor.recovery.push({
                  type: 'memory',
                  recoveryTime: Date.now() - recoveryStart,
                  successful: newUsage < usagePercent,
                });
              }, 1000);
            }
          }
        };
        
        // Monitor response times
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const start = Date.now();
          try {
            const response = await originalFetch(...args);
            const duration = Date.now() - start;
            
            if (duration > 5000) {
              monitor.errors.push({
                type: 'response-time',
                threshold: 5000,
                actual: duration,
                timestamp: Date.now(),
              });
            }
            
            return response;
          } catch (error) {
            const duration = Date.now() - start;
            monitor.errors.push({
              type: 'request-failure',
              threshold: 0,
              actual: duration,
              timestamp: Date.now(),
            });
            throw error;
          }
        };
        
        // Store monitor globally
        (window as any).__performanceMonitor = monitor;
        
        // Start monitoring
        setInterval(checkMemory, 2000);
      });
      
      // Simulate performance issues
      await page.evaluate(() => {
        // Memory stress
        const arrays: number[][] = [];
        for (let i = 0; i < 50; i++) {
          arrays.push(new Array(100000).fill(i));
        }
        
        // Slow fetch requests
        fetch('/api/slow-endpoint').catch(() => {});
      });
      
      await page.waitForTimeout(5000);
      
      // Get monitoring results
      const monitorResults = await page.evaluate(() => 
        (window as any).__performanceMonitor
      );
      
      // Validate error detection and recovery
      expect(monitorResults.errors.length).toBeGreaterThan(0);
      
      if (monitorResults.recovery.length > 0) {
        const successfulRecoveries = monitorResults.recovery.filter(r => r.successful);
        const recoveryRate = successfulRecoveries.length / monitorResults.recovery.length;
        expect(recoveryRate).toBeGreaterThan(0.5); // At least 50% recovery success
      }
      
      console.log('Performance Error Recovery Analysis:', {
        errors: monitorResults.errors.length,
        recoveryAttempts: monitorResults.recovery.length,
        successfulRecoveries: monitorResults.recovery.filter((r: any) => r.successful).length,
      });
    });
  });
});