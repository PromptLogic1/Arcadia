/**
 * @jest-environment node
 */

import {
  isErrorWithStatus,
  isError,
  isErrorWithMessage,
  isSupabaseError,
  getErrorMessage,
  getErrorDetails,
  toError,
} from '@/lib/error-guards';

describe('Error Guards', () => {
  describe('isErrorWithStatus', () => {
    it('should return true for objects with numeric status property', () => {
      const errorWithStatus = { status: 404, message: 'Not found' };
      expect(isErrorWithStatus(errorWithStatus)).toBe(true);
    });

    it('should return true for objects with only numeric status property', () => {
      const errorWithStatus = { status: 500 };
      expect(isErrorWithStatus(errorWithStatus)).toBe(true);
    });

    it('should return false for null values', () => {
      expect(isErrorWithStatus(null)).toBe(false);
    });

    it('should return false for undefined values', () => {
      expect(isErrorWithStatus(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isErrorWithStatus('string')).toBe(false);
      expect(isErrorWithStatus(123)).toBe(false);
      expect(isErrorWithStatus(true)).toBe(false);
    });

    it('should return false for objects without status property', () => {
      const obj = { message: 'test' };
      expect(isErrorWithStatus(obj)).toBe(false);
    });

    it('should return false for objects with non-numeric status', () => {
      const obj = { status: 'error', message: 'test' };
      expect(isErrorWithStatus(obj)).toBe(false);
    });

    it('should return false for objects with undefined status', () => {
      const obj = { status: undefined, message: 'test' };
      expect(isErrorWithStatus(obj)).toBe(false);
    });

    it('should handle edge case with zero status', () => {
      const obj = { status: 0 };
      expect(isErrorWithStatus(obj)).toBe(true);
    });

    it('should handle negative status codes', () => {
      const obj = { status: -1 };
      expect(isErrorWithStatus(obj)).toBe(true);
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      const error = new Error('test error');
      expect(isError(error)).toBe(true);
    });

    it('should return true for TypeError instances', () => {
      const error = new TypeError('type error');
      expect(isError(error)).toBe(true);
    });

    it('should return true for RangeError instances', () => {
      const error = new RangeError('range error');
      expect(isError(error)).toBe(true);
    });

    it('should return true for custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('custom error');
      expect(isError(error)).toBe(true);
    });

    it('should return false for null values', () => {
      expect(isError(null)).toBe(false);
    });

    it('should return false for undefined values', () => {
      expect(isError(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isError('string')).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError(true)).toBe(false);
    });

    it('should return false for plain objects', () => {
      const obj = { message: 'test' };
      expect(isError(obj)).toBe(false);
    });

    it('should return false for objects with Error-like structure but not Error instances', () => {
      const errorLike = { message: 'test', stack: 'stack trace' };
      expect(isError(errorLike)).toBe(false);
    });
  });

  describe('isErrorWithMessage', () => {
    it('should return true for objects with string message property', () => {
      const obj = { message: 'test message' };
      expect(isErrorWithMessage(obj)).toBe(true);
    });

    it('should return true for Error instances', () => {
      const error = new Error('test error');
      expect(isErrorWithMessage(error)).toBe(true);
    });

    it('should return false for null values', () => {
      expect(isErrorWithMessage(null)).toBe(false);
    });

    it('should return false for undefined values', () => {
      expect(isErrorWithMessage(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isErrorWithMessage('string')).toBe(false);
      expect(isErrorWithMessage(123)).toBe(false);
      expect(isErrorWithMessage(true)).toBe(false);
    });

    it('should return false for objects without message property', () => {
      const obj = { status: 404 };
      expect(isErrorWithMessage(obj)).toBe(false);
    });

    it('should return false for objects with non-string message', () => {
      const obj = { message: 123 };
      expect(isErrorWithMessage(obj)).toBe(false);
    });

    it('should return false for objects with undefined message', () => {
      const obj = { message: undefined };
      expect(isErrorWithMessage(obj)).toBe(false);
    });

    it('should handle empty string messages', () => {
      const obj = { message: '' };
      expect(isErrorWithMessage(obj)).toBe(true);
    });
  });

  describe('isSupabaseError', () => {
    it('should return true for objects with string message property', () => {
      const error = {
        message: 'Database error',
        code: '23505',
        details: 'duplicate key violation',
        hint: 'Use unique values',
      };
      expect(isSupabaseError(error)).toBe(true);
    });

    it('should return true for objects with only message property', () => {
      const error = { message: 'Simple error' };
      expect(isSupabaseError(error)).toBe(true);
    });

    it('should return true for partial Supabase errors', () => {
      const error = { message: 'Error', code: '42P01' };
      expect(isSupabaseError(error)).toBe(true);
    });

    it('should return false for null values', () => {
      expect(isSupabaseError(null)).toBe(false);
    });

    it('should return false for undefined values', () => {
      expect(isSupabaseError(undefined)).toBe(false);
    });

    it('should return false for primitive types', () => {
      expect(isSupabaseError('string')).toBe(false);
      expect(isSupabaseError(123)).toBe(false);
      expect(isSupabaseError(true)).toBe(false);
    });

    it('should return false for objects without message property', () => {
      const obj = { code: '23505', details: 'error details' };
      expect(isSupabaseError(obj)).toBe(false);
    });

    it('should return false for objects with non-string message', () => {
      const obj = { message: 123, code: '23505' };
      expect(isSupabaseError(obj)).toBe(false);
    });

    it('should handle empty string messages', () => {
      const error = { message: '', code: '23505' };
      expect(isSupabaseError(error)).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instances', () => {
      const error = new Error('test error message');
      expect(getErrorMessage(error)).toBe('test error message');
    });

    it('should extract message from objects with message property', () => {
      const obj = { message: 'custom error message' };
      expect(getErrorMessage(obj)).toBe('custom error message');
    });

    it('should return string values directly', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    it('should return default message for null', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    });

    it('should return default message for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    });

    it('should return default message for numbers', () => {
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    });

    it('should return default message for booleans', () => {
      expect(getErrorMessage(true)).toBe('An unexpected error occurred');
    });

    it('should return default message for objects without message', () => {
      const obj = { status: 404 };
      expect(getErrorMessage(obj)).toBe('An unexpected error occurred');
    });

    it('should handle empty string messages', () => {
      const obj = { message: '' };
      expect(getErrorMessage(obj)).toBe('');
    });

    it('should handle empty string values', () => {
      expect(getErrorMessage('')).toBe('');
    });

    it('should prioritize Error instance over message property when both exist', () => {
      const error = new Error('error instance message');
      // Add message property manually (shouldn't happen in practice but testing precedence)
      (error as any)['customMessage'] = 'custom message';
      expect(getErrorMessage(error)).toBe('error instance message');
    });
  });

  describe('getErrorDetails', () => {
    it('should extract details from objects with status property', () => {
      const error = { status: 404, message: 'Not found' };
      const details = getErrorDetails(error);
      expect(details).toEqual({
        status: 404,
        message: 'Not found',
      });
    });

    it('should handle status objects without message', () => {
      const error = { status: 500 };
      const details = getErrorDetails(error);
      expect(details).toEqual({
        status: 500,
        message: 'Unknown error',
      });
    });

    it('should extract details from Supabase errors', () => {
      const error = {
        message: 'Database constraint violation',
        code: '23505',
        details: 'Key already exists',
        hint: 'Use a different key',
      };
      const details = getErrorDetails(error);
      expect(details).toEqual({
        message: 'Database constraint violation',
        code: '23505',
        details: 'Key already exists',
        hint: 'Use a different key',
      });
    });

    it('should handle partial Supabase errors', () => {
      const error = { message: 'Simple database error' };
      const details = getErrorDetails(error);
      expect(details).toEqual({
        message: 'Simple database error',
        code: undefined,
        details: undefined,
        hint: undefined,
      });
    });

    it('should extract details from Error instances', () => {
      const error = new TypeError('Type mismatch');
      error.stack = 'Error stack trace';
      const details = getErrorDetails(error);
      // Error instances are treated as Supabase errors because they have message property
      expect(details).toEqual({
        message: 'Type mismatch',
        code: undefined,
        details: undefined,
        hint: undefined,
      });
    });

    it('should handle Error instances without stack', () => {
      const error = new Error('Simple error');
      delete error.stack;
      const details = getErrorDetails(error);
      // Error instances are treated as Supabase errors because they have message property
      expect(details).toEqual({
        message: 'Simple error',
        code: undefined,
        details: undefined,
        hint: undefined,
      });
    });

    it('should convert primitive values to string', () => {
      expect(getErrorDetails('string error')).toEqual({ error: 'string error' });
      expect(getErrorDetails(123)).toEqual({ error: '123' });
      expect(getErrorDetails(true)).toEqual({ error: 'true' });
      expect(getErrorDetails(null)).toEqual({ error: 'null' });
      expect(getErrorDetails(undefined)).toEqual({ error: 'undefined' });
    });

    it('should handle complex objects', () => {
      const obj = { custom: 'property', nested: { value: 42 } };
      const details = getErrorDetails(obj);
      expect(details).toEqual({ error: '[object Object]' });
    });

    it('should prioritize status over Supabase error format', () => {
      const error = {
        status: 400,
        message: 'Bad request',
        code: '22P02',
        details: 'Invalid input',
      };
      const details = getErrorDetails(error);
      expect(details).toEqual({
        status: 400,
        message: 'Bad request',
      });
    });

    it('should prioritize Supabase format over Error instance when both applicable', () => {
      const error = new Error('Error message');
      // Add Supabase-like properties
      (error as any)['code'] = '23505';
      (error as any)['details'] = 'Constraint violation';
      
      const details = getErrorDetails(error);
      // Error instances with message property are treated as Supabase errors
      expect(details).toEqual({
        message: 'Error message',
        code: '23505',
        details: 'Constraint violation',
        hint: undefined,
      });
    });

    it('should extract Error details when message property is not a string', () => {
      const error = new Error('Original message');
      // Override message property to make isSupabaseError return false
      Object.defineProperty(error, 'message', {
        value: 123, // Non-string value
        writable: true,
        enumerable: true,
        configurable: true,
      });
      error.stack = 'Test stack trace';
      
      const details = getErrorDetails(error);
      // Should be treated as Error instance since message is not a string
      expect(details).toEqual({
        name: 'Error',
        message: 123,
        stack: 'Test stack trace',
      });
    });
  });

  describe('toError', () => {
    it('should return Error instances unchanged', () => {
      const error = new Error('original error');
      const result = toError(error);
      expect(result).toBe(error);
      expect(result.message).toBe('original error');
    });

    it('should return TypeError instances unchanged', () => {
      const error = new TypeError('type error');
      const result = toError(error);
      expect(result).toBe(error);
      expect(result.message).toBe('type error');
    });

    it('should convert objects with message to Error', () => {
      const obj = { message: 'custom error message' };
      const result = toError(obj);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('custom error message');
      expect(result).not.toBe(obj);
    });

    it('should convert strings to Error', () => {
      const str = 'string error message';
      const result = toError(str);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error message');
    });

    it('should convert null to Error with string representation', () => {
      const result = toError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });

    it('should convert undefined to Error with string representation', () => {
      const result = toError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('undefined');
    });

    it('should convert numbers to Error with string representation', () => {
      const result = toError(123);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('123');
    });

    it('should convert booleans to Error with string representation', () => {
      const result = toError(true);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('true');
    });

    it('should convert objects without message to Error with string representation', () => {
      const obj = { status: 404, custom: 'property' };
      const result = toError(obj);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('should handle empty strings', () => {
      const result = toError('');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('');
    });

    it('should handle complex objects with message', () => {
      const obj = {
        message: 'complex error',
        status: 500,
        nested: { value: 42 },
      };
      const result = toError(obj);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('complex error');
    });

    it('should create new Error instances for message objects', () => {
      const obj = { message: 'test message' };
      const result1 = toError(obj);
      const result2 = toError(obj);
      expect(result1).not.toBe(result2);
      expect(result1.message).toBe(result2.message);
    });
  });
});