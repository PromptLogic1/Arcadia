/**
 * @jest-environment node
 */

import {
  ArcadiaError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory,
  handleError,
  toApiResponse,
  toClientError,
  isArcadiaError,
  isRetryableError,
  isCriticalError,
  withErrorHandling,
  catchAsyncErrors,
} from '../error-handler';
import { NextResponse } from 'next/server';
import { logger } from '../logger';
import { isSupabaseError, isAuthError } from '../supabase';

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../supabase', () => ({
  isSupabaseError: jest.fn(),
  isAuthError: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

describe('ArcadiaError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an error with all required properties', () => {
      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Test validation error',
      });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Test validation error');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata).toEqual({});
      expect(error.userMessage).toBe('Please check your input and try again.');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(error.name).toBe('ArcadiaError');
    });

    it('should accept custom properties', () => {
      const metadata = { userId: '123', component: 'test' };
      const cause = new Error('Original error');

      const error = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database connection failed',
        severity: ErrorSeverity.HIGH,
        metadata,
        userMessage: 'Custom user message',
        statusCode: 503,
        retryable: true,
        cause,
      });

      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata).toBe(metadata);
      expect(error.userMessage).toBe('Custom user message');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(cause);
    });

    it('should set correct default status codes for different error codes', () => {
      const testCases = [
        { code: ErrorCode.UNAUTHORIZED, expectedStatus: 401 },
        { code: ErrorCode.FORBIDDEN, expectedStatus: 403 },
        { code: ErrorCode.RECORD_NOT_FOUND, expectedStatus: 404 },
        { code: ErrorCode.VALIDATION_ERROR, expectedStatus: 400 },
        { code: ErrorCode.DUPLICATE_RECORD, expectedStatus: 409 },
        { code: ErrorCode.RATE_LIMIT_EXCEEDED, expectedStatus: 429 },
        { code: ErrorCode.INTERNAL_SERVER_ERROR, expectedStatus: 500 },
        { code: ErrorCode.NOT_IMPLEMENTED, expectedStatus: 501 },
        { code: ErrorCode.EXTERNAL_SERVICE_ERROR, expectedStatus: 502 },
        { code: ErrorCode.MAINTENANCE_MODE, expectedStatus: 503 },
        { code: ErrorCode.TIMEOUT_ERROR, expectedStatus: 408 },
      ];

      testCases.forEach(({ code, expectedStatus }) => {
        const error = new ArcadiaError({
          code,
          message: 'Test error',
        });

        expect(error.statusCode).toBe(expectedStatus);
      });
    });

    it('should set correct retryable flags for different error codes', () => {
      const retryableErrors = [
        ErrorCode.DATABASE_ERROR,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        ErrorCode.NETWORK_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
        ErrorCode.TIMEOUT_ERROR,
      ];

      const nonRetryableErrors = [
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.DUPLICATE_RECORD,
        ErrorCode.RECORD_NOT_FOUND,
      ];

      retryableErrors.forEach(code => {
        const error = new ArcadiaError({ code, message: 'Test error' });
        expect(error.retryable).toBe(true);
      });

      nonRetryableErrors.forEach(code => {
        const error = new ArcadiaError({ code, message: 'Test error' });
        expect(error.retryable).toBe(false);
      });
    });

    it('should capture stack trace when available', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;
      const mockCaptureStackTrace = jest.fn();
      Error.captureStackTrace = mockCaptureStackTrace;

      new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Test error',
      });

      expect(mockCaptureStackTrace).toHaveBeenCalled();

      Error.captureStackTrace = originalCaptureStackTrace;
    });
  });

  describe('toJSON', () => {
    it('should serialize error properly', () => {
      const metadata = { userId: '123' };
      const cause = new Error('Original error');

      const error = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database error',
        severity: ErrorSeverity.HIGH,
        metadata,
        cause,
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ArcadiaError',
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database error',
        userMessage: 'A database error occurred. Please try again.',
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        retryable: true,
        timestamp: expect.any(String),
        metadata,
        stack: expect.any(String),
        cause: 'Original error',
      });
    });

    it('should serialize error without cause', () => {
      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
      });

      const json = error.toJSON();

      expect(json.cause).toBeUndefined();
    });
  });
});

describe('ErrorFactory', () => {
  describe('unauthorized', () => {
    it('should create unauthorized error with default message', () => {
      const error = ErrorFactory.unauthorized();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized access');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should create unauthorized error with custom message and metadata', () => {
      const metadata = { userId: '123' };
      const error = ErrorFactory.unauthorized('Custom unauthorized message', metadata);

      expect(error.message).toBe('Custom unauthorized message');
      expect(error.metadata).toBe(metadata);
    });
  });

  describe('forbidden', () => {
    it('should create forbidden error', () => {
      const error = ErrorFactory.forbidden();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Forbidden access');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('validation', () => {
    it('should create validation error', () => {
      const error = ErrorFactory.validation('Invalid input format');

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input format');
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('notFound', () => {
    it('should create not found error', () => {
      const error = ErrorFactory.notFound('User');

      expect(error.code).toBe(ErrorCode.RECORD_NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('database', () => {
    it('should create database error with cause', () => {
      const originalError = new Error('Connection timeout');
      const error = ErrorFactory.database(originalError);

      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.message).toBe('Database error: Connection timeout');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('rateLimit', () => {
    it('should create rate limit error', () => {
      const error = ErrorFactory.rateLimit();

      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('gameError', () => {
    it('should create game-specific error', () => {
      const error = ErrorFactory.gameError(
        ErrorCode.BINGO_BOARD_FULL,
        'Board is at capacity'
      );

      expect(error.code).toBe(ErrorCode.BINGO_BOARD_FULL);
      expect(error.message).toBe('Board is at capacity');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('internal', () => {
    it('should create internal server error with default message', () => {
      const error = ErrorFactory.internal();

      expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should create internal server error with custom message and cause', () => {
      const cause = new Error('System failure');
      const error = ErrorFactory.internal('Custom internal error', cause);

      expect(error.message).toBe('Custom internal error');
      expect(error.cause).toBe(cause);
    });
  });
});

describe('ErrorHandler', () => {
  let mockLogger: typeof logger;

  let mockIsSupabaseError: jest.Mock;
  let mockIsAuthError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = logger as jest.Mocked<typeof logger>;
    mockIsSupabaseError = isSupabaseError as unknown as jest.Mock;
    mockIsAuthError = isAuthError as unknown as jest.Mock;
  });

  describe('handle', () => {
    it('should return ArcadiaError as-is', () => {
      const originalError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Test error',
      });

      const result = handleError(originalError);

      expect(result).toBe(originalError);
      // MEDIUM severity errors use logger.error, not logger.warn
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle Supabase auth errors', () => {
      const supabaseError = {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      };

      mockIsSupabaseError.mockReturnValue(true);
      mockIsAuthError.mockReturnValue(true);

      const result = handleError(supabaseError);

      expect(result.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.message).toBe('Invalid login credentials');
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should handle Supabase token expired errors', () => {
      const supabaseError = {
        code: 'token_expired',
        message: 'JWT expired',
      };

      mockIsSupabaseError.mockReturnValue(true);
      mockIsAuthError.mockReturnValue(true);

      const result = handleError(supabaseError);

      expect(result.code).toBe(ErrorCode.TOKEN_EXPIRED);
    });

    it('should handle Supabase duplicate record errors', () => {
      const supabaseError = {
        code: '23505',
        message: 'Unique constraint violation',
      };

      mockIsSupabaseError.mockReturnValue(true);
      mockIsAuthError.mockReturnValue(false);

      const result = handleError(supabaseError);

      expect(result.code).toBe(ErrorCode.DUPLICATE_RECORD);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });

    it('should handle Supabase foreign key violation errors', () => {
      const supabaseError = {
        code: '23503',
        message: 'Foreign key constraint violation',
      };

      mockIsSupabaseError.mockReturnValue(true);
      mockIsAuthError.mockReturnValue(false);

      const result = handleError(supabaseError);

      expect(result.code).toBe(ErrorCode.FOREIGN_KEY_VIOLATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle Supabase table not found errors', () => {
      const supabaseError = {
        code: '42P01',
        message: 'Relation does not exist',
      };

      mockIsSupabaseError.mockReturnValue(true);
      mockIsAuthError.mockReturnValue(false);

      const result = handleError(supabaseError);

      expect(result.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should handle generic TypeError', () => {
      const error = new TypeError('Cannot read property of undefined');

      mockIsSupabaseError.mockReturnValue(false);

      const result = handleError(error);

      expect(result.code).toBe(ErrorCode.CLIENT_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.cause).toBe(error);
    });

    it('should handle generic ReferenceError', () => {
      const error = new ReferenceError('Variable is not defined');

      mockIsSupabaseError.mockReturnValue(false);

      const result = handleError(error);

      expect(result.code).toBe(ErrorCode.CLIENT_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should handle TimeoutError', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';

      mockIsSupabaseError.mockReturnValue(false);

      const result = handleError(error);

      expect(result.code).toBe(ErrorCode.TIMEOUT_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle fetch network errors', () => {
      const error = new Error('fetch failed: network error');

      mockIsSupabaseError.mockReturnValue(false);

      const result = handleError(error);

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle unknown error types', () => {
      const result = handleError('string error');

      expect(result.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(result.message).toBe('Unknown error type');
    });

    it('should log errors with appropriate severity levels', () => {
      // Test LOW severity
      const lowError = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        severity: ErrorSeverity.LOW,
      });

      handleError(lowError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            errorCode: ErrorCode.VALIDATION_ERROR,
            severity: ErrorSeverity.LOW,
          }),
        })
      );

      jest.clearAllMocks();

      // Test MEDIUM severity
      const mediumError = new ArcadiaError({
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        severity: ErrorSeverity.MEDIUM,
      });

      handleError(mediumError);
      expect(mockLogger.error).toHaveBeenCalled();

      jest.clearAllMocks();

      // Test CRITICAL severity
      const criticalError = new ArcadiaError({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Critical system failure',
        severity: ErrorSeverity.CRITICAL,
      });

      handleError(criticalError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('toApiResponse', () => {
    it('should convert error to NextResponse in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      const mockJsonResponse = { json: 'response' };
      NextResponse.json = jest.fn().mockReturnValue(mockJsonResponse);

      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Internal validation message',
        userMessage: 'User-friendly message',
      });

      const result = toApiResponse(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'User-friendly message',
            details: 'Internal validation message',
            retryable: false,
            timestamp: expect.any(String),
          },
        },
        { status: 400 }
      );
      expect(result).toBe(mockJsonResponse);
    });

    it('should convert error to NextResponse in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      const mockJsonResponse = { json: 'response' };
      NextResponse.json = jest.fn().mockReturnValue(mockJsonResponse);

      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Internal validation message',
        userMessage: 'User-friendly message',
      });

      const result = toApiResponse(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'User-friendly message',
            details: undefined,
            retryable: false,
            timestamp: expect.any(String),
          },
        },
        { status: 400 }
      );
      expect(result).toBe(mockJsonResponse);
    });
  });

  describe('toClientError', () => {
    it('should convert error to safe client object', () => {
      const error = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Internal database error',
        userMessage: 'Something went wrong',
      });

      const result = toClientError(error);

      expect(result).toEqual({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Something went wrong',
        retryable: true,
        timestamp: expect.any(String),
      });
    });
  });
});

describe('Type Guards', () => {
  describe('isArcadiaError', () => {
    it('should return true for ArcadiaError instances', () => {
      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Test error',
      });

      expect(isArcadiaError(error)).toBe(true);
    });

    it('should return false for non-ArcadiaError instances', () => {
      expect(isArcadiaError(new Error('Regular error'))).toBe(false);
      expect(isArcadiaError('string error')).toBe(false);
      expect(isArcadiaError(null)).toBe(false);
      expect(isArcadiaError(undefined)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable ArcadiaErrors', () => {
      const error = new ArcadiaError({
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database error',
      });

      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable ArcadiaErrors', () => {
      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation error',
      });

      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for non-ArcadiaErrors', () => {
      expect(isRetryableError(new Error('Regular error'))).toBe(false);
    });
  });

  describe('isCriticalError', () => {
    it('should return true for critical ArcadiaErrors', () => {
      const error = new ArcadiaError({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Critical error',
        severity: ErrorSeverity.CRITICAL,
      });

      expect(isCriticalError(error)).toBe(true);
    });

    it('should return false for non-critical ArcadiaErrors', () => {
      const error = new ArcadiaError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation error',
        severity: ErrorSeverity.LOW,
      });

      expect(isCriticalError(error)).toBe(false);
    });

    it('should return false for non-ArcadiaErrors', () => {
      expect(isCriticalError(new Error('Regular error'))).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('withErrorHandling', () => {
    it('should wrap function and handle errors', async () => {
      const testFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = withErrorHandling(testFunction);

      const result = await wrappedFunction('arg1', 'arg2');

      expect(result).toBe('success');
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should catch and wrap errors', async () => {
      const originalError = new Error('Original error');
      const testFunction = jest.fn().mockRejectedValue(originalError);
      const wrappedFunction = withErrorHandling(testFunction);

      await expect(wrappedFunction()).rejects.toThrow();
      await expect(wrappedFunction()).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        cause: originalError,
      });
    });
  });

  describe('catchAsyncErrors', () => {
    it('should handle sync functions', () => {
      const syncFunction = jest.fn().mockReturnValue('sync result');
      const wrappedFunction = catchAsyncErrors(syncFunction);

      const result = wrappedFunction('arg1');

      expect(result).toBe('sync result');
      expect(syncFunction).toHaveBeenCalledWith('arg1');
    });

    it('should handle async functions', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('async result');
      const wrappedFunction = catchAsyncErrors(asyncFunction);

      const result = await wrappedFunction('arg1');

      expect(result).toBe('async result');
      expect(asyncFunction).toHaveBeenCalledWith('arg1');
    });

    it('should catch async errors', async () => {
      const originalError = new Error('Async error');
      const asyncFunction = jest.fn().mockRejectedValue(originalError);
      const wrappedFunction = catchAsyncErrors(asyncFunction);

      await expect(wrappedFunction()).rejects.toThrow();
      await expect(wrappedFunction()).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        cause: originalError,
      });
    });
  });
});

describe('Error Messages and User Messages', () => {
  it('should have user-friendly messages for all error codes', () => {
    const allErrorCodes = Object.values(ErrorCode);

    allErrorCodes.forEach(code => {
      const error = new ArcadiaError({
        code,
        message: 'Test error',
      });

      expect(error.userMessage).toBeTruthy();
      expect(error.userMessage).not.toBe('Test error'); // Should be user-friendly, not internal message
    });
  });

  it('should provide fallback user message for unknown codes', () => {
    // Test with a mock unknown code
    const error = new ArcadiaError({
      code: 'UNKNOWN_CODE' as ErrorCode,
      message: 'Unknown error',
    });

    expect(error.userMessage).toBe('An unexpected error occurred.');
  });
});