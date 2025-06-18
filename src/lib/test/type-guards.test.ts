/**
 * Type Guards Tests
 * 
 * Tests for runtime type checking and type narrowing functions
 */

import { 
  isArcadiaError, 
  isRetryableError, 
  isCriticalError,
  ErrorFactory,
  ErrorCode,
  ErrorSeverity,
  ArcadiaError,
} from '@/lib/error-handler';
import { isSupabaseError, isAuthError } from '@/lib/supabase';

describe('Type Guards', () => {
  describe('Error Type Guards', () => {
    describe('isArcadiaError', () => {
      it('should identify ArcadiaError instances', () => {
        const arcadiaError = ErrorFactory.validation('Test error');
        const regularError = new Error('Regular error');
        const customError = { message: 'Not an error instance' };

        expect(isArcadiaError(arcadiaError)).toBe(true);
        expect(isArcadiaError(regularError)).toBe(false);
        expect(isArcadiaError(customError)).toBe(false);
        expect(isArcadiaError(null)).toBe(false);
        expect(isArcadiaError(undefined)).toBe(false);
        expect(isArcadiaError('string')).toBe(false);
      });

      it('should work with different ArcadiaError types', () => {
        const errors = [
          ErrorFactory.unauthorized(),
          ErrorFactory.forbidden(),
          ErrorFactory.validation('Invalid'),
          ErrorFactory.notFound('Resource'),
          ErrorFactory.database(new Error('DB error')),
          ErrorFactory.rateLimit(),
          ErrorFactory.internal(),
        ];

        errors.forEach(error => {
          expect(isArcadiaError(error)).toBe(true);
        });
      });

      it('should narrow types correctly', () => {
        const error: unknown = ErrorFactory.validation('Test');

        if (isArcadiaError(error)) {
          // TypeScript should know error is ArcadiaError here
          expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
          expect(error.severity).toBe(ErrorSeverity.LOW);
          expect(error.message).toBe('Test');
        }
      });
    });

    describe('isRetryableError', () => {
      it('should identify retryable errors', () => {
        const retryableErrors = [
          ErrorFactory.database(new Error('Connection failed')),
          ErrorFactory.internal('Server error'),
          new ArcadiaError({
            code: ErrorCode.NETWORK_ERROR,
            message: 'Network timeout',
          }),
          new ArcadiaError({
            code: ErrorCode.TIMEOUT_ERROR,
            message: 'Request timeout',
          }),
        ];

        retryableErrors.forEach(error => {
          expect(isRetryableError(error)).toBe(true);
        });
      });

      it('should identify non-retryable errors', () => {
        const nonRetryableErrors = [
          ErrorFactory.validation('Invalid input'),
          ErrorFactory.unauthorized(),
          ErrorFactory.forbidden(),
          ErrorFactory.notFound('User'),
        ];

        nonRetryableErrors.forEach(error => {
          expect(isRetryableError(error)).toBe(false);
        });
      });

      it('should return false for non-ArcadiaError', () => {
        expect(isRetryableError(new Error('Regular error'))).toBe(false);
        expect(isRetryableError('string error')).toBe(false);
        expect(isRetryableError(null)).toBe(false);
        expect(isRetryableError(undefined)).toBe(false);
      });

      it('should respect custom retryable flag', () => {
        const customRetryable = new ArcadiaError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Custom error',
          retryable: true, // Override default
        });

        const customNonRetryable = new ArcadiaError({
          code: ErrorCode.DATABASE_ERROR,
          message: 'Custom DB error',
          retryable: false, // Override default
        });

        expect(isRetryableError(customRetryable)).toBe(true);
        expect(isRetryableError(customNonRetryable)).toBe(false);
      });
    });

    describe('isCriticalError', () => {
      it('should identify critical errors', () => {
        const criticalError = ErrorFactory.internal('Critical failure');
        expect(isCriticalError(criticalError)).toBe(true);
      });

      it('should identify non-critical errors', () => {
        const nonCriticalErrors = [
          ErrorFactory.validation('Invalid'),
          ErrorFactory.unauthorized(),
          ErrorFactory.notFound('Resource'),
          new ArcadiaError({
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Rate limited',
            severity: ErrorSeverity.MEDIUM,
          }),
        ];

        nonCriticalErrors.forEach(error => {
          expect(isCriticalError(error)).toBe(false);
        });
      });

      it('should handle custom severity', () => {
        const customCritical = new ArcadiaError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Critical validation',
          severity: ErrorSeverity.CRITICAL,
        });

        expect(isCriticalError(customCritical)).toBe(true);
      });

      it('should return false for non-ArcadiaError', () => {
        expect(isCriticalError(new Error('Regular'))).toBe(false);
        expect(isCriticalError(null)).toBe(false);
      });
    });
  });

  describe('Supabase Error Guards', () => {
    describe('isSupabaseError', () => {
      it('should identify Supabase errors', () => {
        const supabaseErrors = [
          { message: 'Auth error', __isAuthError: true },
          { message: 'DB error', code: 'PGRST116' },
          { message: 'Storage error', status: 404 },
        ];

        supabaseErrors.forEach(error => {
          expect(isSupabaseError(error)).toBe(true);
        });
      });

      it('should reject non-Supabase errors', () => {
        const nonSupabaseErrors = [
          new Error('Regular error'),
          { notAnError: true },
          'string error',
          null,
          undefined,
        ];

        nonSupabaseErrors.forEach(error => {
          expect(isSupabaseError(error)).toBe(false);
        });
      });
    });

    describe('isAuthError', () => {
      it('should identify auth errors', () => {
        const authError = {
          message: 'Invalid credentials',
          __isAuthError: true,
          code: 'invalid_credentials',
        };

        expect(isAuthError(authError)).toBe(true);
      });

      it('should reject non-auth errors', () => {
        const nonAuthErrors = [
          { message: 'DB error', code: 'PGRST116' },
          new Error('Regular error'),
          null,
        ];

        nonAuthErrors.forEach(error => {
          expect(isAuthError(error)).toBe(false);
        });
      });
    });
  });

  describe('Custom Type Guards', () => {
    // Example of creating custom type guards for the application
    const isValidEmail = (value: unknown): value is string => {
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    };

    const isValidUsername = (value: unknown): value is string => {
      return typeof value === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(value);
    };

    const isValidUUID = (value: unknown): value is string => {
      return typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    };

    describe('isValidEmail', () => {
      it('should validate email addresses', () => {
        const validEmails = [
          'user@example.com',
          'test.user@domain.co.uk',
          'name+tag@example.org',
        ];

        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
          '',
          null,
          123,
        ];

        validEmails.forEach(email => {
          expect(isValidEmail(email)).toBe(true);
        });

        invalidEmails.forEach(email => {
          expect(isValidEmail(email)).toBe(false);
        });
      });
    });

    describe('isValidUsername', () => {
      it('should validate usernames', () => {
        const validUsernames = [
          'user123',
          'test_user',
          'JohnDoe',
          'abc',
        ];

        const invalidUsernames = [
          'ab', // Too short
          'this_username_is_way_too_long', // Too long
          'user-name', // Contains hyphen
          'user name', // Contains space
          'user@123', // Contains @
          '',
          null,
        ];

        validUsernames.forEach(username => {
          expect(isValidUsername(username)).toBe(true);
        });

        invalidUsernames.forEach(username => {
          expect(isValidUsername(username)).toBe(false);
        });
      });
    });

    describe('isValidUUID', () => {
      it('should validate UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          '550E8400-E29B-41D4-A716-446655440000', // Uppercase
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];

        const invalidUUIDs = [
          '123e4567-e89b-12d3-a456', // Too short
          '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
          '123g4567-e89b-12d3-a456-426614174000', // Invalid character 'g'
          'not-a-uuid',
          '',
          null,
        ];

        validUUIDs.forEach(uuid => {
          expect(isValidUUID(uuid)).toBe(true);
        });

        invalidUUIDs.forEach(uuid => {
          expect(isValidUUID(uuid)).toBe(false);
        });
      });
    });
  });

  describe('Type Narrowing with Guards', () => {
    it('should narrow union types correctly', () => {
      type Result = 
        | { success: true; data: string }
        | { success: false; error: Error };

      const isSuccess = (result: Result): result is { success: true; data: string } => {
        return result.success === true;
      };

      const successResult: Result = { success: true, data: 'test' };
      const errorResult: Result = { success: false, error: new Error('fail') };

      if (isSuccess(successResult)) {
        // TypeScript knows data exists here
        expect(successResult.data).toBe('test');
      }

      if (!isSuccess(errorResult)) {
        // TypeScript knows error exists here
        expect(errorResult.error.message).toBe('fail');
      }
    });

    it('should work with discriminated unions', () => {
      type Action = 
        | { type: 'SET_USER'; payload: { id: string; name: string } }
        | { type: 'CLEAR_USER' }
        | { type: 'SET_ERROR'; payload: string };

      const isSetUserAction = (action: Action): action is Action & { type: 'SET_USER' } => {
        return action.type === 'SET_USER';
      };

      const setUserAction: Action = { 
        type: 'SET_USER', 
        payload: { id: '123', name: 'John' } 
      };

      if (isSetUserAction(setUserAction)) {
        // TypeScript knows payload shape here
        expect(setUserAction.payload.id).toBe('123');
        expect(setUserAction.payload.name).toBe('John');
      }
    });
  });
});