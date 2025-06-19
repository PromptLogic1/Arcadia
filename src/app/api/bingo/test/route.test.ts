import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { GET, POST } from '../route';
import { bingoBoardsService } from '@/services/bingo-boards.service';
import { authService } from '@/services/auth.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/bingo-boards.service');
jest.mock('@/services/auth.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(<T extends (...args: unknown[]) => unknown>(handler: T) => handler),
  RATE_LIMIT_CONFIGS: {
    read: 'read',
    create: 'create',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  validateQueryParams: jest.fn(),
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

import * as validationMiddleware from '@/lib/validation/middleware';
const mockValidationMiddleware = validationMiddleware as jest.Mocked<typeof validationMiddleware>;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockBoard = {
  id: 'board-123',
  title: 'Test Board',
  size: 5,
  game_type: 'bingo',
  difficulty: 'normal',
  is_public: true,
  board_state: [
    {
      cell_id: 'cell-1',
      text: 'Test Cell',
      colors: null,
      completed_by: null,
      blocked: false,
      is_marked: false,
      version: 1,
      last_updated: '2024-01-01T00:00:00Z',
      last_modified_by: null,
    },
  ],
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/bingo route handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('GET handler', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('https://example.com/api/bingo');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return {
        url: url.toString(),
      } as NextRequest;
    };

    describe('successful boards retrieval', () => {
      test('should fetch boards with default parameters', async () => {
        const mockBoards = [mockBoard];

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {},
        });

        (bingoBoardsService.getBoards as jest.Mock).mockResolvedValue({
          data: mockBoards,
          error: null,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockBoards);

        expect(bingoBoardsService.getBoards).toHaveBeenCalledWith({
          game: null,
          difficulty: null,
          limit: undefined,
          offset: undefined,
        });
      });

      test('should fetch boards with filters', async () => {
        const mockBoards = [mockBoard];

        mockValidationMiddleware.validateQueryParams.mockReturnValue({
          success: true,
          data: {
            game: 'bingo',
            difficulty: 'hard',
            limit: 10,
            offset: 20,
          },
        });

        (bingoBoardsService.getBoards as jest.Mock).mockResolvedValue({
          data: mockBoards,
          error: null,
        });

        const request = createMockRequest({
          game: 'bingo',
          difficulty: 'hard',
          limit: '10',
          offset: '20',
        });
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockBoards);

        expect(bingoBoardsService.getBoards).toHaveBeenCalledWith({
          game: 'bingo',
          difficulty: 'hard',
          limit: 10,
          offset: 20,
        });
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

        const request = createMockRequest({ invalid: 'param' });
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

        (bingoBoardsService.getBoards as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Database connection failed',
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error fetching bingo boards',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo',
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

        (bingoBoardsService.getBoards as jest.Mock).mockResolvedValue({
          data: null,
          error: null,
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to fetch boards');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        mockValidationMiddleware.validateQueryParams.mockImplementation(() => {
          throw new Error('Validation error');
        });

        const request = createMockRequest();
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to fetch bingo boards');
        expect(log.error).toHaveBeenCalledWith(
          'Unhandled error in GET /api/bingo',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo',
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
        url: 'https://example.com/api/bingo',
      } as NextRequest;
    };

    describe('successful board creation', () => {
      test('should create board successfully', async () => {
        const requestBody = {
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          is_public: true,
          board_state: [
            {
              cell_id: 'cell-1',
              text: 'Test Cell',
              colors: null,
              completed_by: null,
              blocked: false,
              is_marked: false,
              version: 1,
              last_updated: '2024-01-01T00:00:00Z',
              last_modified_by: null,
            },
          ],
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (bingoBoardsService.createBoardFromAPI as jest.Mock).mockResolvedValue({
          data: mockBoard,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockBoard);

        expect(bingoBoardsService.createBoardFromAPI).toHaveBeenCalledWith({
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          is_public: true,
          board_state: [
            {
              cell_id: 'cell-1',
              text: 'Test Cell',
              colors: null,
              completed_by: null,
              blocked: false,
              is_marked: false,
              version: 1,
              last_updated: '2024-01-01T00:00:00Z',
              last_modified_by: null,
            },
          ],
          userId: 'user-123',
        });
      });

      test('should create board with null values for optional fields', async () => {
        const requestBody = {
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          board_state: [
            {
              text: 'Test Cell',
            },
          ],
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (bingoBoardsService.createBoardFromAPI as jest.Mock).mockResolvedValue({
          data: mockBoard,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const _response = await POST(request);

        expect(bingoBoardsService.createBoardFromAPI).toHaveBeenCalledWith({
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          is_public: false,
          board_state: [
            {
              cell_id: null,
              text: 'Test Cell',
              colors: null,
              completed_by: null,
              blocked: null,
              is_marked: null,
              version: null,
              last_updated: null,
              last_modified_by: null,
            },
          ],
          userId: 'user-123',
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Not authenticated',
        });

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });

      test('should return 401 when auth service returns no user', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          error: null,
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
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
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

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request);

        expect(response).toBe(validationError.error);
      });
    });

    describe('service errors', () => {
      test('should handle service failure', async () => {
        const requestBody = {
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          is_public: true,
          board_state: [],
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (bingoBoardsService.createBoardFromAPI as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Database connection failed',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database connection failed');
        expect(log.error).toHaveBeenCalledWith(
          'Error creating bingo board',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo',
              method: 'POST',
              userId: 'user-123',
            }),
          })
        );
      });

      test('should handle service success with no data', async () => {
        const requestBody = {
          title: 'Test Board',
          size: 5,
          settings: {},
          game_type: 'bingo',
          difficulty: 'normal',
          is_public: true,
          board_state: [],
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (bingoBoardsService.createBoardFromAPI as jest.Mock).mockResolvedValue({
          data: null,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to create board');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          error: null,
        });

        mockValidationMiddleware.validateRequestBody.mockRejectedValue(
          new Error('Validation service error')
        );

        const request = createMockRequest({});
        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to create bingo board');
        expect(log.error).toHaveBeenCalledWith(
          'Unhandled error in POST /api/bingo',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo',
              method: 'POST',
            }),
          })
        );
      });
    });
  });
});