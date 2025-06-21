import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { GET, PATCH } from '../route';
import { sessionsService } from '@/services/sessions.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/sessions.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn(handler => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
    read: 'read',
  },
}));
jest.mock('@/lib/error-handler', () => ({
  withErrorHandling: jest.fn(handler => handler),
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
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
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

const mockSession = {
  id: 'session-123',
  board_id: 'board-123',
  host_id: 'user-123',
  session_code: 'ABC123',
  status: 'active' as const,
  settings: null,
  current_state: [
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
  ],
  started_at: null,
  ended_at: null,
  winner_id: null,
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/bingo/sessions/[id]/board-state route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.info as jest.Mock).mockImplementation(() => {});
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('GET handler', () => {
    const createMockRequest = () => {
      return {
        url: 'https://example.com/api/bingo/sessions/session-123/board-state',
      } as NextRequest;
    };

    const createMockParams = (id = 'session-123') => ({
      params: { id },
    });

    describe('successful board state retrieval', () => {
      test('should return board state and version successfully', async () => {
        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: mockSession,
          error: null,
          success: true,
        });

        const request = createMockRequest();
        const response = await GET(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          current_state: mockSession.current_state,
          version: mockSession.version,
        });

        expect(sessionsService.getSessionById).toHaveBeenCalledWith(
          'session-123'
        );
      });
    });

    describe('error handling', () => {
      test('should return 404 when session is not found', async () => {
        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Session not found',
          success: false,
        });

        const request = createMockRequest();
        const response = await GET(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');

        expect(log.error).toHaveBeenCalledWith(
          'Failed to get session board state',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              apiRoute: 'bingo/sessions/[id]/board-state',
              method: 'GET',
            }),
          })
        );
      });

      test('should return 404 when service returns no data', async () => {
        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: null,
          error: null,
          success: true,
        });

        const request = createMockRequest();
        const response = await GET(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');
      });
    });

    describe('parameter handling', () => {
      test('should handle different session IDs correctly', async () => {
        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: { ...mockSession, id: 'different-session' },
          error: null,
          success: true,
        });

        const request = createMockRequest();
        const response = await GET(
          request,
          createMockParams('different-session')
        );
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.current_state).toEqual(mockSession.current_state);

        expect(sessionsService.getSessionById).toHaveBeenCalledWith(
          'different-session'
        );
      });
    });
  });

  describe('PATCH handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/bingo/sessions/session-123/board-state',
      } as NextRequest;
    };

    const createMockParams = (id = 'session-123') => ({
      params: { id },
    });

    describe('successful board state update', () => {
      test('should update board state successfully', async () => {
        const requestBody = {
          board_state: [
            {
              cell_id: 'cell-1',
              text: 'Updated Cell 1',
              colors: null,
              completed_by: ['user-456'],
              blocked: false,
              is_marked: true,
              version: 2,
              last_updated: '2024-01-02T00:00:00Z',
              last_modified_by: 'user-456',
            },
          ],
          version: 1,
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.updateBoardState as jest.Mock).mockResolvedValue({
          data: { ...mockSession, current_state: requestBody.board_state, version: 2 },
          error: null,
          success: true,
        });

        const request = createMockRequest(requestBody);
        const response = await PATCH(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.current_state).toEqual(requestBody.board_state);
        expect(result.version).toBe(2);

        expect(sessionsService.updateBoardState).toHaveBeenCalledWith(
          'session-123',
          requestBody.board_state,
          1
        );
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
        const validationError = {
          success: false as const,
          error: NextResponse.json(
            { error: 'Invalid board state' },
            { status: 400 }
          ),
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue(
          validationError
        );

        const request = createMockRequest({ invalid: 'data' });
        const response = await PATCH(request, createMockParams());

        expect(response).toBe(validationError.error);
      });
    });

    describe('version conflict handling', () => {
      test('should return 409 for version conflict', async () => {
        const requestBody = {
          board_state: [
            {
              cell_id: 'cell-1',
              text: 'Updated Cell',
              colors: null,
              completed_by: null,
              blocked: false,
              is_marked: false,
              version: 1,
              last_updated: '2024-01-02T00:00:00Z',
              last_modified_by: null,
            },
          ],
          version: 1,
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.updateBoardState as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Version conflict: Expected version 2 but got 1',
          success: false,
        });

        const request = createMockRequest(requestBody);
        const response = await PATCH(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(409);
        expect(result.error).toContain('Version conflict');

        expect(log.info).toHaveBeenCalledWith(
          'Board state version conflict',
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              requestedVersion: 1,
              apiRoute: 'bingo/sessions/[id]/board-state',
              method: 'PATCH',
            }),
          })
        );
      });
    });

    describe('service errors', () => {
      test('should handle general service errors', async () => {
        const requestBody = {
          board_state: [],
          version: 1,
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.updateBoardState as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Database error',
          success: false,
        });

        const request = createMockRequest(requestBody);
        const response = await PATCH(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Database error');

        expect(log.error).toHaveBeenCalledWith(
          'Failed to update board state',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              apiRoute: 'bingo/sessions/[id]/board-state',
              method: 'PATCH',
            }),
          })
        );
      });
    });

    describe('parameter handling', () => {
      test('should handle different session IDs correctly', async () => {
        const requestBody = {
          board_state: [],
          version: 1,
        };

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.updateBoardState as jest.Mock).mockResolvedValue({
          data: { ...mockSession, id: 'different-session' },
          error: null,
          success: true,
        });

        const request = createMockRequest(requestBody);
        const response = await PATCH(
          request,
          createMockParams('different-session')
        );

        expect(response.status).toBe(200);

        expect(sessionsService.updateBoardState).toHaveBeenCalledWith(
          'different-session',
          requestBody.board_state,
          1
        );
      });
    });
  });
});