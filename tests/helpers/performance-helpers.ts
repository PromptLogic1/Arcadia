import type { Page } from '@playwright/test';

/**
 * Performance metrics types
 */
export interface PerformanceMetrics {
  // Timing metrics
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  
  // Memory metrics
  jsHeapUsedSize: number;
  jsHeapTotalSize: number;
  
  // Network metrics
  requestCount: number;
  totalTransferSize: number;
  
  // Custom metrics
  renderTime?: number;
  apiResponseTime?: number;
}

export interface TimerAccuracy {
  expectedTime: number;
  actualTime: number;
  drift: number;
  driftPercentage: number;
}

/**
 * Performance testing helper
 */
export class PerformanceTestHelper {
  private initialMetrics?: PerformanceMetrics;
  private requestTimings = new Map<string, number>();

  constructor(private page: Page) {}

  /**
   * Start performance monitoring
   */
  async startMonitoring() {
    // Capture initial metrics
    this.initialMetrics = await this.captureMetrics();

    // Monitor API requests
    this.page.on('request', request => {
      this.requestTimings.set(request.url(), Date.now());
    });

    this.page.on('response', response => {
      const startTime = this.requestTimings.get(response.url());
      if (startTime) {
        const duration = Date.now() - startTime;
        // Store API response times
        if (response.url().includes('/api/')) {
          this.requestTimings.set(`response:${response.url()}`, duration);
        }
      }
    });
  }

  /**
   * Capture current performance metrics
   */
  async captureMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: fcp ? fcp.startTime : 0,
        largestContentfulPaint: lcp ? lcp.startTime : 0,
        timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
        totalBlockingTime: 0, // Would need Long Task API
        requestCount: performance.getEntriesByType('resource').length,
        totalTransferSize: performance.getEntriesByType('resource')
          .reduce((total, entry: any) => total + (entry.transferSize || 0), 0)
      };
    });

    // Add memory metrics
    const jsMetrics = await this.page.metrics();
    
    return {
      ...metrics,
      jsHeapUsedSize: jsMetrics.JSHeapUsedSize,
      jsHeapTotalSize: jsMetrics.JSHeapTotalSize
    };
  }

  /**
   * Get memory growth since start
   */
  async getMemoryGrowth(): Promise<number> {
    if (!this.initialMetrics) {
      throw new Error('Monitoring not started. Call startMonitoring() first.');
    }

    const currentMetrics = await this.captureMetrics();
    return currentMetrics.jsHeapUsedSize - this.initialMetrics.jsHeapUsedSize;
  }

  /**
   * Check for memory leaks
   */
  async checkMemoryLeak(threshold: number = 50 * 1024 * 1024): Promise<boolean> {
    const growth = await this.getMemoryGrowth();
    return growth > threshold;
  }

  /**
   * Measure render performance
   */
  async measureRenderPerformance(action: () => Promise<void>): Promise<number> {
    const startTime = await this.page.evaluate(() => performance.now());
    
    await action();
    
    // Wait for render to complete
    await this.page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    
    const endTime = await this.page.evaluate(() => performance.now());
    return endTime - startTime;
  }

  /**
   * Get API response times
   */
  getApiResponseTimes(): Map<string, number> {
    const apiTimes = new Map<string, number>();
    
    this.requestTimings.forEach((value, key) => {
      if (key.startsWith('response:') && key.includes('/api/')) {
        const url = key.replace('response:', '');
        apiTimes.set(url, value);
      }
    });
    
    return apiTimes;
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const metrics = await this.captureMetrics();
    const memoryGrowth = this.initialMetrics ? await this.getMemoryGrowth() : 0;
    const apiTimes = this.getApiResponseTimes();

    let report = '## Performance Report\n\n';
    report += '### Page Load Metrics\n';
    report += `- DOM Content Loaded: ${metrics.domContentLoaded}ms\n`;
    report += `- First Contentful Paint: ${metrics.firstContentfulPaint}ms\n`;
    report += `- Largest Contentful Paint: ${metrics.largestContentfulPaint}ms\n`;
    report += `- Time to Interactive: ${metrics.timeToInteractive}ms\n\n`;

    report += '### Memory Usage\n';
    report += `- JS Heap Used: ${(metrics.jsHeapUsedSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- JS Heap Total: ${(metrics.jsHeapTotalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB\n\n`;

    report += '### Network\n';
    report += `- Total Requests: ${metrics.requestCount}\n`;
    report += `- Total Transfer Size: ${(metrics.totalTransferSize / 1024).toFixed(2)}KB\n\n`;

    if (apiTimes.size > 0) {
      report += '### API Response Times\n';
      apiTimes.forEach((time, url) => {
        const endpoint = url.split('/api/')[1];
        report += `- ${endpoint}: ${time}ms\n`;
      });
    }

    return report;
  }
}

/**
 * Timer accuracy helper for speedrun testing
 */
export class TimerAccuracyHelper {
  private measurements: TimerAccuracy[] = [];

  /**
   * Measure timer accuracy
   */
  async measureAccuracy(
    page: Page,
    duration: number,
    getTimerValue: () => Promise<number>
  ): Promise<TimerAccuracy> {
    const startTime = Date.now();
    const initialTimer = await getTimerValue();
    
    await page.waitForTimeout(duration);
    
    const endTime = Date.now();
    const finalTimer = await getTimerValue();
    
    const expectedTime = endTime - startTime;
    const actualTime = finalTimer - initialTimer;
    const drift = Math.abs(actualTime - expectedTime);
    const driftPercentage = (drift / expectedTime) * 100;

    const measurement = {
      expectedTime,
      actualTime,
      drift,
      driftPercentage
    };

    this.measurements.push(measurement);
    return measurement;
  }

  /**
   * Get average drift
   */
  getAverageDrift(): number {
    if (this.measurements.length === 0) return 0;
    
    const totalDrift = this.measurements.reduce((sum, m) => sum + m.drift, 0);
    return totalDrift / this.measurements.length;
  }

  /**
   * Get maximum drift
   */
  getMaxDrift(): number {
    if (this.measurements.length === 0) return 0;
    return Math.max(...this.measurements.map(m => m.drift));
  }

  /**
   * Check if timer meets accuracy requirements
   */
  meetsAccuracyRequirements(maxDriftMs: number = 100): boolean {
    return this.getMaxDrift() <= maxDriftMs;
  }

  /**
   * Generate accuracy report
   */
  generateReport(): string {
    if (this.measurements.length === 0) {
      return 'No measurements recorded';
    }

    const avgDrift = this.getAverageDrift();
    const maxDrift = this.getMaxDrift();
    const minDrift = Math.min(...this.measurements.map(m => m.drift));

    let report = '## Timer Accuracy Report\n\n';
    report += `Total Measurements: ${this.measurements.length}\n\n`;
    report += '### Drift Statistics\n';
    report += `- Average Drift: ${avgDrift.toFixed(2)}ms\n`;
    report += `- Maximum Drift: ${maxDrift.toFixed(2)}ms\n`;
    report += `- Minimum Drift: ${minDrift.toFixed(2)}ms\n\n`;

    report += '### Detailed Measurements\n';
    this.measurements.forEach((m, i) => {
      report += `${i + 1}. Expected: ${m.expectedTime}ms, Actual: ${m.actualTime}ms, `;
      report += `Drift: ${m.drift}ms (${m.driftPercentage.toFixed(2)}%)\n`;
    });

    return report;
  }
}

/**
 * CPU load simulator for stress testing
 */
export class CPULoadSimulator {
  private worker?: Worker;

  /**
   * Start CPU load
   */
  async startLoad(page: Page, intensity: 'low' | 'medium' | 'high' = 'medium') {
    const iterations = {
      low: 1000,
      medium: 10000,
      high: 100000
    }[intensity];

    this.worker = await page.evaluateHandle((iterations) => {
      const workerCode = `
        let running = true;
        self.onmessage = (e) => { 
          if (e.data === 'stop') {
            running = false;
          }
        };
        
        while (running) {
          // CPU intensive calculation
          for (let i = 0; i < ${iterations}; i++) {
            Math.sqrt(Math.random() * 1000000);
          }
        }
      `;
      
      return new Worker(
        URL.createObjectURL(
          new Blob([workerCode], { type: 'application/javascript' })
        )
      );
    }, iterations);
  }

  /**
   * Stop CPU load
   */
  async stopLoad() {
    if (this.worker) {
      await this.worker.evaluate(worker => {
        worker.postMessage('stop');
        worker.terminate();
      });
      this.worker = undefined;
    }
  }
}

/**
 * Network condition simulator
 */
export class NetworkConditionSimulator {
  constructor(private page: Page) {}

  /**
   * Simulate slow network
   */
  async simulateSlow3G() {
    await this.page.context().route('**/*', async route => {
      // Add 400ms latency to simulate slow 3G
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.continue();
    });
  }

  /**
   * Simulate offline
   */
  async simulateOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Restore normal conditions
   */
  async restore() {
    await this.page.context().setOffline(false);
    await this.page.context().unroute('**/*');
  }
}

/**
 * Helper to create performance test context
 */
export async function createPerformanceContext(page: Page) {
  const performanceHelper = new PerformanceTestHelper(page);
  const timerHelper = new TimerAccuracyHelper();
  const cpuSimulator = new CPULoadSimulator();
  const networkSimulator = new NetworkConditionSimulator(page);

  await performanceHelper.startMonitoring();

  return {
    performance: performanceHelper,
    timer: timerHelper,
    cpu: cpuSimulator,
    network: networkSimulator,
    cleanup: async () => {
      await cpuSimulator.stopLoad();
      await networkSimulator.restore();
    }
  };
}