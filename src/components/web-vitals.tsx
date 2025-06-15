'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';

// Performance thresholds based on Web Vitals standards
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

// Custom performance marks for critical user journeys
export function measurePerformance(markName: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(markName);
  }
}

export function measureDuration(
  startMark: string,
  endMark: string,
  measureName: string
) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];

      // Log performance data
      if (measure) {
        console.log(`Performance: ${measureName}`, {
          duration: Math.round(measure.duration),
          start: Math.round(measure.startTime),
        });

        // Send to analytics if needed
        sendToAnalytics({
          metric: measureName,
          value: measure.duration,
          type: 'custom',
        });
      }
    } catch {
      // Ignore if marks don't exist
    }
  }
}

// Send metrics to analytics (Vercel Analytics is already set up)
function sendToAnalytics(data: {
  metric: string;
  value: number;
  rating?: string;
  type?: string;
}) {
  // Vercel Analytics will automatically capture Web Vitals
  // This is for custom metrics or additional processing

  // Set performance budgets
  if (data.type !== 'custom') {
    checkPerformanceBudget(data.metric, data.value);
  }

  // Could also send to custom analytics endpoint
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(data) });
}

// Check if metrics exceed performance budgets
function checkPerformanceBudget(metric: string, value: number) {
  const isValidMetric = (m: string): m is keyof typeof THRESHOLDS => {
    return m in THRESHOLDS;
  };

  if (isValidMetric(metric)) {
    const threshold = THRESHOLDS[metric];

    if (value > threshold.poor) {
      console.error(`⚠️ Performance Budget Exceeded: ${metric}`, {
        value: Math.round(value),
        threshold: threshold.poor,
        severity: 'poor',
      });
    } else if (value > threshold.good) {
      console.warn(`⚡ Performance Can Be Improved: ${metric}`, {
        value: Math.round(value),
        threshold: threshold.good,
        severity: 'needs-improvement',
      });
    }
  }
}

export function WebVitals() {
  useReportWebVitals(metric => {
    const { name, value, rating, id, attribution } = metric;

    // Enhanced logging with attribution
    if (rating === 'poor' || rating === 'needs-improvement') {
      console.warn(`Web Vitals: ${name}`, {
        metric: name,
        value: Math.round(value),
        rating,
        id,
        // Attribution helps identify what caused the poor metric
        attribution: attribution
          ? {
              element: attribution.element,
              url: attribution.url,
              timeToFirstByte: attribution.timeToFirstByte,
              resourceLoadDelay: attribution.resourceLoadDelay,
              resourceLoadDuration: attribution.resourceLoadDuration,
            }
          : undefined,
      });
    }

    // Send to analytics
    sendToAnalytics({
      metric: name,
      value,
      rating,
    });
  });

  // Set up custom performance monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                console.warn('Long Task Detected:', {
                  duration: Math.round(entry.duration),
                  startTime: Math.round(entry.startTime),
                });
              }
            }
          });

          observer.observe({ entryTypes: ['longtask'] });

          return () => observer.disconnect();
        } catch {
          // PerformanceObserver not supported
        }
      }
    }
    // Return undefined when no cleanup is needed
    return undefined;
  }, []);

  return null;
}
