/**
 * Chaos Engineering utilities for infrastructure resilience testing
 *
 * This module provides a comprehensive chaos testing framework to
 * simulate various failure scenarios and validate system resilience
 * under adverse conditions.
 */

import type { Page, BrowserContext, Route } from '@playwright/test';
import type { BaseError, InfrastructureError } from '../types/errors';
import { generateRandomError } from './error-generators';
import { mockNetworkFailure, mockInfrastructureFailure } from './mock-helpers';
import type { TestWindow } from '../../types/test-types';

// Extend Page type for chaos-specific properties
interface ChaosPage extends Page {
  __chaosInterval?: NodeJS.Timeout;
}

// Extend Window type for chaos-specific properties
interface ChaosWindow extends Window {
  __cpuWorkers?: Worker[];
  __memoryArrays?: ArrayBuffer[];
  __OriginalDate?: typeof Date;
  __originalSetItem?: typeof localStorage.setItem;
  gc?: () => void;
  Date: typeof Date;
}

/**
 * Chaos scenario configuration
 */
export interface ChaosScenario {
  name: string;
  description?: string;
  probability: number;
  duration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown?: number;
  affectedServices?: string[];
}

/**
 * Chaos test results
 */
export interface ChaosTestResult {
  scenario: string;
  executed: boolean;
  startTime: number;
  endTime?: number;
  errors: BaseError[];
  metrics: {
    requestsAffected: number;
    errorRate: number;
    recoveryTime?: number;
  };
}

/**
 * Chaos Engine for coordinated failure injection
 */
export class ChaosEngine {
  private scenarios: Map<string, ChaosScenario> = new Map();
  private activeScenarios: Set<string> = new Set();
  private results: ChaosTestResult[] = [];
  private isActive = false;
  private executionLog: Array<{ time: number; event: string }> = [];

  constructor(private readonly context: BrowserContext) {}

  /**
   * Add a chaos scenario
   */
  addScenario(scenario: ChaosScenario): this {
    this.scenarios.set(scenario.name, scenario);
    return this;
  }

  /**
   * Add multiple scenarios at once
   */
  addScenarios(scenarios: ChaosScenario[]): this {
    scenarios.forEach(s => this.addScenario(s));
    return this;
  }

  /**
   * Start chaos injection
   */
  async start(page: Page): Promise<void> {
    this.isActive = true;
    this.logEvent('Chaos engine started');

    // Start periodic chaos injection
    const interval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(interval);
        return;
      }

      await this.injectChaos(page);
    }, 5000); // Check every 5 seconds

    // Store interval ID for cleanup
    (page as ChaosPage).__chaosInterval = interval;
  }

  /**
   * Stop chaos injection
   */
  async stop(page: Page): Promise<void> {
    this.isActive = false;
    this.logEvent('Chaos engine stopped');

    // Clear interval
    const interval = (page as ChaosPage).__chaosInterval;
    if (interval) {
      clearInterval(interval);
    }

    // Clean up active scenarios
    const scenarioNames = Array.from(this.activeScenarios);
    for (const scenarioName of scenarioNames) {
      await this.cleanupScenario(page, scenarioName);
    }
  }

  /**
   * Inject chaos based on configured scenarios
   */
  private async injectChaos(page: Page): Promise<void> {
    const scenarios = Array.from(this.scenarios.entries());
    for (const [name, scenario] of scenarios) {
      // Skip if scenario is already active
      if (this.activeScenarios.has(name)) {
        continue;
      }

      // Check probability
      if (Math.random() < scenario.probability) {
        await this.executeScenario(page, scenario);
      }
    }
  }

  /**
   * Execute a specific chaos scenario
   */
  private async executeScenario(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    this.logEvent(`Executing scenario: ${scenario.name}`);
    this.activeScenarios.add(scenario.name);

    const result: ChaosTestResult = {
      scenario: scenario.name,
      executed: true,
      startTime: Date.now(),
      errors: [],
      metrics: {
        requestsAffected: 0,
        errorRate: 0,
      },
    };

    try {
      switch (scenario.name) {
        case 'network-partition':
          await this.injectNetworkPartition(page, scenario);
          break;

        case 'network-degradation':
          await this.injectNetworkDegradation(page, scenario);
          break;

        case 'service-outage':
          await this.injectServiceOutage(page, scenario);
          break;

        case 'cpu-spike':
          await this.injectCpuSpike(page, scenario);
          break;

        case 'memory-pressure':
          await this.injectMemoryPressure(page, scenario);
          break;

        case 'clock-skew':
          await this.injectClockSkew(page, scenario);
          break;

        case 'data-corruption':
          await this.injectDataCorruption(page, scenario);
          break;

        case 'cascading-failure':
          await this.injectCascadingFailure(page, scenario);
          break;

        default:
          // Custom scenario handler
          await this.injectCustomScenario(page, scenario);
      }

      // Schedule cleanup if duration is specified
      if (scenario.duration) {
        setTimeout(async () => {
          await this.cleanupScenario(page, scenario.name);
          result.endTime = Date.now();
          result.metrics.recoveryTime = result.endTime - result.startTime;
          this.results.push(result);
        }, scenario.duration);
      }
    } catch (error) {
      this.logEvent(`Error executing scenario ${scenario.name}: ${error}`);
      result.errors.push(generateRandomError());
      this.results.push(result);
    }
  }

  /**
   * Inject network partition
   */
  private async injectNetworkPartition(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    const patterns = scenario.affectedServices?.map(s => `**/${s}/**`) || [
      '**/api/**',
    ];

    for (const pattern of patterns) {
      await mockNetworkFailure(page, pattern, 'connection');
    }

    // Simulate offline state
    await this.context.setOffline(true);
  }

  /**
   * Inject network degradation
   */
  private async injectNetworkDegradation(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    // Add artificial latency to all requests
    await page.route('**/*', async (route: Route) => {
      const delay =
        scenario.severity === 'critical'
          ? 5000
          : scenario.severity === 'high'
            ? 3000
            : scenario.severity === 'medium'
              ? 1500
              : 500;

      const jitter = delay * 0.3;
      const actualDelay = delay + (Math.random() - 0.5) * jitter;

      await new Promise(resolve => setTimeout(resolve, actualDelay));
      await route.continue();
    });
  }

  /**
   * Inject service outage
   */
  private async injectServiceOutage(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    const services = scenario.affectedServices || ['redis'];

    for (const service of services) {
      await mockInfrastructureFailure(
        page,
        service as InfrastructureError['service'],
        'all',
        {
          fatal: scenario.severity === 'critical',
        }
      );
    }
  }

  /**
   * Inject CPU spike
   */
  private async injectCpuSpike(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    await page.evaluate(severity => {
      const intensity =
        severity === 'critical'
          ? 0.95
          : severity === 'high'
            ? 0.8
            : severity === 'medium'
              ? 0.6
              : 0.4;

      const workers: Worker[] = [];
      const workerCount = navigator.hardwareConcurrency || 4;

      // Create CPU-intensive workers
      for (let i = 0; i < workerCount; i++) {
        const workerCode = `
          let active = true;
          self.onmessage = (e) => {
            if (e.data === 'stop') active = false;
          };
          
          while (active) {
            // CPU-intensive calculation
            let sum = 0;
            for (let j = 0; j < 1000000 * ${intensity}; j++) {
              sum += Math.sqrt(j);
            }
          }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        workers.push(worker);
      }

      // Store workers for cleanup
      (window as ChaosWindow).__cpuWorkers = workers;
    }, scenario.severity);
  }

  /**
   * Inject memory pressure
   */
  private async injectMemoryPressure(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    await page.evaluate(severity => {
      const arrays: ArrayBuffer[] = [];
      const targetMB =
        severity === 'critical'
          ? 500
          : severity === 'high'
            ? 300
            : severity === 'medium'
              ? 150
              : 50;

      // Allocate memory in chunks
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      const chunks = Math.floor((targetMB * 1024 * 1024) / chunkSize);

      for (let i = 0; i < chunks; i++) {
        try {
          arrays.push(new ArrayBuffer(chunkSize));
        } catch (e) {
          console.warn('Memory allocation failed', e);
          break;
        }
      }

      // Store for cleanup
      (window as ChaosWindow).__memoryArrays = arrays;
    }, scenario.severity);
  }

  /**
   * Inject clock skew
   */
  private async injectClockSkew(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    await page.evaluate(severity => {
      const skewMs =
        severity === 'critical'
          ? 3600000 // 1 hour
          : severity === 'high'
            ? 600000 // 10 minutes
            : severity === 'medium'
              ? 60000 // 1 minute
              : 10000; // 10 seconds

      // Override Date constructor
      const OriginalDate = Date;

      // Create a new Date constructor that adds skew
      function MockDate(this: Date): Date;
      function MockDate(value: number | string): Date;
      function MockDate(
        year: number,
        monthIndex: number,
        date?: number,
        hours?: number,
        minutes?: number,
        seconds?: number,
        ms?: number
      ): Date;
      function MockDate(this: unknown, ...args: unknown[]): Date {
        let instance: Date;
        if (args.length === 0) {
          instance = new OriginalDate();
          instance.setTime(instance.getTime() + skewMs);
        } else {
          instance = new (OriginalDate as unknown as new (
            ...args: unknown[]
          ) => Date)(...args);
        }
        return instance;
      }

      // Copy static methods
      MockDate.now = () => OriginalDate.now() + skewMs;
      MockDate.parse = OriginalDate.parse;
      MockDate.UTC = OriginalDate.UTC;
      Object.setPrototypeOf(MockDate, OriginalDate);

      (window as TestWindow).Date = MockDate as unknown as DateConstructor;

      // Store original for cleanup
      (window as ChaosWindow).__OriginalDate = OriginalDate;
    }, scenario.severity);
  }

  /**
   * Inject data corruption
   */
  private async injectDataCorruption(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    await page.evaluate(severity => {
      const corruptionRate =
        severity === 'critical'
          ? 0.5
          : severity === 'high'
            ? 0.3
            : severity === 'medium'
              ? 0.15
              : 0.05;

      // Override localStorage
      const originalSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key: string, value: string) {
        if (Math.random() < corruptionRate) {
          // Corrupt the data
          const corrupted = value
            .split('')
            .map(char =>
              Math.random() < 0.1
                ? String.fromCharCode(char.charCodeAt(0) + 1)
                : char
            )
            .join('');
          originalSetItem(key, corrupted);
        } else {
          originalSetItem(key, value);
        }
      };

      // Store original for cleanup
      (window as ChaosWindow).__originalSetItem = originalSetItem;
    }, scenario.severity);
  }

  /**
   * Inject cascading failure
   */
  private async injectCascadingFailure(
    page: Page,
    _scenario: ChaosScenario
  ): Promise<void> {
    // Start with one service failure
    await mockInfrastructureFailure(page, 'redis', 'connection');

    // After 2 seconds, fail another service
    setTimeout(async () => {
      await mockInfrastructureFailure(page, 'supabase', 'timeout');
    }, 2000);

    // After 4 seconds, cause API failures
    setTimeout(async () => {
      await page.route('**/api/**', async (route: Route) => {
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service cascade failure' }),
        });
      });
    }, 4000);
  }

  /**
   * Inject custom scenario
   */
  private async injectCustomScenario(
    page: Page,
    scenario: ChaosScenario
  ): Promise<void> {
    // Emit event for custom handler
    await page.evaluate(scenarioName => {
      window.dispatchEvent(
        new CustomEvent('chaos-scenario', {
          detail: { scenario: scenarioName },
        })
      );
    }, scenario.name);
  }

  /**
   * Clean up after a scenario
   */
  private async cleanupScenario(
    page: Page,
    scenarioName: string
  ): Promise<void> {
    this.logEvent(`Cleaning up scenario: ${scenarioName}`);
    this.activeScenarios.delete(scenarioName);

    try {
      switch (scenarioName) {
        case 'network-partition':
          await this.context.setOffline(false);
          await page.unroute('**/*');
          break;

        case 'network-degradation':
          await page.unroute('**/*');
          break;

        case 'cpu-spike':
          await page.evaluate(() => {
            const workers = (window as ChaosWindow).__cpuWorkers;
            if (workers) {
              workers.forEach((w: Worker) => {
                w.postMessage('stop');
                w.terminate();
              });
              delete (window as ChaosWindow).__cpuWorkers;
            }
          });
          break;

        case 'memory-pressure':
          await page.evaluate(() => {
            delete (window as ChaosWindow).__memoryArrays;
            // Suggest garbage collection
            const gc = (window as ChaosWindow).gc;
            if (gc && typeof gc === 'function') {
              gc();
            }
          });
          break;

        case 'clock-skew':
          await page.evaluate(() => {
            if ((window as ChaosWindow).__OriginalDate) {
              (window as ChaosWindow).Date = (
                window as ChaosWindow
              ).__OriginalDate!;
              delete (window as ChaosWindow).__OriginalDate;
            }
          });
          break;

        case 'data-corruption':
          await page.evaluate(() => {
            const originalSetItem = (window as ChaosWindow).__originalSetItem;
            if (originalSetItem && typeof originalSetItem === 'function') {
              localStorage.setItem = originalSetItem;
              delete (window as ChaosWindow).__originalSetItem;
            }
          });
          break;
      }
    } catch (error) {
      this.logEvent(`Error cleaning up scenario ${scenarioName}: ${error}`);
    }
  }

  /**
   * Log chaos event
   */
  private logEvent(event: string): void {
    this.executionLog.push({
      time: Date.now(),
      event,
    });
  }

  /**
   * Get chaos test results
   */
  getResults(): ChaosTestResult[] {
    return [...this.results];
  }

  /**
   * Get execution log
   */
  getExecutionLog(): Array<{ time: number; event: string }> {
    return [...this.executionLog];
  }

  /**
   * Get chaos metrics
   */
  getMetrics(): {
    totalScenarios: number;
    executedScenarios: number;
    activeScenarios: number;
    totalErrors: number;
    averageRecoveryTime: number;
  } {
    const executedScenarios = this.results.length;
    const totalErrors = this.results.reduce(
      (sum, r) => sum + r.errors.length,
      0
    );
    const recoveryTimes = this.results
      .filter(r => r.metrics.recoveryTime !== undefined)
      .map(r => r.metrics.recoveryTime as number);

    const averageRecoveryTime =
      recoveryTimes.length > 0
        ? recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
        : 0;

    return {
      totalScenarios: this.scenarios.size,
      executedScenarios,
      activeScenarios: this.activeScenarios.size,
      totalErrors,
      averageRecoveryTime,
    };
  }
}

/**
 * Predefined chaos scenario sets
 */
export const CHAOS_SCENARIOS = {
  basic: [
    {
      name: 'network-partition',
      probability: 0.2,
      duration: 10000,
      severity: 'high' as const,
      description: 'Complete network isolation',
    },
    {
      name: 'service-outage',
      probability: 0.15,
      duration: 15000,
      severity: 'medium' as const,
      affectedServices: ['redis'],
      description: 'Redis service failure',
    },
    {
      name: 'network-degradation',
      probability: 0.3,
      duration: 20000,
      severity: 'low' as const,
      description: 'High latency network',
    },
  ],

  advanced: [
    {
      name: 'cascading-failure',
      probability: 0.1,
      duration: 30000,
      severity: 'critical' as const,
      description: 'Multiple service failures',
    },
    {
      name: 'memory-pressure',
      probability: 0.2,
      duration: 15000,
      severity: 'high' as const,
      description: 'High memory usage',
    },
    {
      name: 'clock-skew',
      probability: 0.15,
      duration: 10000,
      severity: 'medium' as const,
      description: 'System clock drift',
    },
  ],

  extreme: [
    {
      name: 'cpu-spike',
      probability: 0.25,
      duration: 10000,
      severity: 'critical' as const,
      description: 'CPU exhaustion',
    },
    {
      name: 'data-corruption',
      probability: 0.05,
      duration: 5000,
      severity: 'high' as const,
      description: 'Storage corruption',
    },
    {
      name: 'cascading-failure',
      probability: 0.15,
      duration: 45000,
      severity: 'critical' as const,
      description: 'System-wide failure',
    },
  ],
};
