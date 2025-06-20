import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST, GET } from '../route';
import { createServerComponentClient } from '@/lib/supabase';
import { submissionsService } from '@/services/submissions.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/submissions.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(
    <T extends (...args: unknown[]) => unknown>(handler: T) => handler
  ),
  RATE_LIMIT_CONFIGS: {
    read: 'read',
    create: 'create',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  validateQueryParams: jest.fn(),
  isValidationError: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
    })),
  },
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSubmissionData = {
  id: 'submission-123',
  challenge_id: 'challenge-456',
  user_id: 'user-123',
  code: 'console.log("Hello World");',
  language: 'javascript',
  created_at: '2024-01-01T00:00:00Z',
};

import * as validationMiddleware from '@/lib/validation/middleware';
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

describe('/api/submissions route handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (createServerComponentClient as jest.Mock).mockResolvedValue(mockSupabase);
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = (body: unknown) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/submissions',
      } as NextRequest;
    };

    describe('successful submission creation', () => {
      test('should create submission successfully', async () => {
        const requestBody = {
          challenge_id: 'challenge-456',
          code: 'console.log("Hello World");',
          language: 'javascript',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.createSubmission as jest.Mock).mockResolvedValue({
          success: true,
          data: mockSubmissionData,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockSubmissionData);

        expect(submissionsService.createSubmission).toHaveBeenCalledWith({
          challenge_id: 'challenge-456',
          user_id: 'user-123',
          code: 'console.log("Hello World");',
          language: 'javascript',
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
        });

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
          ),
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(
          validationError
        );
        mockValidationMiddleware.isValidationError.mockReturnValue(true);

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError.error);
      });
    });

    describe('service errors', () => {
      test('should handle service failure', async () => {
        const requestBody = {
          challenge_id: 'challenge-456',
          code: 'console.log("Hello World");',
          language: 'javascript',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.createSubmission as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Database connection failed',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error creating submission',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'submissions',
              method: 'POST',
              userId: 'user-123',
            }),
          })
        );
      });

      test('should handle service success with no data', async () => {
        const requestBody = {
          challenge_id: 'challenge-456',
          code: 'console.log("Hello World");',
          language: 'javascript',
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.createSubmission as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to create submission');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(
          new Error('Supabase error')
        );

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Error creating submission');
        expect(log.error).toHaveBeenCalledWith(
          'Unhandled error in POST /api/submissions',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'submissions',
              method: 'POST',
            }),
          })
        );
      });
    });
  });

  describe('GET handler', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('https://example.com/api/submissions');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return {
        url: url.toString(),
      } as NextRequest;
    };

    describe('successful submissions retrieval', () => {
      test('should fetch submissions successfully', async () => {
        const mockSubmissions = [mockSubmissionData];

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: { challenge_id: 'challenge-456' },
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.getSubmissions as jest.Mock).mockResolvedValue({
          success: true,
          data: mockSubmissions,
        });

        const request = createMockRequest({ challenge_id: 'challenge-456' });
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockSubmissions);

        expect(submissionsService.getSubmissions).toHaveBeenCalledWith({
          user_id: 'user-123',
          challenge_id: 'challenge-456',
        });
      });

      test('should fetch submissions without challenge_id filter', async () => {
        const mockSubmissions = [mockSubmissionData];

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.getSubmissions as jest.Mock).mockResolvedValue({
          success: true,
          data: mockSubmissions,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockSubmissions);

        expect(submissionsService.getSubmissions).toHaveBeenCalledWith({
          user_id: 'user-123',
          challenge_id: undefined,
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid query parameters', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid query parameters' },
            { status: 400 }
          ),
        };

        mockValidationMiddleware.validateQueryParams.mockReturnValue(
          validationError
        );
        mockValidationMiddleware.isValidationError.mockReturnValue(true);

        const request = createMockRequest({ invalid: 'param' });
        const response = await GET(request);

        expect(response).toBe(validationError.error);
      });
    });

    describe('service errors', () => {
      test('should handle service failure', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: { challenge_id: 'challenge-456' },
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.getSubmissions as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Database connection failed',
        });

        const request = createMockRequest({ challenge_id: 'challenge-456' });
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error fetching submissions',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'submissions',
              method: 'GET',
              challengeId: 'challenge-456',
              userId: 'user-123',
            }),
          })
        );
      });

      test('should handle service success with no data', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
        });

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (submissionsService.getSubmissions as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to fetch submissions');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(
          new Error('Supabase error')
        );

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Error fetching submissions');
        expect(log.error).toHaveBeenCalledWith(
          'Unhandled error in GET /api/submissions',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'submissions',
              method: 'GET',
            }),
          })
        );
      });
    });
  });
});
