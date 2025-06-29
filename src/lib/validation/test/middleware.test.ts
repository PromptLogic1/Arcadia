import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateRequestBody,
  validateQueryParams,
  validateRouteParams,
  isValidationSuccess,
  isValidationError,
} from '../middleware';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/logger');
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequestBody', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().positive(),
    });

    it('validates valid request body successfully', async () => {
      const validData = { name: 'John', age: 25 };
      
      // Mock the request.json() method to return our valid data
      const request = {
        json: jest.fn().mockResolvedValue(validData),
      } as any as Request;

      const result = await validateRequestBody(request, testSchema);

      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data).toEqual(validData);
      }
    });

    it('returns validation error for invalid data', async () => {
      const invalidData = { name: 'Jo', age: -5 };
      
      // Mock the request.json() method to return our invalid data
      const request = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as any as Request;

      const result = await validateRequestBody(request, testSchema);

      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        const errorResponse = result.error;
        expect(errorResponse.status).toBe(400);
        const responseData = await errorResponse.json();
        expect(responseData.error).toBe('Validation failed');
        expect(responseData.details).toEqual([
          {
            path: 'name',
            message: 'String must contain at least 3 character(s)',
          },
          { path: 'age', message: 'Number must be greater than 0' },
        ]);
      }
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request validation failed',
        {
          metadata: expect.objectContaining({
            validationType: 'body',
            validationErrors: expect.any(Array),
          }),
        }
      );
    });

    it('handles JSON parsing errors', async () => {
      // Mock the request.json() method to throw a JSON parsing error
      const request = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      } as any as Request;

      const result = await validateRequestBody(request, testSchema);

      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        const errorResponse = result.error;
        expect(errorResponse.status).toBe(400);
        const responseData = await errorResponse.json();
        expect(responseData.error).toBe('Invalid request body');
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error during body validation',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('includes metadata in log messages', async () => {
      // Mock request with invalid data to trigger warning log
      const request = {
        json: jest.fn().mockResolvedValue({ name: 'Jo' }), // Invalid: too short
      } as any as Request;

      const metadata = { userId: '123', endpoint: '/api/test' };
      await validateRequestBody(request, testSchema, metadata);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request validation failed',
        {
          metadata: expect.objectContaining({
            userId: '123',
            endpoint: '/api/test',
            validationType: 'body',
            validationErrors: expect.any(Array),
          }),
        }
      );
    });
  });

  describe('validateQueryParams', () => {
    const testSchema = z.object({
      page: z.coerce.number().positive(),
      limit: z.coerce.number().max(100),
      sort: z.enum(['asc', 'desc']).optional(),
    });

    it('validates valid query parameters', () => {
      const searchParams = new URLSearchParams({
        page: '1',
        limit: '50',
        sort: 'asc',
      });

      const result = validateQueryParams(searchParams, testSchema);

      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data).toEqual({
          page: 1,
          limit: 50,
          sort: 'asc',
        });
      }
    });

    it('handles optional parameters correctly', () => {
      const searchParams = new URLSearchParams({
        page: '1',
        limit: '50',
      });

      const result = validateQueryParams(searchParams, testSchema);

      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data).toEqual({
          page: 1,
          limit: 50,
        });
      }
    });

    it('returns validation error for invalid query params', async () => {
      const searchParams = new URLSearchParams({
        page: '0',
        limit: '150',
        sort: 'invalid',
      });

      const result = validateQueryParams(searchParams, testSchema);

      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        const errorResponse = result.error;
        expect(errorResponse.status).toBe(400);
        const responseData = await errorResponse.json();
        expect(responseData.error).toBe('Invalid query parameters');
        expect(responseData.details.length).toBe(3);
      }
    });

    it('handles non-Zod errors', () => {
      const searchParams = new URLSearchParams();
      const brokenSchema = {
        parse: () => {
          throw new Error('Unexpected error');
        },
      } as any;

      const result = validateQueryParams(searchParams, brokenSchema);

      expect(isValidationError(result)).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error during query validation',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('validateRouteParams', () => {
    const testSchema = z.object({
      id: z.string().uuid(),
      slug: z.string().regex(/^[a-z0-9-]+$/),
    });

    it('validates valid route parameters', () => {
      const params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'test-slug-123',
      };

      const result = validateRouteParams(params, testSchema);

      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data).toEqual(params);
      }
    });

    it('handles array parameters', () => {
      const arraySchema = z.object({
        tags: z.array(z.string()),
      });

      const params = {
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const result = validateRouteParams(params, arraySchema);

      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
      }
    });

    it('returns validation error for invalid route params', async () => {
      const params = {
        id: 'not-a-uuid',
        slug: 'Invalid Slug!',
      };

      const result = validateRouteParams(params, testSchema);

      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        const errorResponse = result.error;
        expect(errorResponse.status).toBe(400);
        const responseData = await errorResponse.json();
        expect(responseData.error).toBe('Invalid route parameters');
        expect(responseData.details).toEqual([
          { path: 'id', message: 'Invalid uuid' },
          { path: 'slug', message: 'Invalid' },
        ]);
      }
    });

    it('logs errors with metadata', () => {
      const params = { id: 'invalid' };
      const metadata = { route: '/api/[id]' };

      validateRouteParams(params, testSchema, metadata);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Route parameter validation failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            route: '/api/[id]',
            validationType: 'params',
          }),
        })
      );
    });
  });

  describe('Type Guards', () => {
    it('isValidationSuccess correctly identifies success results', () => {
      const successResult = { success: true as const, data: { test: 'data' } };
      const failureResult = {
        success: false as const,
        error: NextResponse.json({ error: 'test' }),
      };

      expect(isValidationSuccess(successResult)).toBe(true);
      expect(isValidationSuccess(failureResult)).toBe(false);
    });

    it('isValidationError correctly identifies error results', () => {
      const successResult = { success: true as const, data: { test: 'data' } };
      const failureResult = {
        success: false as const,
        error: NextResponse.json({ error: 'test' }),
      };

      expect(isValidationError(successResult)).toBe(false);
      expect(isValidationError(failureResult)).toBe(true);
    });
  });

  describe('Error Detail Formatting', () => {
    it('formats nested path errors correctly', async () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(3),
            age: z.number().positive(),
          }),
        }),
      });

      const invalidData = {
        user: {
          profile: {
            name: 'Jo',
            age: -5,
          },
        },
      };

      // Mock the request.json() method to return our nested invalid data
      const request = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as any as Request;

      const result = await validateRequestBody(request, nestedSchema);

      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        const errorResponse = result.error;
        const responseData = await errorResponse.json();
        expect(responseData.details).toEqual([
          {
            path: 'user.profile.name',
            message: 'String must contain at least 3 character(s)',
          },
          {
            path: 'user.profile.age',
            message: 'Number must be greater than 0',
          },
        ]);
      }
    });
  });
});
