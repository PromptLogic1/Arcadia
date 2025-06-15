/**
 * Centralized Error Code System for Arcadia Backend
 *
 * Provides structured error codes for consistent client-side error handling
 * and better debugging capabilities.
 */

// Error categories for structured error handling
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'AUTH',
  AUTHORIZATION: 'AUTHZ',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  GAME_STATE: 'GAME_STATE',
  SESSION: 'SESSION',
} as const;

// Structured error codes with HTTP status mappings
export const ERROR_CODES = {
  // Authentication errors (401)
  AUTH_INVALID_TOKEN: {
    code: 'AUTH_001',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Invalid or expired authentication token',
    httpStatus: 401,
  },
  AUTH_MISSING_TOKEN: {
    code: 'AUTH_002',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Authentication token is required',
    httpStatus: 401,
  },
  AUTH_SESSION_EXPIRED: {
    code: 'AUTH_003',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Session has expired',
    httpStatus: 401,
  },
  AUTH_SESSION_BLACKLISTED: {
    code: 'AUTH_004',
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Session has been invalidated',
    httpStatus: 401,
  },

  // Authorization errors (403)
  AUTHZ_INSUFFICIENT_PERMISSIONS: {
    code: 'AUTHZ_001',
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Insufficient permissions for this operation',
    httpStatus: 403,
  },
  AUTHZ_RESOURCE_ACCESS_DENIED: {
    code: 'AUTHZ_002',
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Access to this resource is denied',
    httpStatus: 403,
  },
  AUTHZ_NOT_SESSION_HOST: {
    code: 'AUTHZ_003',
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Only session host can perform this action',
    httpStatus: 403,
  },

  // Validation errors (400)
  VALIDATION_INVALID_INPUT: {
    code: 'VAL_001',
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Invalid input data provided',
    httpStatus: 400,
  },
  VALIDATION_MISSING_REQUIRED_FIELD: {
    code: 'VAL_002',
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Required field is missing',
    httpStatus: 400,
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VAL_003',
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Data format is invalid',
    httpStatus: 400,
  },
  VALIDATION_XSS_DETECTED: {
    code: 'VAL_004',
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Potentially malicious content detected',
    httpStatus: 400,
  },

  // Not Found errors (404)
  NOT_FOUND_RESOURCE: {
    code: 'NF_001',
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: 'Requested resource not found',
    httpStatus: 404,
  },
  NOT_FOUND_SESSION: {
    code: 'NF_002',
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: 'Session not found or has ended',
    httpStatus: 404,
  },
  NOT_FOUND_BOARD: {
    code: 'NF_003',
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: 'Bingo board not found',
    httpStatus: 404,
  },
  NOT_FOUND_USER: {
    code: 'NF_004',
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: 'User not found',
    httpStatus: 404,
  },

  // Conflict errors (409)
  CONFLICT_ALREADY_EXISTS: {
    code: 'CONF_001',
    category: ERROR_CATEGORIES.CONFLICT,
    message: 'Resource already exists',
    httpStatus: 409,
  },
  CONFLICT_ALREADY_IN_SESSION: {
    code: 'CONF_002',
    category: ERROR_CATEGORIES.CONFLICT,
    message: 'User is already in this session',
    httpStatus: 409,
  },
  CONFLICT_SESSION_FULL: {
    code: 'CONF_003',
    category: ERROR_CATEGORIES.CONFLICT,
    message: 'Session has reached maximum players',
    httpStatus: 409,
  },
  CONFLICT_VERSION_MISMATCH: {
    code: 'CONF_004',
    category: ERROR_CATEGORIES.CONFLICT,
    message: 'Version conflict detected',
    httpStatus: 409,
  },

  // Rate Limiting errors (429)
  RATE_LIMIT_EXCEEDED: {
    code: 'RL_001',
    category: ERROR_CATEGORIES.RATE_LIMIT,
    message: 'Rate limit exceeded',
    httpStatus: 429,
  },
  RATE_LIMIT_TOO_MANY_REQUESTS: {
    code: 'RL_002',
    category: ERROR_CATEGORIES.RATE_LIMIT,
    message: 'Too many requests in a short period',
    httpStatus: 429,
  },

  // Game State errors (400/409)
  GAME_INVALID_MOVE: {
    code: 'GAME_001',
    category: ERROR_CATEGORIES.GAME_STATE,
    message: 'Invalid game move',
    httpStatus: 400,
  },
  GAME_NOT_ACTIVE: {
    code: 'GAME_002',
    category: ERROR_CATEGORIES.GAME_STATE,
    message: 'Game is not in active state',
    httpStatus: 409,
  },
  GAME_ALREADY_COMPLETED: {
    code: 'GAME_003',
    category: ERROR_CATEGORIES.GAME_STATE,
    message: 'Game has already been completed',
    httpStatus: 409,
  },
  GAME_INVALID_PASSWORD: {
    code: 'GAME_004',
    category: ERROR_CATEGORIES.GAME_STATE,
    message: 'Incorrect session password',
    httpStatus: 403,
  },

  // Session errors
  SESSION_INVALID_CODE: {
    code: 'SESS_001',
    category: ERROR_CATEGORIES.SESSION,
    message: 'Invalid session code',
    httpStatus: 400,
  },
  SESSION_EXPIRED: {
    code: 'SESS_002',
    category: ERROR_CATEGORIES.SESSION,
    message: 'Session has expired',
    httpStatus: 410,
  },

  // Server errors (500)
  SERVER_INTERNAL_ERROR: {
    code: 'SRV_001',
    category: ERROR_CATEGORIES.SERVER_ERROR,
    message: 'Internal server error',
    httpStatus: 500,
  },
  SERVER_DATABASE_ERROR: {
    code: 'SRV_002',
    category: ERROR_CATEGORIES.SERVER_ERROR,
    message: 'Database operation failed',
    httpStatus: 500,
  },
  SERVER_CACHE_ERROR: {
    code: 'SRV_003',
    category: ERROR_CATEGORIES.SERVER_ERROR,
    message: 'Cache operation failed',
    httpStatus: 500,
  },

  // External Service errors (502/503)
  EXT_SERVICE_UNAVAILABLE: {
    code: 'EXT_001',
    category: ERROR_CATEGORIES.EXTERNAL_SERVICE,
    message: 'External service unavailable',
    httpStatus: 503,
  },
  EXT_SERVICE_TIMEOUT: {
    code: 'EXT_002',
    category: ERROR_CATEGORIES.EXTERNAL_SERVICE,
    message: 'External service timeout',
    httpStatus: 504,
  },
} as const;

// Type definitions
export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorCategory =
  (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

export interface StructuredError {
  code: string;
  category: ErrorCategory;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
}

/**
 * Creates a structured error response
 */
export function createStructuredError(
  errorCode: ErrorCode,
  details?: Record<string, unknown>,
  customMessage?: string
): StructuredError {
  const errorConfig = ERROR_CODES[errorCode];

  return {
    code: errorConfig.code,
    category: errorConfig.category,
    message: customMessage || errorConfig.message,
    httpStatus: errorConfig.httpStatus,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks if an error is of a specific category
 */
export function isErrorCategory(
  error: StructuredError,
  category: ErrorCategory
): boolean {
  return error.category === category;
}

/**
 * Gets the HTTP status code for a structured error
 */
export function getErrorHttpStatus(error: StructuredError): number {
  return error.httpStatus;
}

/**
 * Creates a Next.js Response with structured error
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  details?: Record<string, unknown>,
  customMessage?: string
): Response {
  const error = createStructuredError(errorCode, details, customMessage);

  return new Response(JSON.stringify(error), {
    status: error.httpStatus,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
