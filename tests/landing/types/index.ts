/**
 * Type definitions for landing page tests
 * Aligned with actual project implementation types
 */

import type {
  MetaTagConfig,
  GeneratedMetaTags,
  ValidationResult,
} from '../../../src/features/landing/utils/seo-meta';

import type {
  AnalyticsEvent as ProjectAnalyticsEvent,
  EventContext,
  ConversionFunnel as ProjectConversionFunnel,
  EventValidation,
} from '../../../src/features/landing/utils/analytics-events';

import type {
  FeatureFlag,
  FlagContext,
  FlagValue,
} from '../../../src/features/landing/utils/feature-flags';

import type { TestWindow } from '../../types/test-types';

/**
 * Extended Performance API types for 2024 Core Web Vitals
 */
interface _PerformanceEventTiming extends PerformanceEntry {
  interactionId?: number;
  processingStart: number;
  processingEnd: number;
  startTime: number;
  duration: number;
}

// Extend the Window interface to include INP measurements
declare global {
  interface Window {
    inpMeasurements?: Array<{ inp: number; target: string; timestamp: number }>;
  }
}

/**
 * Extended Response interface for Playwright timing
 */
interface _PlaywrightResponse {
  timing(): {
    responseEnd: number;
    [key: string]: number;
  } | null;
  headers(): Record<string, string>;
  status(): number;
  ok(): boolean;
  url(): string;
}

/**
 * Core Web Vitals and performance metrics (2024 Standards)
 */
export interface PerformanceMetrics {
  // Navigation Timing metrics
  domContentLoaded: number;
  load: number;
  firstPaint: number;
  firstContentfulPaint: number;

  // Core Web Vitals (2024 Standards)
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  interactionToNextPaint: number; // Replaces FID in 2024
  firstInputDelay: number; // Legacy support

  // Additional metrics
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;

  // Resource metrics
  totalRequests: number;
  totalSize: number;
  cachedRequests: number;

  // Memory metrics
  jsHeapUsed: number;
  jsHeapTotal: number;

  // Performance grading
  performanceGrade: 'Good' | 'Needs Improvement' | 'Poor';
}

/**
 * Viewport configuration for responsive testing
 */
export interface ViewportConfig {
  width: number;
  height: number;
  name: string;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  userAgent?: string;
}

/**
 * Meta tag validation rules
 */
export interface MetaTagValidation {
  property: string;
  content: string | RegExp;
  required: boolean;
  maxLength?: number;
  minLength?: number;
}

/**
 * SEO validation configuration (re-exported from project utilities)
 */
export type SEOMetaTagConfig = MetaTagConfig;
export type SEOGeneratedMetaTags = GeneratedMetaTags;
export type SEOValidationResult = ValidationResult;

export interface SEOValidation {
  title: {
    minLength: number;
    maxLength: number;
    required: string[];
  };
  description: {
    minLength: number;
    maxLength: number;
    required: string[];
  };
  openGraph: MetaTagValidation[];
  twitter: MetaTagValidation[];
  structuredData: {
    types: string[];
    required: boolean;
  };
  jsonLD: {
    schemas: StructuredDataSchema[];
    required: boolean;
  };
  socialMedia: {
    platforms: SocialMediaPlatform[];
    validationRules: SocialMediaValidation[];
  };
}

/**
 * Structured data schema validation
 */
export interface StructuredDataSchema {
  type: string;
  required: string[];
  optional?: string[];
  validation?: Record<string, (value: unknown) => boolean>;
}

/**
 * Social media platform configuration
 */
export interface SocialMediaPlatform {
  name: string;
  metaPrefix: string;
  requiredTags: string[];
  validationRules: Record<string, RegExp | ((value: string) => boolean)>;
}

/**
 * Social media validation rules
 */
export interface SocialMediaValidation {
  platform: string;
  rules: {
    imageSize?: { width: number; height: number };
    titleLength?: { min: number; max: number };
    descriptionLength?: { min: number; max: number };
  };
}

/**
 * Analytics event structure (re-exported from project utilities)
 */
export type AnalyticsEvent = ProjectAnalyticsEvent;

/**
 * Marketing conversion funnel stages (re-exported from project utilities)
 */
export type ConversionFunnel = ProjectConversionFunnel;

export interface ConversionStage {
  name: string;
  url: string;
  events: AnalyticsEvent[];
  expectedMetrics: {
    dropoffRate?: number;
    averageTime?: number;
  };
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  name: string;
  variants: ABTestVariant[];
  metrics: string[];
  duration: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  changes: Array<{
    selector: string;
    property: string;
    value: string;
  }>;
}

/**
 * Bundle analysis results
 */
export interface BundleMetrics {
  mainBundle: number;
  vendorBundle: number;
  cssBundle: number;
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzipSize: number;
  }>;
  assets: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

/**
 * Lighthouse audit results
 */
export interface LighthouseResults {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  metrics: {
    firstContentfulPaint: number;
    speedIndex: number;
    largestContentfulPaint: number;
    timeToInteractive: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
  };
  audits: Record<
    string,
    {
      score: number;
      displayValue?: string;
      description: string;
    }
  >;
}

/**
 * Visual regression test result
 */
export interface VisualRegressionResult {
  testName: string;
  viewport: ViewportConfig;
  baselineImage: string;
  currentImage: string;
  diffImage?: string;
  diffPercentage: number;
  passed: boolean;
  threshold: number;
}

/**
 * Test configuration
 */
export interface LandingTestConfig {
  baseUrl: string;
  viewports: ViewportConfig[];
  networkConditions: NetworkCondition[];
  performanceBudgets: PerformanceBudget[];
  seoValidation: SEOValidation;
  analyticsConfig: {
    enabled: boolean;
    debugMode: boolean;
    expectedEvents: AnalyticsEvent[];
  };
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  metric: keyof PerformanceMetrics;
  budget: number;
  unit: 'ms' | 'bytes' | 'number' | 'score';
  severity: 'error' | 'warning';
}

/**
 * Network condition for performance testing with proper typing
 */
export interface NetworkCondition {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
  offline?: boolean;
}

/**
 * Test result summary
 */
export interface TestResultSummary {
  testName: string;
  timestamp: Date;
  duration: number;
  passed: boolean;
  performance: PerformanceMetrics;
  lighthouse?: LighthouseResults;
  bundleAnalysis?: BundleMetrics;
  visualRegression?: VisualRegressionResult[];
  analytics?: AnalyticsEvent[];
  errors: Array<{
    type: string;
    message: string;
    stack?: string;
  }>;
}

/**
 * Landing page sections for testing
 */
export type LandingPageSection =
  | 'hero'
  | 'features'
  | 'demo'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'footer';

/**
 * Marketing tag types
 */
export type MarketingTagType =
  | 'google-analytics'
  | 'google-tag-manager'
  | 'facebook-pixel'
  | 'linkedin-insight'
  | 'twitter-pixel'
  | 'hotjar'
  | 'segment';

/**
 * Accessibility test result
 */
export interface AccessibilityResult {
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary?: string;
      element?: string;
    }>;
  }>;
  passes: Array<{
    id: string;
    description: string;
    nodes: Array<{
      html: string;
      target: string[];
    }>;
  }>;
  incomplete: Array<{
    id: string;
    description: string;
    nodes: Array<{
      html: string;
      target: string[];
    }>;
  }>;
  wcagLevel: 'A' | 'AA' | 'AAA';
  testEngine: {
    name: string;
    version: string;
  };
  testRunner: {
    name: string;
    version: string;
  };
  url: string;
  timestamp: string;
  summary: {
    totalViolations: number;
    criticalViolations: number;
    seriousViolations: number;
    moderateViolations: number;
    minorViolations: number;
    passedRules: number;
    incompleteRules: number;
  };
}

/**
 * Accessibility testing configuration
 */
export interface AccessibilityConfig {
  wcagLevel: 'A' | 'AA' | 'AAA';
  tags: string[];
  rules: Record<string, { enabled: boolean }>;
  includeTags?: string[];
  excludeTags?: string[];
  disableRules?: string[];
  resultTypes?: Array<'violations' | 'incomplete' | 'passes'>;
}
