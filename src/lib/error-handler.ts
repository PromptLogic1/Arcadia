/**
 * Comprehensive Error Handling Utility for Arcadia
 * 
 * This module provides a unified error handling system that standardizes
 * error management across the entire application.
 */

import { logger, type LogContext } from './logger';
import { isSupabaseError, isAuthError, type SupabaseError } from './supabase';
import { NextResponse } from 'next/server';

// =============================================================================
// ERROR TYPES AND INTERFACES
// =============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',

  // Business Logic
  BINGO_BOARD_FULL = 'BINGO_BOARD_FULL',
  SESSION_ALREADY_STARTED = 'SESSION_ALREADY_STARTED',
  INVALID_GAME_STATE = 'INVALID_GAME_STATE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // External Services
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',

  // Client
  CLIENT_ERROR = 'CLIENT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorMetadata {
  userId?: string;
  sessionId?: string;
  boardId?: string;
  component?: string;
  feature?: string;
  apiRoute?: string;
  method?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  stackTrace?: string;
  additionalContext?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ArcadiaErrorOptions {
  code: ErrorCode;
  message: string;
  severity?: ErrorSeverity;
  metadata?: ErrorMetadata;
  cause?: Error;
  userMessage?: string;
  statusCode?: number;
  retryable?: boolean;
}

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class ArcadiaError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly metadata: ErrorMetadata;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly timestamp: string;
  public readonly cause?: Error;

  constructor(options: ArcadiaErrorOptions) {
    super(options.message);
    
    this.name = 'ArcadiaError';
    this.code = options.code;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.metadata = options.metadata || {};
    this.userMessage = options.userMessage || this.getDefaultUserMessage(options.code);
    this.statusCode = options.statusCode || this.getDefaultStatusCode(options.code);
    this.retryable = options.retryable ?? this.getDefaultRetryable(options.code);
    this.timestamp = new Date().toISOString();
    this.cause = options.cause;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ArcadiaError.prototype);

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArcadiaError);
    }
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const userMessages: Record<ErrorCode, string> = {
      [ErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
      [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      [ErrorCode.INVALID_CREDENTIALS]: 'Invalid username or password.',
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.INVALID_INPUT]: 'Please check your input and try again.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
      [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
      [ErrorCode.RECORD_NOT_FOUND]: 'The requested item was not found.',
      [ErrorCode.DUPLICATE_RECORD]: 'This item already exists.',
      [ErrorCode.FOREIGN_KEY_VIOLATION]: 'Cannot perform this action due to related data.',
      [ErrorCode.BINGO_BOARD_FULL]: 'This bingo board is full.',
      [ErrorCode.SESSION_ALREADY_STARTED]: 'This session has already started.',
      [ErrorCode.INVALID_GAME_STATE]: 'Invalid game state. Please refresh and try again.',
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have sufficient permissions.',
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service is temporarily unavailable.',
      [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
      [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal error occurred. Please try again.',
      [ErrorCode.NOT_IMPLEMENTED]: 'This feature is not yet implemented.',
      [ErrorCode.MAINTENANCE_MODE]: 'The system is under maintenance. Please try again later.',
      [ErrorCode.CLIENT_ERROR]: 'A client error occurred. Please refresh and try again.',
      [ErrorCode.TIMEOUT_ERROR]: 'The request timed out. Please try again.',
    };

    return userMessages[code] || 'An unexpected error occurred.';
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    const statusCodes: Record<ErrorCode, number> = {
      [ErrorCode.UNAUTHORIZED]: 401,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.TOKEN_EXPIRED]: 401,
      [ErrorCode.INVALID_CREDENTIALS]: 401,
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INVALID_INPUT]: 400,
      [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
      [ErrorCode.DATABASE_ERROR]: 500,
      [ErrorCode.RECORD_NOT_FOUND]: 404,
      [ErrorCode.DUPLICATE_RECORD]: 409,
      [ErrorCode.FOREIGN_KEY_VIOLATION]: 409,
      [ErrorCode.BINGO_BOARD_FULL]: 409,
      [ErrorCode.SESSION_ALREADY_STARTED]: 409,
      [ErrorCode.INVALID_GAME_STATE]: 409,
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
      [ErrorCode.NETWORK_ERROR]: 503,
      [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
      [ErrorCode.NOT_IMPLEMENTED]: 501,
      [ErrorCode.MAINTENANCE_MODE]: 503,
      [ErrorCode.CLIENT_ERROR]: 400,
      [ErrorCode.TIMEOUT_ERROR]: 408,
    };

    return statusCodes[code] || 500;
  }

  private getDefaultRetryable(code: ErrorCode): boolean {
    const retryableErrors = [
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCode.TIMEOUT_ERROR,
    ];

    return retryableErrors.includes(code);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp,
      metadata: this.metadata,
      stack: this.stack,
      ...(this.cause && { cause: this.cause.message }),
    };
  }
}

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

export class ErrorFactory {
  static unauthorized(message?: string, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.UNAUTHORIZED,
      message: message || 'Unauthorized access',
      severity: ErrorSeverity.HIGH,
      metadata,
    });
  }

  static forbidden(message?: string, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.FORBIDDEN,
      message: message || 'Forbidden access',
      severity: ErrorSeverity.HIGH,
      metadata,
    });
  }

  static validation(message: string, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      severity: ErrorSeverity.LOW,
      metadata,
    });
  }

  static notFound(resource: string, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.RECORD_NOT_FOUND,
      message: `${resource} not found`,
      severity: ErrorSeverity.LOW,
      metadata,
    });
  }

  static database(error: Error, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.DATABASE_ERROR,
      message: `Database error: ${error.message}`,
      severity: ErrorSeverity.HIGH,
      metadata,
      cause: error,
    });
  }

  static rateLimit(metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      severity: ErrorSeverity.MEDIUM,
      metadata,
    });
  }

  static gameError(code: ErrorCode, message: string, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code,
      message,
      severity: ErrorSeverity.MEDIUM,
      metadata,
    });
  }

  static internal(message?: string, cause?: Error, metadata?: ErrorMetadata): ArcadiaError {
    return new ArcadiaError({
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: message || 'Internal server error',
      severity: ErrorSeverity.CRITICAL,
      metadata,
      cause,
    });
  }
}

// =============================================================================
// ERROR HANDLER CLASS
// =============================================================================

class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log an error, returning a standardized ArcadiaError
   */
  handle(error: unknown, context?: LogContext): ArcadiaError {
    let arcadiaError: ArcadiaError;

    if (error instanceof ArcadiaError) {
      arcadiaError = error;
    } else if (isSupabaseError(error)) {
      arcadiaError = this.handleSupabaseError(error, context);
    } else if (error instanceof Error) {
      arcadiaError = this.handleGenericError(error, context);
    } else {
      arcadiaError = ErrorFactory.internal(
        'Unknown error type',
        undefined,
        context ? { ...context } : undefined
      );
    }

    // Log the error
    this.logError(arcadiaError, context);

    return arcadiaError;
  }

  /**
   * Handle Supabase-specific errors
   */
  private handleSupabaseError(error: SupabaseError, context?: LogContext): ArcadiaError {
    let code: ErrorCode;
    let severity: ErrorSeverity;

    if (isAuthError(error)) {
      if (error.code?.includes('invalid_credentials')) {
        code = ErrorCode.INVALID_CREDENTIALS;
      } else if (error.code?.includes('token_expired')) {
        code = ErrorCode.TOKEN_EXPIRED;
      } else {
        code = ErrorCode.UNAUTHORIZED;
      }
      severity = ErrorSeverity.HIGH;
    } else if (error.code?.includes('23505')) { // Unique constraint violation
      code = ErrorCode.DUPLICATE_RECORD;
      severity = ErrorSeverity.LOW;
    } else if (error.code?.includes('23503')) { // Foreign key violation
      code = ErrorCode.FOREIGN_KEY_VIOLATION;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.code?.includes('42P01')) { // Table doesn't exist
      code = ErrorCode.DATABASE_ERROR;
      severity = ErrorSeverity.CRITICAL;
    } else {
      code = ErrorCode.DATABASE_ERROR;
      severity = ErrorSeverity.HIGH;
    }

    return new ArcadiaError({
      code,
      message: error.message,
      severity,
      metadata: context ? { ...context } : undefined,
      cause: error,
    });
  }

  /**
   * Handle generic JavaScript errors
   */
  private handleGenericError(error: Error, context?: LogContext): ArcadiaError {
    let code: ErrorCode;
    let severity: ErrorSeverity;

    if (error.name === 'TypeError') {
      code = ErrorCode.CLIENT_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.name === 'ReferenceError') {
      code = ErrorCode.CLIENT_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (error.name === 'TimeoutError') {
      code = ErrorCode.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else {
      code = ErrorCode.INTERNAL_SERVER_ERROR;
      severity = ErrorSeverity.HIGH;
    }

    return new ArcadiaError({
      code,
      message: error.message,
      severity,
      metadata: context ? { ...context } : undefined,
      cause: error,
    });
  }

  /**
   * Log error with appropriate level based on severity
   */
  private logError(error: ArcadiaError, context?: LogContext): void {
    const logContext: LogContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        errorCode: error.code,
        severity: error.severity,
        statusCode: error.statusCode,
        retryable: error.retryable,
        timestamp: error.timestamp,
        ...error.metadata,
      },
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.warn(error.message, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.error(error.message, error.cause || error, logContext);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        logger.error(error.message, error.cause || error, logContext);
        // In production, you might want to send critical errors to monitoring
        this.sendToMonitoring(error);
        break;
    }
  }

  /**
   * Send critical errors to monitoring service
   */
  private sendToMonitoring(error: ArcadiaError): void {
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      // Placeholder for monitoring service integration
      // In a real scenario, this would send to Sentry, DataDog, etc.
      console.error('[ErrorHandler] Critical error for monitoring:', error.toJSON());
    }
  }

  /**
   * Convert ArcadiaError to NextResponse for API routes
   */
  toApiResponse(error: ArcadiaError): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.userMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          retryable: error.retryable,
          timestamp: error.timestamp,
        },
      },
      { status: error.statusCode }
    );
  }

  /**
   * Create a safe error object for client-side consumption
   */
  toClientError(error: ArcadiaError): {
    code: string;
    message: string;
    retryable: boolean;
    timestamp: string;
  } {
    return {
      code: error.code,
      message: error.userMessage,
      retryable: error.retryable,
      timestamp: error.timestamp,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

const errorHandler = ErrorHandler.getInstance();

export const handleError = (error: unknown, context?: LogContext): ArcadiaError => {
  return errorHandler.handle(error, context);
};

export const toApiResponse = (error: unknown, context?: LogContext): NextResponse => {
  const arcadiaError = errorHandler.handle(error, context);
  return errorHandler.toApiResponse(arcadiaError);
};

export const toClientError = (error: unknown, context?: LogContext) => {
  const arcadiaError = errorHandler.handle(error, context);
  return errorHandler.toClientError(arcadiaError);
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isArcadiaError = (error: unknown): error is ArcadiaError => {
  return error instanceof ArcadiaError;
};

export const isRetryableError = (error: unknown): boolean => {
  return isArcadiaError(error) ? error.retryable : false;
};

export const isCriticalError = (error: unknown): boolean => {
  return isArcadiaError(error) ? error.severity === ErrorSeverity.CRITICAL : false;
};

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, {
        component: 'withErrorHandling',
        metadata: { functionName: fn.name },
      });
    }
  };
};

export const catchAsyncErrors = (fn: (...args: unknown[]) => unknown) => {
  return (...args: unknown[]) => {
    const result = fn(...args);
    if (result instanceof Promise) {
      return result.catch((error: unknown) => {
        throw handleError(error, {
          component: 'catchAsyncErrors',
          metadata: { functionName: fn.name },
        });
      });
    }
    return result;
  };
};

// Export the singleton instance for direct use
export default errorHandler;