/**
 * @file error-codes.test.ts
 * @description Tests for centralized error code system
 * @jest-environment node
 */

import {
  ERROR_CATEGORIES,
  ERROR_CODES,
  createStructuredError,
  isErrorCategory,
  getErrorHttpStatus,
  createErrorResponse,
  type ErrorCode,
  type ErrorCategory,
  type StructuredError,
} from '@/lib/error-codes';

describe('ERROR_CATEGORIES', () => {
  it('should contain all expected categories', () => {
    expect(ERROR_CATEGORIES.AUTHENTICATION).toBe('AUTH');
    expect(ERROR_CATEGORIES.AUTHORIZATION).toBe('AUTHZ');
    expect(ERROR_CATEGORIES.VALIDATION).toBe('VALIDATION');
    expect(ERROR_CATEGORIES.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERROR_CATEGORIES.CONFLICT).toBe('CONFLICT');
    expect(ERROR_CATEGORIES.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(ERROR_CATEGORIES.SERVER_ERROR).toBe('SERVER_ERROR');
    expect(ERROR_CATEGORIES.EXTERNAL_SERVICE).toBe('EXTERNAL_SERVICE');
    expect(ERROR_CATEGORIES.GAME_STATE).toBe('GAME_STATE');
    expect(ERROR_CATEGORIES.SESSION).toBe('SESSION');
  });

  it('should have consistent category values', () => {
    const categories = Object.values(ERROR_CATEGORIES);
    const uniqueCategories = new Set(categories);
    expect(categories.length).toBe(uniqueCategories.size);
  });
});

describe('ERROR_CODES', () => {
  it('should contain authentication error codes', () => {
    expect(ERROR_CODES.AUTH_INVALID_TOKEN).toBeDefined();
    expect(ERROR_CODES.AUTH_INVALID_TOKEN.code).toBe('AUTH_001');
    expect(ERROR_CODES.AUTH_INVALID_TOKEN.category).toBe('AUTH');
    expect(ERROR_CODES.AUTH_INVALID_TOKEN.httpStatus).toBe(401);

    expect(ERROR_CODES.AUTH_MISSING_TOKEN).toBeDefined();
    expect(ERROR_CODES.AUTH_SESSION_EXPIRED).toBeDefined();
    expect(ERROR_CODES.AUTH_SESSION_BLACKLISTED).toBeDefined();
  });

  it('should contain authorization error codes', () => {
    expect(ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS).toBeDefined();
    expect(ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS.code).toBe('AUTHZ_001');
    expect(ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS.category).toBe('AUTHZ');
    expect(ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS.httpStatus).toBe(403);

    expect(ERROR_CODES.AUTHZ_RESOURCE_ACCESS_DENIED).toBeDefined();
    expect(ERROR_CODES.AUTHZ_NOT_SESSION_HOST).toBeDefined();
  });

  it('should contain validation error codes', () => {
    expect(ERROR_CODES.VALIDATION_INVALID_INPUT).toBeDefined();
    expect(ERROR_CODES.VALIDATION_INVALID_INPUT.code).toBe('VAL_001');
    expect(ERROR_CODES.VALIDATION_INVALID_INPUT.category).toBe('VALIDATION');
    expect(ERROR_CODES.VALIDATION_INVALID_INPUT.httpStatus).toBe(400);

    expect(ERROR_CODES.VALIDATION_MISSING_REQUIRED_FIELD).toBeDefined();
    expect(ERROR_CODES.VALIDATION_INVALID_FORMAT).toBeDefined();
    expect(ERROR_CODES.VALIDATION_XSS_DETECTED).toBeDefined();
  });

  it('should contain not found error codes', () => {
    expect(ERROR_CODES.NOT_FOUND_RESOURCE).toBeDefined();
    expect(ERROR_CODES.NOT_FOUND_RESOURCE.code).toBe('NF_001');
    expect(ERROR_CODES.NOT_FOUND_RESOURCE.category).toBe('NOT_FOUND');
    expect(ERROR_CODES.NOT_FOUND_RESOURCE.httpStatus).toBe(404);

    expect(ERROR_CODES.NOT_FOUND_SESSION).toBeDefined();
    expect(ERROR_CODES.NOT_FOUND_BOARD).toBeDefined();
    expect(ERROR_CODES.NOT_FOUND_USER).toBeDefined();
  });

  it('should contain conflict error codes', () => {
    expect(ERROR_CODES.CONFLICT_ALREADY_EXISTS).toBeDefined();
    expect(ERROR_CODES.CONFLICT_ALREADY_EXISTS.code).toBe('CONF_001');
    expect(ERROR_CODES.CONFLICT_ALREADY_EXISTS.category).toBe('CONFLICT');
    expect(ERROR_CODES.CONFLICT_ALREADY_EXISTS.httpStatus).toBe(409);

    expect(ERROR_CODES.CONFLICT_ALREADY_IN_SESSION).toBeDefined();
    expect(ERROR_CODES.CONFLICT_SESSION_FULL).toBeDefined();
    expect(ERROR_CODES.CONFLICT_VERSION_MISMATCH).toBeDefined();
  });

  it('should contain rate limit error codes', () => {
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBeDefined();
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED.code).toBe('RL_001');
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED.category).toBe('RATE_LIMIT');
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED.httpStatus).toBe(429);

    expect(ERROR_CODES.RATE_LIMIT_TOO_MANY_REQUESTS).toBeDefined();
  });

  it('should contain game state error codes', () => {
    expect(ERROR_CODES.GAME_INVALID_MOVE).toBeDefined();
    expect(ERROR_CODES.GAME_INVALID_MOVE.code).toBe('GAME_001');
    expect(ERROR_CODES.GAME_INVALID_MOVE.category).toBe('GAME_STATE');
    expect(ERROR_CODES.GAME_INVALID_MOVE.httpStatus).toBe(400);

    expect(ERROR_CODES.GAME_NOT_ACTIVE).toBeDefined();
    expect(ERROR_CODES.GAME_ALREADY_COMPLETED).toBeDefined();
    expect(ERROR_CODES.GAME_INVALID_PASSWORD).toBeDefined();
  });

  it('should contain session error codes', () => {
    expect(ERROR_CODES.SESSION_INVALID_CODE).toBeDefined();
    expect(ERROR_CODES.SESSION_INVALID_CODE.code).toBe('SESS_001');
    expect(ERROR_CODES.SESSION_INVALID_CODE.category).toBe('SESSION');
    expect(ERROR_CODES.SESSION_INVALID_CODE.httpStatus).toBe(400);

    expect(ERROR_CODES.SESSION_EXPIRED).toBeDefined();
  });

  it('should contain server error codes', () => {
    expect(ERROR_CODES.SERVER_INTERNAL_ERROR).toBeDefined();
    expect(ERROR_CODES.SERVER_INTERNAL_ERROR.code).toBe('SRV_001');
    expect(ERROR_CODES.SERVER_INTERNAL_ERROR.category).toBe('SERVER_ERROR');
    expect(ERROR_CODES.SERVER_INTERNAL_ERROR.httpStatus).toBe(500);

    expect(ERROR_CODES.SERVER_DATABASE_ERROR).toBeDefined();
    expect(ERROR_CODES.SERVER_CACHE_ERROR).toBeDefined();
  });

  it('should contain external service error codes', () => {
    expect(ERROR_CODES.EXT_SERVICE_UNAVAILABLE).toBeDefined();
    expect(ERROR_CODES.EXT_SERVICE_UNAVAILABLE.code).toBe('EXT_001');
    expect(ERROR_CODES.EXT_SERVICE_UNAVAILABLE.category).toBe('EXTERNAL_SERVICE');
    expect(ERROR_CODES.EXT_SERVICE_UNAVAILABLE.httpStatus).toBe(503);

    expect(ERROR_CODES.EXT_SERVICE_TIMEOUT).toBeDefined();
  });

  it('should have unique error codes', () => {
    const codes = Object.values(ERROR_CODES).map(error => error.code);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('should have consistent code format', () => {
    Object.values(ERROR_CODES).forEach(error => {
      expect(error.code).toMatch(/^[A-Z]+_\d{3}$/);
      expect(error.category).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.httpStatus).toBeGreaterThan(0);
      expect(error.httpStatus).toBeLessThan(600);
    });
  });

  it('should have appropriate HTTP status codes for categories', () => {
    Object.values(ERROR_CODES).forEach(error => {
      switch (error.category) {
        case 'AUTH':
          expect(error.httpStatus).toBe(401);
          break;
        case 'AUTHZ':
          expect([403, 401]).toContain(error.httpStatus);
          break;
        case 'VALIDATION':
          expect(error.httpStatus).toBe(400);
          break;
        case 'NOT_FOUND':
          expect(error.httpStatus).toBe(404);
          break;
        case 'CONFLICT':
          expect(error.httpStatus).toBe(409);
          break;
        case 'RATE_LIMIT':
          expect(error.httpStatus).toBe(429);
          break;
        case 'SERVER_ERROR':
          expect(error.httpStatus).toBe(500);
          break;
        case 'EXTERNAL_SERVICE':
          expect([502, 503, 504]).toContain(error.httpStatus);
          break;
        case 'GAME_STATE':
          expect([400, 409, 403]).toContain(error.httpStatus);
          break;
        case 'SESSION':
          expect([400, 410]).toContain(error.httpStatus);
          break;
      }
    });
  });
});

describe('createStructuredError', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a structured error with default message', () => {
    const error = createStructuredError('AUTH_INVALID_TOKEN');

    expect(error).toEqual({
      code: 'AUTH_001',
      category: 'AUTH',
      message: 'Invalid or expired authentication token',
      httpStatus: 401,
      timestamp: '2024-01-15T12:00:00.000Z',
    });
  });

  it('should create a structured error with custom message', () => {
    const customMessage = 'Token has expired after 24 hours';
    const error = createStructuredError('AUTH_INVALID_TOKEN', undefined, customMessage);

    expect(error.message).toBe(customMessage);
    expect(error.code).toBe('AUTH_001');
  });

  it('should create a structured error with details', () => {
    const details = { userId: '123', sessionId: 'abc-def' };
    const error = createStructuredError('AUTH_INVALID_TOKEN', details);

    expect(error.details).toEqual(details);
    expect(error.code).toBe('AUTH_001');
  });

  it('should create a structured error with both custom message and details', () => {
    const details = { reason: 'blacklisted' };
    const customMessage = 'Session was manually invalidated';
    const error = createStructuredError('AUTH_SESSION_BLACKLISTED', details, customMessage);

    expect(error.message).toBe(customMessage);
    expect(error.details).toEqual(details);
    expect(error.code).toBe('AUTH_004');
  });

  it('should include timestamp in ISO format', () => {
    const error = createStructuredError('VALIDATION_INVALID_INPUT');
    expect(error.timestamp).toBe('2024-01-15T12:00:00.000Z');
  });

  it('should handle all error codes correctly', () => {
    const errorCodes = Object.keys(ERROR_CODES) as ErrorCode[];
    
    errorCodes.forEach(errorCode => {
      const error = createStructuredError(errorCode);
      const expectedConfig = ERROR_CODES[errorCode];
      
      expect(error.code).toBe(expectedConfig.code);
      expect(error.category).toBe(expectedConfig.category);
      expect(error.message).toBe(expectedConfig.message);
      expect(error.httpStatus).toBe(expectedConfig.httpStatus);
    });
  });
});

describe('isErrorCategory', () => {
  it('should return true for matching category', () => {
    const error: StructuredError = {
      code: 'AUTH_001',
      category: 'AUTH',
      message: 'Test error',
      httpStatus: 401,
    };

    expect(isErrorCategory(error, 'AUTH')).toBe(true);
  });

  it('should return false for non-matching category', () => {
    const error: StructuredError = {
      code: 'AUTH_001',
      category: 'AUTH',
      message: 'Test error',
      httpStatus: 401,
    };

    expect(isErrorCategory(error, 'VALIDATION')).toBe(false);
  });

  it('should work with all categories', () => {
    const categories = Object.values(ERROR_CATEGORIES) as ErrorCategory[];
    
    categories.forEach(category => {
      const error: StructuredError = {
        code: 'TEST_001',
        category,
        message: 'Test error',
        httpStatus: 400,
      };

      expect(isErrorCategory(error, category)).toBe(true);
      
      // Test against different category
      const otherCategories = categories.filter(c => c !== category);
      if (otherCategories.length > 0) {
        const otherCategory = otherCategories[0];
        if (otherCategory) {
          expect(isErrorCategory(error, otherCategory)).toBe(false);
        }
      }
    });
  });
});

describe('getErrorHttpStatus', () => {
  it('should return the HTTP status code from error', () => {
    const error: StructuredError = {
      code: 'AUTH_001',
      category: 'AUTH',
      message: 'Test error',
      httpStatus: 401,
    };

    expect(getErrorHttpStatus(error)).toBe(401);
  });

  it('should work with different status codes', () => {
    const statusCodes = [400, 401, 403, 404, 409, 429, 500, 503];
    
    statusCodes.forEach(status => {
      const error: StructuredError = {
        code: 'TEST_001',
        category: 'SERVER_ERROR',
        message: 'Test error',
        httpStatus: status,
      };

      expect(getErrorHttpStatus(error)).toBe(status);
    });
  });
});

describe('createErrorResponse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a Response object with correct status', () => {
    const response = createErrorResponse('AUTH_INVALID_TOKEN');

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(401);
  });

  it('should create a Response with correct headers', () => {
    const response = createErrorResponse('VALIDATION_INVALID_INPUT');

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should create a Response with structured error in body', async () => {
    const response = createErrorResponse('NOT_FOUND_SESSION');
    const body = await response.json();

    expect(body).toEqual({
      code: 'NF_002',
      category: 'NOT_FOUND',
      message: 'Session not found or has ended',
      httpStatus: 404,
      timestamp: '2024-01-15T12:00:00.000Z',
    });
  });

  it('should create a Response with custom message and details', async () => {
    const details = { sessionId: 'abc-123' };
    const customMessage = 'The requested session could not be found';
    const response = createErrorResponse('NOT_FOUND_SESSION', details, customMessage);
    const body = await response.json();

    expect(body.message).toBe(customMessage);
    expect(body.details).toEqual(details);
    expect(body.code).toBe('NF_002');
  });

  it('should handle all error codes correctly', async () => {
    const errorCodes = Object.keys(ERROR_CODES) as ErrorCode[];
    
    for (const errorCode of errorCodes) {
      const response = createErrorResponse(errorCode);
      const expectedStatus = ERROR_CODES[errorCode].httpStatus;
      
      expect(response.status).toBe(expectedStatus);
      
      const body = await response.json();
      expect(body.code).toBe(ERROR_CODES[errorCode].code);
      expect(body.category).toBe(ERROR_CODES[errorCode].category);
    }
  });
});