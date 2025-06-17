/**
 * Type-safe error definitions for infrastructure testing
 * 
 * This module provides strongly-typed error interfaces for different
 * failure scenarios in infrastructure tests, ensuring type safety
 * and consistency across all test files.
 */

/**
 * Base error interface that all specific errors extend
 */
export interface BaseError {
  code: string;
  message: string;
  timestamp: number;
  errorId: string;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Network-related errors
 */
export interface NetworkError extends BaseError {
  type: 'timeout' | 'connection' | 'dns' | 'ssl' | 'refused' | 'reset';
  retryable: boolean;
  retryAfter?: number;
  endpoint?: string;
  method?: string;
  latency?: number;
}

/**
 * API/HTTP errors with full response details
 */
export interface ApiError extends BaseError {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: unknown;
  url: string;
  method: string;
  requestId?: string;
}

/**
 * Validation errors with field-specific messages
 */
export interface ValidationError extends BaseError {
  fields: Record<string, string[]>;
  summary?: string;
}

/**
 * Infrastructure service errors
 */
export interface InfrastructureError extends BaseError {
  service: 'redis' | 'supabase' | 'sentry' | 'upstash' | 'vercel';
  operation: string;
  fatal: boolean;
  recoverable: boolean;
  retryStrategy?: 'exponential' | 'linear' | 'none';
}

/**
 * Circuit breaker state errors
 */
export interface CircuitBreakerError extends BaseError {
  state: 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
  threshold: number;
}

/**
 * Rate limiting errors
 */
export interface RateLimitError extends BaseError {
  limit: number;
  remaining: number;
  resetTime: number;
  window: 'sliding' | 'fixed' | 'token-bucket';
  identifier?: string;
}

/**
 * Authentication/Authorization errors
 */
export interface AuthError extends BaseError {
  type: 'unauthorized' | 'forbidden' | 'expired' | 'invalid';
  realm?: string;
  requiresAction?: 'login' | 'refresh' | 'mfa' | 'verify';
}

/**
 * Data integrity errors
 */
export interface DataIntegrityError extends BaseError {
  operation: 'read' | 'write' | 'update' | 'delete';
  resource: string;
  expectedState?: unknown;
  actualState?: unknown;
  corruptionType?: 'missing' | 'invalid' | 'inconsistent';
}

/**
 * Performance/Timeout errors
 */
export interface PerformanceError extends BaseError {
  metric: 'latency' | 'throughput' | 'cpu' | 'memory';
  threshold: number;
  actual: number;
  duration?: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error boundary specific errors
 */
export interface ErrorBoundaryError extends BaseError {
  level: 'page' | 'layout' | 'component' | 'root';
  componentStack?: string;
  errorBoundaryId?: string;
  fallbackRendered: boolean;
  recoveryAttempted: boolean;
}

/**
 * Type guards for error types
 */
export const isNetworkError = (error: BaseError): error is NetworkError => {
  return 'type' in error && 'retryable' in error;
};

export const isApiError = (error: BaseError): error is ApiError => {
  return 'status' in error && 'statusText' in error;
};

export const isValidationError = (error: BaseError): error is ValidationError => {
  return 'fields' in error;
};

export const isInfrastructureError = (error: BaseError): error is InfrastructureError => {
  return 'service' in error && 'operation' in error;
};

export const isCircuitBreakerError = (error: BaseError): error is CircuitBreakerError => {
  return 'state' in error && 'failureCount' in error;
};

export const isRateLimitError = (error: BaseError): error is RateLimitError => {
  return 'limit' in error && 'remaining' in error;
};

export const isAuthError = (error: BaseError): error is AuthError => {
  return 'type' in error && 'requiresAction' in error;
};

export const isDataIntegrityError = (error: BaseError): error is DataIntegrityError => {
  return 'operation' in error && 'resource' in error;
};

export const isPerformanceError = (error: BaseError): error is PerformanceError => {
  return 'metric' in error && 'threshold' in error;
};

export const isErrorBoundaryError = (error: BaseError): error is ErrorBoundaryError => {
  return 'level' in error && 'fallbackRendered' in error;
};

/**
 * Error severity levels for prioritization
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Get error severity based on error type and properties
 */
export const getErrorSeverity = (error: BaseError): ErrorSeverity => {
  if (isInfrastructureError(error) && error.fatal) return 'critical';
  if (isErrorBoundaryError(error) && error.level === 'root') return 'critical';
  if (isDataIntegrityError(error)) return 'high';
  if (isAuthError(error) && error.type === 'expired') return 'medium';
  if (isRateLimitError(error)) return 'low';
  if (isNetworkError(error) && error.retryable) return 'low';
  
  return 'medium';
};

/**
 * Error aggregation for reporting
 */
export interface ErrorReport {
  errors: BaseError[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    criticalErrors: BaseError[];
  };
  timestamp: number;
  duration: number;
}

/**
 * Create an error report from a list of errors
 */
export const createErrorReport = (
  errors: BaseError[],
  duration: number
): ErrorReport => {
  const byType: Record<string, number> = {};
  const bySeverity: Record<ErrorSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  const criticalErrors: BaseError[] = [];

  errors.forEach(error => {
    // Count by type
    const type = error.code.split('_')[0];
    byType[type] = (byType[type] || 0) + 1;

    // Count by severity
    const severity = getErrorSeverity(error);
    bySeverity[severity]++;

    // Collect critical errors
    if (severity === 'critical') {
      criticalErrors.push(error);
    }
  });

  return {
    errors,
    summary: {
      total: errors.length,
      byType,
      bySeverity,
      criticalErrors,
    },
    timestamp: Date.now(),
    duration,
  };
};