/**
 * API Response Handlers Tests
 *
 * Tests for ServiceResponse pattern and API utility functions
 */

import {
  createServiceSuccess,
  createServiceError,
  type ServiceResponse,
  type PaginatedResponse,
} from '@/lib/service-types';
import { ErrorFactory } from '@/lib/error-handler';

describe('API Response Handlers', () => {
  describe('createServiceSuccess', () => {
    it('should create a successful response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createServiceSuccess(data);

      expect(response).toEqual({
        data,
        error: null,
        success: true,
      });
    });

    it('should handle null data', () => {
      const response = createServiceSuccess(null);

      expect(response).toEqual({
        data: null,
        error: null,
        success: true,
      });
    });

    it('should handle array data', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = createServiceSuccess(data);

      expect(response).toEqual({
        data,
        error: null,
        success: true,
      });
    });

    it('should handle primitive data types', () => {
      expect(createServiceSuccess('string')).toEqual({
        data: 'string',
        error: null,
        success: true,
      });

      expect(createServiceSuccess(123)).toEqual({
        data: 123,
        error: null,
        success: true,
      });

      expect(createServiceSuccess(true)).toEqual({
        data: true,
        error: null,
        success: true,
      });
    });
  });

  describe('createServiceError', () => {
    it('should create an error response from string', () => {
      const errorMessage = 'Something went wrong';
      const response = createServiceError(errorMessage);

      expect(response).toEqual({
        data: null,
        error: errorMessage,
        success: false,
      });
    });

    it('should create an error response from Error object', () => {
      const error = new Error('Test error');
      const response = createServiceError(error);

      expect(response).toEqual({
        data: null,
        error: 'Test error',
        success: false,
      });
    });

    it('should handle ArcadiaError', () => {
      const error = ErrorFactory.validation('Invalid input');
      const response = createServiceError(error);

      expect(response).toEqual({
        data: null,
        error: 'Invalid input',
        success: false,
      });
    });

    it('should handle empty error message', () => {
      const response = createServiceError('');

      expect(response).toEqual({
        data: null,
        error: '',
        success: false,
      });
    });
  });

  describe('ServiceResponse Type Guards', () => {
    it('should correctly identify success responses', () => {
      const successResponse: ServiceResponse<string> = {
        data: 'test',
        error: null,
        success: true,
      };

      const errorResponse: ServiceResponse<string> = {
        data: null,
        error: 'error',
        success: false,
      };

      expect(successResponse.success).toBe(true);
      expect(errorResponse.success).toBe(false);
    });

    it('should narrow types correctly with success check', () => {
      const response = createServiceSuccess({ id: '123', name: 'Test' });

      if (response.success) {
        // TypeScript should know data is not null here
        expect(response.data).not.toBeNull();
        expect(response.data!.id).toBe('123');
      }
    });

    it('should narrow types correctly with error check', () => {
      const response = createServiceError<{ id: string }>('Error occurred');

      if (!response.success) {
        // TypeScript should know error is not null here
        expect(response.error).not.toBeNull();
        expect(response.data).toBeNull();
      }
    });
  });

  describe('PaginatedResponse', () => {
    it('should create paginated success response', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response: PaginatedResponse<{ id: string }> = {
        data,
        error: null,
        success: true,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          hasMore: false,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.pagination?.hasMore).toBe(false);
    });

    it('should handle empty paginated results', () => {
      const response: PaginatedResponse<{ id: string }> = {
        data: [],
        error: null,
        success: true,
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false,
        },
      };

      expect(response.data).toHaveLength(0);
      expect(response.pagination?.total).toBe(0);
    });

    it('should handle paginated error response', () => {
      const response: PaginatedResponse<{ id: string }> = {
        data: null,
        error: 'Failed to fetch',
        success: false,
      };

      expect(response.success).toBe(false);
      expect(response.pagination).toBeUndefined();
    });
  });

  describe('Error Response Patterns', () => {
    it('should handle validation errors consistently', () => {
      const validationError = ErrorFactory.validation('Invalid email format');
      const response = createServiceError(validationError);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid email format');
    });

    it('should handle not found errors', () => {
      const notFoundError = ErrorFactory.notFound('User');
      const response = createServiceError(notFoundError);

      expect(response.success).toBe(false);
      expect(response.error).toBe('User not found');
    });

    it('should handle database errors', () => {
      const dbError = new Error('Connection failed');
      const arcadiaError = ErrorFactory.database(dbError);
      const response = createServiceError(arcadiaError);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Database error');
    });

    it('should handle authorization errors', () => {
      const authError = ErrorFactory.unauthorized();
      const response = createServiceError(authError);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized access');
    });
  });

  describe('Response Transformation', () => {
    it('should transform success response data', () => {
      const response = createServiceSuccess({ id: '123', value: 100 });

      // Transform the response
      const transformed = response.success
        ? createServiceSuccess({
            ...response.data!,
            value: response.data!.value * 2,
          })
        : response;

      expect(transformed.success).toBe(true);
      expect(transformed.data?.value).toBe(200);
    });

    it('should chain response transformations', () => {
      const initialResponse = createServiceSuccess([1, 2, 3, 4, 5]);

      // Filter even numbers
      const filtered = initialResponse.success
        ? createServiceSuccess(initialResponse.data!.filter(n => n % 2 === 0))
        : initialResponse;

      // Double the values
      const doubled = filtered.success
        ? createServiceSuccess(filtered.data!.map(n => n * 2))
        : filtered;

      expect(doubled.success).toBe(true);
      expect(doubled.data).toEqual([4, 8]);
    });

    it('should propagate errors through transformations', () => {
      const errorResponse = createServiceError<number[]>('Initial error');

      // Try to transform
      const transformed = errorResponse.success
        ? createServiceSuccess(errorResponse.data!.map(n => n * 2))
        : errorResponse;

      expect(transformed.success).toBe(false);
      expect(transformed.error).toBe('Initial error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined as null in success response', () => {
      const response = createServiceSuccess(undefined);

      expect(response).toEqual({
        data: undefined,
        error: null,
        success: true,
      });
    });

    it('should handle complex nested data structures', () => {
      const complexData = {
        users: [
          { id: '1', profile: { name: 'John', settings: { theme: 'dark' } } },
          { id: '2', profile: { name: 'Jane', settings: { theme: 'light' } } },
        ],
        metadata: {
          total: 2,
          timestamp: new Date().toISOString(),
        },
      };

      const response = createServiceSuccess(complexData);

      expect(response.success).toBe(true);
      expect(response.data?.users).toHaveLength(2);
      expect(response.data?.metadata.total).toBe(2);
    });

    it('should handle circular references in error objects', () => {
      interface CircularError extends Error {
        circular?: unknown;
      }
      const error = new Error('Circular reference') as CircularError;
      error.circular = error; // Create circular reference

      // Should not throw when creating error response
      expect(() => createServiceError(error)).not.toThrow();

      const response = createServiceError(error);
      expect(response.error).toBe('Circular reference');
    });
  });
});
