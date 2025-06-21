import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST } from '../route';
import { gameStateService } from '@/services/game-state.service';
import { authService } from '@/services/auth.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/game-state.service');
jest.mock('@/services/auth.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(handler => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
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

// Import services module for re-export testing
jest.mock('@/services', () => ({
  gameStateService: jest.requireMock('@/services/game-state.service').gameStateService,
  authService: jest.requireMock('@/services/auth.service').authService,
}));

import * as validationMiddleware from '@/lib/validation/middleware';
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockBoardState = [
  {
    cell_id: 'cell-1',
    text: 'Test Cell 1',
    colors: null,
    completed_by: null,
    blocked: false,
    is_marked: false,
    version: 1,
    last_updated: '2024-01-01T00:00:00Z',
    last_modified_by: null,
  },
  {
    cell_id: 'cell-2',
    text: 'Test Cell 2',
    colors: { primary: '#3B82F6' },
    completed_by: ['user-123'],
    blocked: false,
    is_marked: true,
    version: 1,
    last_updated: '2024-01-01T00:00:00Z',
    last_modified_by: 'user-123',
  },
];

describe('/api/bingo/sessions/[id]/mark-cell route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/bingo/sessions/session-123/mark-cell',
      } as NextRequest;
    };

    const createMockParams = (id = 'session-123') => ({
      params: { id },
    });

    describe('successful cell marking', () => {
      test('should mark cell successfully', async () => {
        const requestBody = {
          cell_position: 5,
          action: 'mark' as const,
          version: 1,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            boardState: mockBoardState,
            version: 2,
          },
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          message: 'Cell marked successfully',
          current_state: mockBoardState,
          version: 2,
        });

        expect(gameStateService.markCell).toHaveBeenCalledWith('session-123', {
          cell_position: 5,
          user_id: 'user-123', // Should use authenticated user ID
          action: 'mark',
          version: 1,
        });
      });

      test('should unmark cell successfully', async () => {
        const requestBody = {
          cell_position: 2,
          action: 'unmark' as const,
          version: 2,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            boardState: mockBoardState,
            version: 3,
          },
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.message).toBe('Cell marked successfully');

        expect(gameStateService.markCell).toHaveBeenCalledWith('session-123', {
          cell_position: 2,
          user_id: 'user-123',
          action: 'unmark',
          version: 2,
        });
      });

      test('should use default version 0 when not provided', async () => {
        const requestBody = {
          cell_position: 10,
          action: 'mark' as const,
          // version not provided
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            boardState: mockBoardState,
            version: 1,
          },
          error: null,
        });

        const request = createMockRequest(requestBody);
        await POST(request, createMockParams());

        expect(gameStateService.markCell).toHaveBeenCalledWith('session-123', {
          cell_position: 10,
          user_id: 'user-123',
          action: 'mark',
          version: 0, // Should default to 0
        });
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: false,
        });

        const request = createMockRequest({
          cell_position: 5,
          action: 'mark',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(gameStateService.markCell).not.toHaveBeenCalled();
      });

      test('should return 401 when auth succeeds but no user data', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: true,
        });

        const request = createMockRequest({
          cell_position: 5,
          action: 'mark',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid cell position' },
            { status: 400 }
          ),
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(
          validationError
        );
        mockValidationMiddleware.isValidationError.mockReturnValue(true);

        const request = createMockRequest({ invalid: 'data' });
        const response = await POST(request, createMockParams());

        expect(response).toBe(validationError.error);
      });

      test('should ignore user_id from request body and use authenticated user', async () => {
        const requestBody = {
          cell_position: 5,
          action: 'mark' as const,
          user_id: 'malicious-user-789', // Should be ignored
          version: 1,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            boardState: mockBoardState,
            version: 2,
          },
          error: null,
        });

        const request = createMockRequest(requestBody);
        await POST(request, createMockParams());

        expect(gameStateService.markCell).toHaveBeenCalledWith('session-123', {
          cell_position: 5,
          user_id: 'user-123', // Should use authenticated user, not request body
          action: 'mark',
          version: 1,
        });
      });
    });

    describe('version conflict handling', () => {
      test('should return 409 for version conflicts', async () => {
        const requestBody = {
          cell_position: 5,
          action: 'mark' as const,
          version: 1,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: false,
          error: 'VERSION_CONFLICT',
          data: { version: 3 },
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(409);
        expect(result.error).toBe('Version conflict');
        expect(result.current_version).toBe(3);
      });
    });

    describe('service errors', () => {
      test('should return 500 for general service errors', async () => {
        const requestBody = {
          cell_position: 5,
          action: 'mark' as const,
          version: 1,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Database error',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database error');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(
          new Error('Unexpected error')
        );

        const request = createMockRequest({
          cell_position: 5,
          action: 'mark',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Unexpected error');

        expect(log.error).toHaveBeenCalledWith(
          'Error marking cell in bingo session',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo/sessions/[id]/mark-cell',
              method: 'POST',
              sessionId: 'session-123',
              userId: undefined,
              cellPosition: undefined,
              action: undefined,
            }),
          })
        );
      });

      test('should use default error message for non-Error objects', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(
          'String error'
        );

        const request = createMockRequest({
          cell_position: 5,
          action: 'mark',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to mark cell');
      });
    });

    describe('parameter handling', () => {
      test('should handle different session IDs correctly', async () => {
        const requestBody = {
          cell_position: 12,
          action: 'mark' as const,
          version: 5,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });
        mockValidationMiddleware.isValidationError.mockReturnValue(false);

        (gameStateService.markCell as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            boardState: mockBoardState,
            version: 6,
          },
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(
          request,
          createMockParams('different-session')
        );

        expect(response.status).toBe(200);

        expect(gameStateService.markCell).toHaveBeenCalledWith(
          'different-session',
          {
            cell_position: 12,
            user_id: 'user-123',
            action: 'mark',
            version: 5,
          }
        );
      });
    });
  });
});