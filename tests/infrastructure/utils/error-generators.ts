/**
 * Type-safe error generators for infrastructure testing
 * 
 * This module provides factory functions to generate strongly-typed
 * error objects for different failure scenarios, ensuring consistency
 * and type safety in test error simulation.
 */

import type {
  NetworkError,
  ApiError,
  ValidationError,
  InfrastructureError,
  CircuitBreakerError,
  RateLimitError,
  AuthError,
  DataIntegrityError,
  PerformanceError,
  ErrorBoundaryError,
} from '../types/errors';

/**
 * Generate a unique error ID
 */
const generateErrorId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Get human-readable network error message
 */
const getNetworkErrorMessage = (type: NetworkError['type']): string => {
  const messages: Record<NetworkError['type'], string> = {
    timeout: 'Network request timed out',
    connection: 'Failed to establish connection',
    dns: 'DNS resolution failed',
    ssl: 'SSL/TLS handshake failed',
    refused: 'Connection refused by server',
    reset: 'Connection reset by peer',
  };
  return messages[type];
};

/**
 * Get HTTP status text
 */
const getHttpStatusText = (status: number): string => {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return statusTexts[status] || 'Unknown Status';
};

/**
 * Generate a network error
 */
export const generateNetworkError = (
  type: NetworkError['type'],
  options?: Partial<NetworkError>
): NetworkError => {
  return {
    code: `NETWORK_${type.toUpperCase()}`,
    message: options?.message || getNetworkErrorMessage(type),
    timestamp: Date.now(),
    errorId: generateErrorId(),
    type,
    retryable: type !== 'ssl' && type !== 'dns',
    retryAfter: type === 'timeout' ? 5000 : undefined,
    ...options,
  };
};

/**
 * Generate an API error
 */
export const generateApiError = (
  status: number,
  options?: Partial<ApiError>
): ApiError => {
  return {
    code: `HTTP_${status}`,
    message: options?.message || `Request failed with status ${status}`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    status,
    statusText: getHttpStatusText(status),
    url: options?.url || '/api/test',
    method: options?.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };
};

/**
 * Generate a validation error
 */
export const generateValidationError = (
  fields: Record<string, string[]>,
  options?: Partial<ValidationError>
): ValidationError => {
  const fieldCount = Object.keys(fields).length;
  const errorCount = Object.values(fields).reduce((sum, errors) => sum + errors.length, 0);
  
  return {
    code: 'VALIDATION_ERROR',
    message: options?.message || `Validation failed: ${errorCount} errors in ${fieldCount} fields`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    fields,
    summary: `${fieldCount} field(s) have validation errors`,
    ...options,
  };
};

/**
 * Generate an infrastructure error
 */
export const generateInfrastructureError = (
  service: InfrastructureError['service'],
  operation: string,
  options?: Partial<InfrastructureError>
): InfrastructureError => {
  const fatal = options?.fatal ?? false;
  
  return {
    code: `INFRA_${service.toUpperCase()}_ERROR`,
    message: options?.message || `${service} ${operation} operation failed`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    service,
    operation,
    fatal,
    recoverable: !fatal,
    retryStrategy: fatal ? 'none' : 'exponential',
    ...options,
  };
};

/**
 * Generate a circuit breaker error
 */
export const generateCircuitBreakerError = (
  state: CircuitBreakerError['state'],
  options?: Partial<CircuitBreakerError>
): CircuitBreakerError => {
  const now = Date.now();
  
  return {
    code: 'CIRCUIT_BREAKER_OPEN',
    message: options?.message || `Circuit breaker is ${state}`,
    timestamp: now,
    errorId: generateErrorId(),
    state,
    failureCount: options?.failureCount || 5,
    lastFailureTime: options?.lastFailureTime || now,
    nextRetryTime: options?.nextRetryTime || now + 30000,
    threshold: options?.threshold || 5,
    ...options,
  };
};

/**
 * Generate a rate limit error
 */
export const generateRateLimitError = (
  limit: number,
  remaining: number,
  options?: Partial<RateLimitError>
): RateLimitError => {
  const resetTime = options?.resetTime || Date.now() + 60000;
  
  return {
    code: 'RATE_LIMIT_EXCEEDED',
    message: options?.message || `Rate limit exceeded: ${remaining}/${limit} requests remaining`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    limit,
    remaining,
    resetTime,
    window: options?.window || 'sliding',
    ...options,
  };
};

/**
 * Generate an auth error
 */
export const generateAuthError = (
  type: AuthError['type'],
  options?: Partial<AuthError>
): AuthError => {
  const messages: Record<AuthError['type'], string> = {
    unauthorized: 'Authentication required',
    forbidden: 'Access denied',
    expired: 'Session expired',
    invalid: 'Invalid credentials',
  };
  
  const requiresAction: Record<AuthError['type'], AuthError['requiresAction'] | undefined> = {
    unauthorized: 'login',
    forbidden: undefined,
    expired: 'refresh',
    invalid: 'login',
  };
  
  return {
    code: `AUTH_${type.toUpperCase()}`,
    message: options?.message || messages[type],
    timestamp: Date.now(),
    errorId: generateErrorId(),
    type,
    requiresAction: requiresAction[type],
    ...options,
  };
};

/**
 * Generate a data integrity error
 */
export const generateDataIntegrityError = (
  operation: DataIntegrityError['operation'],
  resource: string,
  options?: Partial<DataIntegrityError>
): DataIntegrityError => {
  return {
    code: 'DATA_INTEGRITY_ERROR',
    message: options?.message || `Data integrity check failed for ${operation} on ${resource}`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    operation,
    resource,
    corruptionType: options?.corruptionType || 'invalid',
    ...options,
  };
};

/**
 * Generate a performance error
 */
export const generatePerformanceError = (
  metric: PerformanceError['metric'],
  threshold: number,
  actual: number,
  options?: Partial<PerformanceError>
): PerformanceError => {
  const impactLevel: PerformanceError['impactLevel'] = 
    actual > threshold * 3 ? 'critical' :
    actual > threshold * 2 ? 'high' :
    actual > threshold * 1.5 ? 'medium' : 'low';
  
  return {
    code: `PERFORMANCE_${metric.toUpperCase()}_EXCEEDED`,
    message: options?.message || `${metric} exceeded threshold: ${actual}ms > ${threshold}ms`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    metric,
    threshold,
    actual,
    impactLevel,
    ...options,
  };
};

/**
 * Generate an error boundary error
 */
export const generateErrorBoundaryError = (
  level: ErrorBoundaryError['level'],
  originalError: Error,
  options?: Partial<ErrorBoundaryError>
): ErrorBoundaryError => {
  return {
    code: `ERROR_BOUNDARY_${level.toUpperCase()}`,
    message: options?.message || `Error caught at ${level} boundary: ${originalError.message}`,
    timestamp: Date.now(),
    errorId: generateErrorId(),
    level,
    stack: originalError.stack,
    fallbackRendered: true,
    recoveryAttempted: false,
    ...options,
  };
};

/**
 * Generate a random error for chaos testing
 */
export const generateRandomError = (): 
  | NetworkError 
  | ApiError 
  | InfrastructureError 
  | RateLimitError => {
  const errorTypes = [
    'network',
    'api',
    'infrastructure',
    'rateLimit',
  ] as const;
  
  const type = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  
  switch (type) {
    case 'network': {
      const networkTypes: NetworkError['type'][] = ['timeout', 'connection', 'reset'];
      const selectedType = networkTypes[Math.floor(Math.random() * networkTypes.length)] ?? 'timeout';
      return generateNetworkError(selectedType);
    }
    
    case 'api': {
      const statusCodes = [400, 401, 403, 404, 500, 503];
      const selectedStatus = statusCodes[Math.floor(Math.random() * statusCodes.length)] ?? 500;
      return generateApiError(selectedStatus);
    }
    
    case 'infrastructure': {
      const services: InfrastructureError['service'][] = ['redis', 'supabase', 'sentry'];
      const selectedService = services[Math.floor(Math.random() * services.length)] ?? 'redis';
      return generateInfrastructureError(
        selectedService,
        'operation',
        { fatal: Math.random() > 0.8 }
      );
    }
    
    case 'rateLimit':
      return generateRateLimitError(100, 0);
    
    default:
      // Should never reach here, but TypeScript requires exhaustive case handling
      return generateNetworkError('timeout');
  }
};

/**
 * Error scenario builder for complex test cases
 */
export class ErrorScenarioBuilder {
  private errors: Array<() => Promise<void>> = [];
  
  addNetworkFailure(delay = 0, type: NetworkError['type'] = 'timeout'): this {
    this.errors.push(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw generateNetworkError(type);
    });
    return this;
  }
  
  addApiFailure(delay = 0, status = 500): this {
    this.errors.push(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw generateApiError(status);
    });
    return this;
  }
  
  addInfrastructureFailure(
    delay = 0,
    service: InfrastructureError['service'] = 'redis'
  ): this {
    this.errors.push(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      throw generateInfrastructureError(service, 'connection');
    });
    return this;
  }
  
  async execute(): Promise<Error[]> {
    const results = await Promise.allSettled(this.errors.map(fn => fn()));
    return results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason as Error);
  }
}