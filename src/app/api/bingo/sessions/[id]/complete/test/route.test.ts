import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { POST } from '../route';
import { gameStateService } from '@/services/game-state.service';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/game-state.service');
jest.mock('@/services/sessions.service');
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

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockPlayers = [
  {
    id: 'player-1',
    session_id: 'session-123',
    user_id: 'user-123',
    display_name: 'Player 1',
    color: '#3B82F6',
    avatar_url: null,
    position: 1,
    team: null,
    score: 100,
    is_host: true,
    is_ready: true,
    joined_at: '2024-01-01T00:00:00Z',
    left_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'player-2',
    session_id: 'session-123',
    user_id: 'user-456',
    display_name: 'Player 2',
    color: '#EF4444',
    avatar_url: null,
    position: 2,
    team: null,
    score: 80,
    is_host: false,
    is_ready: true,
    joined_at: '2024-01-01T00:00:00Z',
    left_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCompletedSession = {
  id: 'session-123',
  board_id: 'board-123',
  host_id: 'user-123',
  session_code: 'ABC123',
  status: 'completed' as const,
  settings: null,
  current_state: null,
  started_at: '2024-01-01T00:00:00Z',
  ended_at: '2024-01-01T01:00:00Z',
  winner_id: 'user-123',
  version: 2,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z',
};

describe('/api/bingo/sessions/[id]/complete route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = (body: any) => {
      return {
        json: () => Promise.resolve(body),
        url: 'https://example.com/api/bingo/sessions/session-123/complete',
      } as NextRequest;
    };

    const createMockParams = (id = 'session-123') => ({
      params: { id },
    });

    describe('successful session completion', () => {
      test('should complete session successfully with winner', async () => {
        const requestBody = {
          winnerId: 'user-123',
          winning_patterns: ['row-1', 'diagonal'],
          final_score: 100,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

        (gameStateService.completeGame as jest.Mock).mockResolvedValue({
          success: true,
          data: mockCompletedSession,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockCompletedSession);

        expect(gameStateService.completeGame).toHaveBeenCalledWith(
          'session-123',
          {
            winner_id: 'user-123',
            winning_patterns: ['row-1', 'diagonal'],
            final_score: 100,
            players: mockPlayers,
          }
        );
      });

      test('should complete session without winner (draw)', async () => {
        const requestBody = {
          winnerId: null,
          winning_patterns: [],
          final_score: null,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

        (gameStateService.completeGame as jest.Mock).mockResolvedValue({
          success: true,
          data: { ...mockCompletedSession, winner_id: null },
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.winner_id).toBeNull();

        expect(gameStateService.completeGame).toHaveBeenCalledWith(
          'session-123',
          {
            winner_id: null,
            winning_patterns: [],
            final_score: null,
            players: mockPlayers,
          }
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: false,
        });

        const request = createMockRequest({
          winnerId: 'user-123',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(gameStateService.completeGame).not.toHaveBeenCalled();
      });
    });

    describe('validation', () => {
      test('should return validation error for invalid request body', async () => {
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
        const response = await POST(request, createMockParams());

        expect(response).toBe(validationError.error);
      });
    });

    describe('players retrieval errors', () => {
      test('should handle failure to get session players', async () => {
        const requestBody = {
          winnerId: 'user-123',
          winning_patterns: ['row-1'],
          final_score: 100,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: false,
          data: null,
          error: 'Database error',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Database error');

        expect(gameStateService.completeGame).not.toHaveBeenCalled();
      });

      test('should handle when no players data is returned', async () => {
        const requestBody = {
          winnerId: 'user-123',
          winning_patterns: ['row-1'],
          final_score: 100,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: null,
          error: null,
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to get players');
      });
    });

    describe('game completion errors', () => {
      test('should return 404 when session is not found', async () => {
        const requestBody = {
          winnerId: 'user-123',
          winning_patterns: ['row-1'],
          final_score: 100,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

        (gameStateService.completeGame as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Session not found',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');
      });

      test('should return 400 for other game completion errors', async () => {
        const requestBody = {
          winnerId: 'user-123',
          winning_patterns: ['row-1'],
          final_score: 100,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

        (gameStateService.completeGame as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Session already completed',
        });

        const request = createMockRequest(requestBody);
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session already completed');
      });
    });

    describe('error handling', () => {
      test('should handle unexpected errors', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(
          new Error('Unexpected error')
        );

        const request = createMockRequest({
          winnerId: 'user-123',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Unexpected error');

        expect(log.error).toHaveBeenCalledWith(
          'Error completing bingo session',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              apiRoute: 'bingo/sessions/[id]/complete',
              method: 'POST',
              sessionId: 'session-123',
            }),
          })
        );
      });

      test('should use default error message when error message is not available', async () => {
        (authService.getCurrentUser as jest.Mock).mockRejectedValue({});

        const request = createMockRequest({
          winnerId: 'user-123',
        });
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('An unexpected error occurred');
      });
    });

    describe('parameter handling', () => {
      test('should handle different session IDs correctly', async () => {
        const requestBody = {
          winnerId: 'user-456',
          winning_patterns: ['full-board'],
          final_score: 150,
        };

        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        mockValidationMiddleware.validateRequestBody.mockResolvedValue({
          success: true,
          data: requestBody,
        });

        (sessionsService.getSessionPlayers as jest.Mock).mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

        (gameStateService.completeGame as jest.Mock).mockResolvedValue({
          success: true,
          data: { ...mockCompletedSession, id: 'different-session' },
        });

        const request = createMockRequest(requestBody);
        const response = await POST(
          request,
          createMockParams('different-session')
        );
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.id).toBe('different-session');

        expect(sessionsService.getSessionPlayers).toHaveBeenCalledWith(
          'different-session'
        );
        expect(gameStateService.completeGame).toHaveBeenCalledWith(
          'different-session',
          expect.any(Object)
        );
      });
    });
  });
});