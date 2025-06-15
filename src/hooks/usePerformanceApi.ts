import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  // Navigation timing
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  
  // Custom timing
  customMarks: Record<string, number>;
  customMeasures: Record<string, number>;
}

interface UsePerformanceApiOptions {
  trackLCP?: boolean;
  trackFCP?: boolean;
  trackCLS?: boolean;
  trackFID?: boolean;
  trackTTFB?: boolean;
  onMetric?: (metric: { name: string; value: number; rating: 'good' | 'needs-improvement' | 'poor' }) => void;
}

export function usePerformanceApi(options: UsePerformanceApiOptions = {}) {
  const {
    trackLCP = true,
    trackFCP = true,
    trackCLS = true,
    trackFID = true,
    trackTTFB = true,
    onMetric,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    navigationStart: 0,
    domContentLoaded: 0,
    loadComplete: 0,
    customMarks: {},
    customMeasures: {},
  });

  const observersRef = useRef<PerformanceObserver[]>([]);

  // Helper to rate metrics based on Core Web Vitals thresholds
  const rateMetric = useCallback((name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      'largest-contentful-paint': { good: 2500, poor: 4000 },
      'first-contentful-paint': { good: 1800, poor: 3000 },
      'cumulative-layout-shift': { good: 0.1, poor: 0.25 },
      'first-input-delay': { good: 100, poor: 300 },
      'time-to-first-byte': { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }, []);

  // Initialize performance tracking
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        navigationStart: navigation.startTime,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
      }));
    }

    // Track Core Web Vitals if supported
    if ('PerformanceObserver' in window) {
      const observers: PerformanceObserver[] = [];

      // Largest Contentful Paint (LCP)
      if (trackLCP) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              const value = lastEntry.startTime;
              setMetrics(prev => ({ ...prev, largestContentfulPaint: value }));
              onMetric?.({
                name: 'largest-contentful-paint',
                value,
                rating: rateMetric('largest-contentful-paint', value),
              });
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          observers.push(lcpObserver);
        } catch (e) {
          // LCP not supported
        }
      }

      // First Contentful Paint (FCP)
      if (trackFCP) {
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              const value = fcpEntry.startTime;
              setMetrics(prev => ({ ...prev, firstContentfulPaint: value }));
              onMetric?.({
                name: 'first-contentful-paint',
                value,
                rating: rateMetric('first-contentful-paint', value),
              });
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
          observers.push(fcpObserver);
        } catch (e) {
          // FCP not supported
        }
      }

      // Cumulative Layout Shift (CLS)
      if (trackCLS) {
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // Only count layout shifts without recent user input
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            onMetric?.({
              name: 'cumulative-layout-shift',
              value: clsValue,
              rating: rateMetric('cumulative-layout-shift', clsValue),
            });
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          observers.push(clsObserver);
        } catch (e) {
          // CLS not supported
        }
      }

      // First Input Delay (FID)
      if (trackFID) {
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstInput = entries[0];
            if (firstInput) {
              const value = (firstInput as any).processingStart - firstInput.startTime;
              onMetric?.({
                name: 'first-input-delay',
                value,
                rating: rateMetric('first-input-delay', value),
              });
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          observers.push(fidObserver);
        } catch (e) {
          // FID not supported
        }
      }

      observersRef.current = observers;

      return () => {
        observers.forEach(observer => observer.disconnect());
      };
    }
  }, [trackLCP, trackFCP, trackCLS, trackFID, trackTTFB, onMetric, rateMetric]);

  // Performance marking and measuring
  const mark = useCallback((name: string) => {
    if (typeof window === 'undefined' || !window.performance?.mark) return;

    try {
      performance.mark(name);
      const mark = performance.getEntriesByName(name, 'mark')[0];
      if (mark) {
        setMetrics(prev => ({
          ...prev,
          customMarks: { ...prev.customMarks, [name]: mark.startTime },
        }));
      }
    } catch (error) {
      console.warn('Failed to create performance mark:', name, error);
    }
  }, []);

  const measure = useCallback((name: string, startMark?: string, endMark?: string) => {
    if (typeof window === 'undefined' || !window.performance?.measure) return;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        setMetrics(prev => ({
          ...prev,
          customMeasures: { ...prev.customMeasures, [name]: measure.duration },
        }));
        return measure.duration;
      }
    } catch (error) {
      console.warn('Failed to create performance measure:', name, error);
    }
    return 0;
  }, []);

  const clearMarks = useCallback((name?: string) => {
    if (typeof window === 'undefined' || !window.performance?.clearMarks) return;

    try {
      performance.clearMarks(name);
      if (name) {
        setMetrics(prev => {
          const newMarks = { ...prev.customMarks };
          delete newMarks[name];
          return { ...prev, customMarks: newMarks };
        });
      } else {
        setMetrics(prev => ({ ...prev, customMarks: {} }));
      }
    } catch (error) {
      console.warn('Failed to clear performance marks:', error);
    }
  }, []);

  const clearMeasures = useCallback((name?: string) => {
    if (typeof window === 'undefined' || !window.performance?.clearMeasures) return;

    try {
      performance.clearMeasures(name);
      if (name) {
        setMetrics(prev => {
          const newMeasures = { ...prev.customMeasures };
          delete newMeasures[name];
          return { ...prev, customMeasures: newMeasures };
        });
      } else {
        setMetrics(prev => ({ ...prev, customMeasures: {} }));
      }
    } catch (error) {
      console.warn('Failed to clear performance measures:', error);
    }
  }, []);

  return {
    metrics,
    mark,
    measure,
    clearMarks,
    clearMeasures,
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { mark, measure } = usePerformanceApi();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    const markName = `${componentName}-render-${renderCountRef.current}`;
    mark(`${markName}-start`);

    return () => {
      mark(`${markName}-end`);
      measure(`${markName}-duration`, `${markName}-start`, `${markName}-end`);
    };
  });

  return { renderCount: renderCountRef.current };
}

// Hook for measuring async operations
export function useAsyncPerformance() {
  const { mark, measure } = usePerformanceApi();

  const measureAsync = useCallback(async <T>(
    name: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    mark(`${name}-start`);
    try {
      const result = await asyncFn();
      mark(`${name}-end`);
      measure(`${name}-duration`, `${name}-start`, `${name}-end`);
      return result;
    } catch (error) {
      mark(`${name}-error`);
      measure(`${name}-error-duration`, `${name}-start`, `${name}-error`);
      throw error;
    }
  }, [mark, measure]);

  return { measureAsync };
}