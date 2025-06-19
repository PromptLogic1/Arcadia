import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getRuntimeConfig } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limiter-middleware';

// Mock dependencies
jest.mock('@/lib/config');
jest.mock('next/cache');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware');

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  isValidationError: jest.fn(),
}));

const mockValidationMiddleware = require('@/lib/validation/middleware');

describe('/api/revalidate route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (withRateLimit as jest.Mock).mockImplementation((handler) => handler);
    (log.error as jest.Mock).mockImplementation(() => {});
    (revalidatePath as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/revalidate',
      } as NextRequest;
    };

    describe('successful revalidation', () => {
      test('should revalidate path with valid token and allowed path', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/allowed-path',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token') // REVALIDATE_TOKEN
          .mockResolvedValueOnce('/allowed-path,/another-path'); // ALLOWED_REVALIDATE_PATHS

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          revalidated: true,
          path: '/allowed-path',
        });
        
        expect(revalidatePath).toHaveBeenCalledWith('/allowed-path');
        expect(getRuntimeConfig).toHaveBeenCalledWith('REVALIDATE_TOKEN');
        expect(getRuntimeConfig).toHaveBeenCalledWith('ALLOWED_REVALIDATE_PATHS');
      });

      test('should handle root path revalidation', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/,/dashboard');

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.path).toBe('/');
        expect(revalidatePath).toHaveBeenCalledWith('/');
      });

      test('should use default allowed paths when config is not a string', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce(null); // Non-string value

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.path).toBe('/');
        expect(revalidatePath).toHaveBeenCalledWith('/');
      });
    });

    describe('authentication', () => {
      test('should return 401 for invalid token', async () => {
        const requestBody = {
          token: 'invalid-token',
          path: '/allowed-path',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token') // Different from provided token
          .mockResolvedValueOnce('/allowed-path');

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Invalid token');
        expect(revalidatePath).not.toHaveBeenCalled();
      });

      test('should return 401 for missing token', async () => {
        const requestBody = {
          token: '',
          path: '/allowed-path',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/allowed-path');

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Invalid token');
        expect(revalidatePath).not.toHaveBeenCalled();
      });
    });

    describe('path validation', () => {
      test('should return 400 for disallowed path', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/disallowed-path',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/allowed-path,/another-allowed-path');

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Invalid path');
        expect(revalidatePath).not.toHaveBeenCalled();
      });

      test('should validate path against multiple allowed paths', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/second-allowed',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/first-allowed,/second-allowed,/third-allowed');

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.path).toBe('/second-allowed');
        expect(revalidatePath).toHaveBeenCalledWith('/second-allowed');
      });
    });

    describe('validation middleware', () => {
      test('should return validation error for invalid request body', async () => {
        const validationError = {
          error: Response.json({ error: 'Invalid request body' }, { status: 400 }),
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(validationError);
        mockValidationMiddleware.isValidationError.mockReturnValue(true);

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError.error);
        expect(revalidatePath).not.toHaveBeenCalled();
      });

      test('should validate with correct schema and context', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/');

        const request = createMockRequest(requestBody);
        await POST(request);

        expect(mockValidationMiddleware.validateRequestBody).toHaveBeenCalledWith(
          request,
          expect.any(Object), // revalidateRequestSchema
          {
            apiRoute: 'revalidate',
            method: 'POST',
          }
        );
      });
    });

    describe('configuration handling', () => {
      test('should handle config retrieval errors gracefully', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock).mockRejectedValue(
          new Error('Config retrieval failed')
        );

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to revalidate');
        expect(log.error).toHaveBeenCalledWith(
          'Error in POST /api/revalidate',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'revalidate',
              method: 'POST',
            }),
          })
        );
      });

      test('should parse allowed paths correctly', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/path3',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/path1,/path2,/path3');

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(revalidatePath).toHaveBeenCalledWith('/path3');
      });
    });

    describe('error handling', () => {
      test('should handle revalidatePath errors', async () => {
        const requestBody = {
          token: 'valid-token',
          path: '/',
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (getRuntimeConfig as jest.Mock)
          .mockResolvedValueOnce('valid-token')
          .mockResolvedValueOnce('/');

        (revalidatePath as jest.Mock).mockImplementation(() => {
          throw new Error('Revalidation failed');
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to revalidate');
        expect(log.error).toHaveBeenCalledWith(
          'Error in POST /api/revalidate',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'revalidate',
              method: 'POST',
            }),
          })
        );
      });

      test('should handle unexpected errors', async () => {
        mockValidationMiddleware.validateRequestBody.mockRejectedValue(
          new Error('Unexpected validation error')
        );

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to revalidate');
        expect(log.error).toHaveBeenCalledWith(
          'Error in POST /api/revalidate',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'revalidate',
              method: 'POST',
            }),
          })
        );
      });
    });

    describe('rate limiting', () => {
      test('should use rate limiting middleware', () => {
        expect(withRateLimit).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({}) // RATE_LIMIT_CONFIGS.gameAction
        );
      });
    });
  });

  describe('edge cases', () => {
    test('should handle empty allowed paths configuration', async () => {
      const requestBody = {
        token: 'valid-token',
        path: '/test',
      };

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        data: requestBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      (getRuntimeConfig as jest.Mock)
        .mockResolvedValueOnce('valid-token')
        .mockResolvedValueOnce(''); // Empty string

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid path');
    });

    test('should handle special characters in paths', async () => {
      const requestBody = {
        token: 'valid-token',
        path: '/special-chars_123',
      };

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        data: requestBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      (getRuntimeConfig as jest.Mock)
        .mockResolvedValueOnce('valid-token')
        .mockResolvedValueOnce('/special-chars_123');

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.path).toBe('/special-chars_123');
      expect(revalidatePath).toHaveBeenCalledWith('/special-chars_123');
    });
  });
});