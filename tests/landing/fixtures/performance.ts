/**
 * Performance testing fixtures and utilities
 */

import type { Page } from '@playwright/test';
import type { 
  PerformanceMetrics, 
  BundleMetrics, 
  NetworkCondition,
  PerformanceBudget
} from '../types';

/**
 * Network condition presets
 */
export const NETWORK_CONDITIONS: Record<string, NetworkCondition> = {
  'Fast 3G': {
    name: 'Fast 3G',
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 0.75 * 1024 * 1024 / 8, // 750 Kbps
    latency: 150,
  },
  'Slow 3G': {
    name: 'Slow 3G',
    downloadThroughput: 0.5 * 1024 * 1024 / 8, // 500 Kbps
    uploadThroughput: 0.5 * 1024 * 1024 / 8, // 500 Kbps
    latency: 400,
  },
  '4G': {
    name: '4G',
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8, // 3 Mbps
    latency: 70,
  },
  'WiFi': {
    name: 'WiFi',
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
    latency: 10,
  },
  'Offline': {
    name: 'Offline',
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
    offline: true,
  },
} as const;

/**
 * Performance budgets for different page types
 */
export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget[]> = {
  homepage: [
    { metric: 'largestContentfulPaint', budget: 2500, unit: 'ms', severity: 'error' },
    { metric: 'interactionToNextPaint', budget: 200, unit: 'ms', severity: 'error' }, // 2024 standard
    { metric: 'firstInputDelay', budget: 100, unit: 'ms', severity: 'warning' }, // Legacy support
    { metric: 'cumulativeLayoutShift', budget: 0.1, unit: 'score', severity: 'error' },
    { metric: 'firstContentfulPaint', budget: 1800, unit: 'ms', severity: 'warning' },
    { metric: 'timeToInteractive', budget: 3800, unit: 'ms', severity: 'warning' },
    { metric: 'totalBlockingTime', budget: 300, unit: 'ms', severity: 'warning' },
    { metric: 'totalSize', budget: 1000 * 1024, unit: 'bytes', severity: 'error' },
  ],
  contentPage: [
    { metric: 'largestContentfulPaint', budget: 2000, unit: 'ms', severity: 'error' },
    { metric: 'firstInputDelay', budget: 50, unit: 'ms', severity: 'error' },
    { metric: 'cumulativeLayoutShift', budget: 0.05, unit: 'score', severity: 'error' },
    { metric: 'firstContentfulPaint', budget: 1500, unit: 'ms', severity: 'warning' },
    { metric: 'totalSize', budget: 800 * 1024, unit: 'bytes', severity: 'warning' },
  ],
} as const;

/**
 * Collect comprehensive performance metrics
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  return await page.evaluate(() => {
    // Navigation timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navTiming = navEntries[0];
    
    // Paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    
    // Layout shift
    let cumulativeLayoutShift = 0;
    const layoutShiftEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[];
    layoutShiftEntries.forEach(entry => {
      const shiftEntry = entry as unknown as { hadRecentInput?: boolean; value: number };
      if (!shiftEntry.hadRecentInput) {
        cumulativeLayoutShift += shiftEntry.value;
      }
    });
    
    // LCP
    let largestContentfulPaint = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
    if (lcpEntries.length > 0) {
      const lastEntry = lcpEntries[lcpEntries.length - 1];
      if (lastEntry) {
        largestContentfulPaint = lastEntry.startTime;
      }
    }
    
    // FID (legacy support)
    let firstInputDelay = 0;
    const fidEntries = performance.getEntriesByType('first-input') as PerformanceEntry[];
    if (fidEntries.length > 0) {
      const fidEntry = fidEntries[0] as unknown as { processingStart: number; startTime: number };
      firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
    }

    // INP (Interaction to Next Paint) - 2024 Core Web Vital
    let interactionToNextPaint = 0;
    try {
      // Use PerformanceObserver to collect INP
      const inpEntries = performance.getEntriesByType('event') as PerformanceEntry[];
      if (inpEntries.length > 0) {
        // Calculate INP as the longest interaction delay
        const interactionDelays = inpEntries
          .filter((entry) => {
            const eventEntry = entry as unknown as { interactionId?: number; processingStart?: number; startTime: number };
            return eventEntry.interactionId && eventEntry.processingStart;
          })
          .map((entry) => {
            const eventEntry = entry as unknown as { processingStart: number; startTime: number };
            return eventEntry.processingStart - eventEntry.startTime;
          });
        
        if (interactionDelays.length > 0) {
          interactionToNextPaint = Math.max(...interactionDelays);
        }
      }
    } catch (error) {
      // INP might not be supported in all browsers
      console.warn('INP measurement not supported:', error);
    }
    
    // Calculate additional metrics
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalRequests = resources.length;
    const totalSize = resources.reduce((sum, resource) => {
      return sum + ((resource as unknown as { transferSize?: number }).transferSize || 0);
    }, 0);
    
    const cachedRequests = resources.filter(resource => (resource as unknown as { transferSize?: number }).transferSize === 0).length;
    
    // Memory metrics (if available)
    const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
    const jsHeapUsed = memory?.usedJSHeapSize || 0;
    const jsHeapTotal = memory?.totalJSHeapSize || 0;
    
    // Time to Interactive (simplified calculation)
    const timeToInteractive = navTiming ? (navTiming.loadEventEnd - navTiming.fetchStart) : 0;
    
    // Total Blocking Time (simplified)
    const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[];
    const totalBlockingTime = longTasks.reduce((sum, task) => {
      return sum + Math.max(0, task.duration - 50);
    }, 0);
    
    // Speed Index (simplified - would need more complex calculation)
    const speedIndex = firstContentfulPaint * 0.8 + largestContentfulPaint * 0.2;
    
    // Performance grading based on 2024 Core Web Vitals thresholds
    function getPerformanceGrade(): 'Good' | 'Needs Improvement' | 'Poor' {
      const lcpGood = largestContentfulPaint <= 2500;
      const clsGood = cumulativeLayoutShift <= 0.1;
      const inpGood = interactionToNextPaint <= 200;
      
      const goodCount = [lcpGood, clsGood, inpGood].filter(Boolean).length;
      
      if (goodCount === 3) return 'Good';
      if (goodCount >= 2) return 'Needs Improvement';
      return 'Poor';
    }
    
    return {
      domContentLoaded: navTiming ? (navTiming.domContentLoadedEventEnd - navTiming.fetchStart) : 0,
      load: navTiming ? (navTiming.loadEventEnd - navTiming.fetchStart) : 0,
      firstPaint,
      firstContentfulPaint,
      largestContentfulPaint,
      cumulativeLayoutShift,
      firstInputDelay,
      interactionToNextPaint,
      timeToInteractive,
      totalBlockingTime,
      speedIndex,
      totalRequests,
      totalSize,
      cachedRequests,
      jsHeapUsed,
      jsHeapTotal,
      performanceGrade: getPerformanceGrade(),
    };
  });
}

/**
 * Analyze JavaScript bundles
 */
export async function analyzeBundles(page: Page): Promise<BundleMetrics> {
  const bundleInfo = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const jsFiles = scripts.map(script => ({
      url: (script as HTMLScriptElement).src,
      type: 'js' as const,
    }));
    
    const cssFiles = stylesheets.map(link => ({
      url: (link as HTMLLinkElement).href,
      type: 'css' as const,
    }));
    
    return [...jsFiles, ...cssFiles];
  });
  
  // Analyze bundle sizes
  let mainBundle = 0;
  let vendorBundle = 0;
  let cssBundle = 0;
  const chunks: BundleMetrics['chunks'] = [];
  const assets: BundleMetrics['assets'] = [];
  
  for (const file of bundleInfo) {
    try {
      const response = await page.request.head(file.url);
      const contentLength = response.headers()['content-length'];
      const size = contentLength ? parseInt(contentLength) : 0;
      
      const filename = file.url.split('/').pop() || '';
      
      if (file.type === 'js') {
        if (filename.includes('vendor') || filename.includes('node_modules')) {
          vendorBundle += size;
        } else {
          mainBundle += size;
        }
        
        chunks.push({
          name: filename,
          size,
          gzipSize: size * 0.3, // Rough estimate
        });
      } else if (file.type === 'css') {
        cssBundle += size;
      }
      
      assets.push({
        name: filename,
        size,
        type: file.type,
      });
    } catch {
      // Ignore errors for external resources
    }
  }
  
  const totalSize = mainBundle + vendorBundle + cssBundle;
  
  return {
    mainBundle,
    vendorBundle,
    cssBundle,
    totalSize,
    gzipSize: totalSize * 0.3, // Rough estimate
    brotliSize: totalSize * 0.25, // Rough estimate
    chunks,
    assets,
  };
}

/**
 * Check performance budget violations
 */
export function checkPerformanceBudgets(
  metrics: PerformanceMetrics,
  budgets: PerformanceBudget[]
): Array<{ budget: PerformanceBudget; actual: number; passed: boolean }> {
  return budgets.map(budget => {
    const actual = metrics[budget.metric];
    
    // Skip non-numeric metrics like performanceGrade
    if (typeof actual !== 'number') {
      return { budget, actual: 0, passed: true };
    }
    
    const passed = actual <= budget.budget;
    
    return { budget, actual, passed };
  });
}

/**
 * Simulate network conditions
 */
export async function simulateNetworkCondition(
  page: Page,
  condition: NetworkCondition
): Promise<void> {
  const client = await page.context().newCDPSession(page);
  
  if (condition.offline) {
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    });
  } else {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: condition.downloadThroughput,
      uploadThroughput: condition.uploadThroughput,
      latency: condition.latency,
    });
  }
}

/**
 * Reset network conditions
 */
export async function resetNetworkCondition(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}

/**
 * Measure Time to Interactive
 */
export async function measureTimeToInteractive(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let tti = 0;
      
      // Use PerformanceObserver to detect when page is interactive
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Look for long tasks that might delay interactivity
        const longTasks = entries.filter((entry) => entry.duration > 50);
        
        if (longTasks.length === 0) {
          // No long tasks, page is likely interactive
          tti = performance.now();
          observer.disconnect();
          resolve(tti);
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        resolve(performance.now());
      }, 10000);
    });
  });
}

/**
 * Get resource timing breakdown
 */
export async function getResourceTimingBreakdown(page: Page) {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const breakdown = {
      scripts: { count: 0, totalSize: 0, totalDuration: 0 },
      stylesheets: { count: 0, totalSize: 0, totalDuration: 0 },
      images: { count: 0, totalSize: 0, totalDuration: 0 },
      fonts: { count: 0, totalSize: 0, totalDuration: 0 },
      other: { count: 0, totalSize: 0, totalDuration: 0 },
    };
    
    resources.forEach(resource => {
      const duration = resource.responseEnd - resource.startTime;
      const size = resource.transferSize || 0;
      
      let category: keyof typeof breakdown = 'other';
      
      if (resource.initiatorType === 'script') {
        category = 'scripts';
      } else if (resource.initiatorType === 'css' || resource.initiatorType === 'link') {
        category = 'stylesheets';
      } else if (resource.initiatorType === 'img' || resource.initiatorType === 'image') {
        category = 'images';
      } else if (resource.name.includes('font') || resource.name.includes('.woff')) {
        category = 'fonts';
      }
      
      breakdown[category].count++;
      breakdown[category].totalSize += size;
      breakdown[category].totalDuration += duration;
    });
    
    return breakdown;
  });
}