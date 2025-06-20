import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { GET, POST } from '../route';
import { createServerComponentClient } from '@/lib/supabase';
import { communityService } from '@/services/community.service';
import { log } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limiter-middleware';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/community.service');
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
      headers: init?.headers,
    })),
  },
}));

const mockSupabase = {
  auth: {
    getSession: jest.fn(),
  },
};

const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
};

const mockDiscussion = {
  id: 'discussion-123',
  title: 'Test Discussion',
  content: 'This is a test discussion',
  author_id: 'user-123',
  game: 'bingo',
  challenge_type: 'speed',
  tags: ['testing', 'example'],
  created_at: '2024-01-01T00:00:00Z',
  upvotes: 0,
  comments_count: 0,
};

import * as validationMiddleware from '@/lib/validation/middleware';
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

describe('/api/discussions route handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (createServerComponentClient as jest.Mock).mockResolvedValue(mockSupabase);
    (withRateLimit as jest.Mock).mockImplementation(handler => handler);
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('GET handler', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('https://example.com/api/discussions');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return {
        url: url.toString(),
      } as NextRequest;
    };

    describe('successful discussions retrieval', () => {
      test('should fetch discussions with default pagination', async () => {
        const mockResponse = {
          discussions: [mockDiscussion],
          totalCount: 1,
        };

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.getDiscussionsForAPI as jest.Mock).mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.data).toEqual([mockDiscussion]);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        });

        expect(communityService.getDiscussionsForAPI).toHaveBeenCalledWith(
          {
            game: undefined,
            challenge_type: undefined,
            search: undefined,
            sort: undefined,
          },
          1,
          20
        );
      });

      test('should fetch discussions with custom pagination and filters', async () => {
        const mockResponse = {
          discussions: [mockDiscussion],
          totalCount: 25,
        };

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {
            page: 2,
            limit: 10,
            game: 'bingo',
            search: 'test',
            challenge_type: 'speed',
            sort: 'newest',
          },
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.getDiscussionsForAPI as jest.Mock).mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const request = createMockRequest({
          page: '2',
          limit: '10',
          game: 'bingo',
          search: 'test',
          challenge_type: 'speed',
          sort: 'newest',
        });
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.pagination).toEqual({
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        });

        expect(communityService.getDiscussionsForAPI).toHaveBeenCalledWith(
          {
            game: 'bingo',
            challenge_type: 'speed',
            search: 'test',
            sort: 'newest',
          },
          2,
          10
        );
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid query parameters', async () => {
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

        const request = createMockRequest({ page: 'invalid' });
        const response = await GET(request);

        expect(response).toBe(validationError.error);
      });
    });

    describe('service errors', () => {
      test('should handle service failure', async () => {
        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.getDiscussionsForAPI as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Database connection failed',
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error fetching discussions',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'discussions',
              method: 'GET',
            }),
          })
        );
      });

      test('should handle service success with no data', async () => {
        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.getDiscussionsForAPI as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to fetch discussions');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockValidationMiddleware.validateQueryParams.mockImplementation(() => {
          throw new Error('Validation middleware error');
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Internal Server Error');
        expect(log.error).toHaveBeenCalledWith(
          'Error fetching discussions',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'discussions',
              method: 'GET',
            }),
          })
        );
      });
    });
  });

  describe('POST handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/discussions',
      } as NextRequest;
    };

    describe('successful discussion creation', () => {
      test('should create discussion successfully', async () => {
        const requestBody = {
          title: 'Test Discussion',
          content: 'This is a test discussion',
          game: 'bingo',
          challenge_type: 'speed',
          tags: ['testing', 'example'],
        };

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.createDiscussion as jest.Mock).mockResolvedValue({
          success: true,
          data: mockDiscussion,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockDiscussion);

        expect(communityService.createDiscussion).toHaveBeenCalledWith({
          title: 'Test Discussion',
          content: 'This is a test discussion',
          author_id: 'user-123',
          game: 'bingo',
          challenge_type: 'speed',
          tags: ['testing', 'example'],
        });
      });

      test('should create discussion with optional fields as null/empty', async () => {
        const requestBody = {
          title: 'Test Discussion',
          content: 'This is a test discussion',
          game: 'bingo',
        };

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.createDiscussion as jest.Mock).mockResolvedValue({
          success: true,
          data: { ...mockDiscussion, challenge_type: null, tags: [] },
        });

        const request = createMockRequest(requestBody);
        await POST(request);

        expect(communityService.createDiscussion).toHaveBeenCalledWith({
          title: 'Test Discussion',
          content: 'This is a test discussion',
          author_id: 'user-123',
          game: 'bingo',
          challenge_type: null,
          tags: [],
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for no session', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe(
          'Unauthorized - No active session or user ID found'
        );
      });

      test('should return 401 for session without user ID', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { user: {} } },
          error: null,
        });

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe(
          'Unauthorized - No active session or user ID found'
        );
      });

      test('should handle auth error from Supabase', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: null },
          error: { message: 'JWT expired' },
        });

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Authentication error');
        expect(log.error).toHaveBeenCalledWith(
          'Auth error fetching session',
          { message: 'JWT expired' },
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'discussions',
              method: 'POST',
            }),
          })
        );
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession },
          error: null,
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
          title: 'Test Discussion',
          content: 'This is a test discussion',
          game: 'bingo',
        };

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.createDiscussion as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Database connection failed',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error creating discussion',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'discussions',
              method: 'POST',
              title: 'Test Discussion',
              userId: 'user-123',
            }),
          })
        );
      });

      test('should handle service success with no data', async () => {
        const requestBody = {
          title: 'Test Discussion',
          content: 'This is a test discussion',
          game: 'bingo',
        };

        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.createDiscussion as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to create discussion');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockSupabase.auth.getSession.mockRejectedValue(
          new Error('Supabase error')
        );

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Internal Server Error');
        expect(log.error).toHaveBeenCalledWith(
          'Error creating discussion',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'discussions',
              method: 'POST',
            }),
          })
        );
      });
    });
  });

  describe('pagination calculations', () => {
    test('should calculate pagination correctly', async () => {
      const testCases = [
        { total: 0, limit: 20, expectedPages: 0 },
        { total: 1, limit: 20, expectedPages: 1 },
        { total: 20, limit: 20, expectedPages: 1 },
        { total: 21, limit: 20, expectedPages: 2 },
        { total: 100, limit: 25, expectedPages: 4 },
        { total: 101, limit: 25, expectedPages: 5 },
      ];

      for (const { total, limit, expectedPages } of testCases) {
        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: { limit },
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (communityService.getDiscussionsForAPI as jest.Mock).mockResolvedValue({
          success: true,
          data: { discussions: [], totalCount: total },
        });

        const request = {
          url: `https://example.com/api/discussions?limit=${limit}`,
        } as NextRequest;

        const response = await GET(request);
        const result = await response.json();

        expect(result.pagination.totalPages).toBe(expectedPages);
      }
    });
  });
});
