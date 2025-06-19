import { NextRequest } from 'next/server';
import { POST } from '../route';
import { gameStateService } from '@/services/game-state.service';
import { sessionsService } from '@/services/sessions.service';
import { authService } from '@/services/auth.service';
import { log } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limiter-middleware';
import { withErrorHandling } from '@/lib/error-handler';

// Mock dependencies
jest.mock('@/services/game-state.service');
jest.mock('@/services/sessions.service');
jest.mock('@/services/auth.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: jest.fn((handler) => handler),
  RATE_LIMIT_CONFIGS: {
    gameAction: 'gameAction',
  },
}));
jest.mock('@/lib/error-handler', () => ({
  withErrorHandling: jest.fn((handler) => handler),
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

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSession = {
  id: 'session-123',
  host_id: 'user-123',
  status: 'active',
  title: 'Test Session',
  game_type: 'bingo',
  max_players: 10,
  current_players: 2,
  board_id: 'board-123',
  created_at: '2024-01-01T00:00:00Z',
  started_at: '2024-01-01T01:00:00Z',
  settings: {},
};

describe('/api/bingo/sessions/[id]/start route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (log.warn as jest.Mock).mockImplementation(() => {});
    (log.error as jest.Mock).mockImplementation(() => {});
  });

  describe('POST handler', () => {
    const createMockRequest = () => {
      return {
        url: 'https://example.com/api/bingo/sessions/session-123/start',
      } as NextRequest;
    };

    const createMockParams = (id: string = 'session-123') => ({
      params: { id },
    });

    describe('successful session start', () => {
      test('should start session successfully and return session data', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: true,
          data: { status: 'active' },
        });

        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: mockSession,
          error: null,
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockSession);

        expect(gameStateService.startSession).toHaveBeenCalledWith(
          'session-123',
          'user-123'
        );
        expect(sessionsService.getSessionById).toHaveBeenCalledWith(
          'session-123'
        );
      });

      test('should return minimal data when session fetch fails after successful start', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: true,
          data: { status: 'active' },
        });

        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: null,
          error: 'Failed to fetch session',
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          id: 'session-123',
          status: 'active',
        });

        expect(log.error).toHaveBeenCalledWith(
          'Failed to get updated session after start',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              apiRoute: 'bingo/sessions/[id]/start',
              method: 'POST',
            }),
          })
        );
      });
    });

    describe('authentication', () => {
      test('should return 401 for unauthenticated users', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: false,
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');

        expect(log.warn).toHaveBeenCalledWith(
          'Unauthorized attempt to start session',
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              apiRoute: 'bingo/sessions/[id]/start',
              method: 'POST',
            }),
          })
        );

        expect(gameStateService.startSession).not.toHaveBeenCalled();
      });

      test('should return 401 when auth service succeeds but returns no user', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: null,
          success: true,
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('permission errors', () => {
      test('should return 403 when user is not the host', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Only the host can start the session',
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result.error).toBe('Only the host can start the session');

        expect(log.error).toHaveBeenCalledWith(
          'Failed to start session',
          expect.any(Error),
          expect.objectContaining({
            metadata: expect.objectContaining({
              sessionId: 'session-123',
              userId: 'user-123',
              apiRoute: 'bingo/sessions/[id]/start',
              method: 'POST',
            }),
          })
        );
      });
    });

    describe('session not found', () => {
      test('should return 404 when session does not exist', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Session not found',
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams('nonexistent-session'));
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Session not found');

        expect(gameStateService.startSession).toHaveBeenCalledWith(
          'nonexistent-session',
          'user-123'
        );
      });
    });

    describe('service errors', () => {
      test('should return 400 for general service errors', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Session already started',
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Session already started');
      });

      test('should handle service errors without specific error message', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: false,
          error: null,
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams());
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Failed to start session');
      });
    });

    describe('parameter handling', () => {
      test('should handle different session IDs correctly', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: true,
          data: { status: 'active' },
        });

        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: { ...mockSession, id: 'different-session' },
          error: null,
        });

        const request = createMockRequest();
        const response = await POST(request, createMockParams('different-session'));
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.id).toBe('different-session');

        expect(gameStateService.startSession).toHaveBeenCalledWith(
          'different-session',
          'user-123'
        );
        expect(sessionsService.getSessionById).toHaveBeenCalledWith(
          'different-session'
        );
      });
    });


    describe('logging', () => {
      test('should log appropriate messages for different scenarios', async () => {
        // Test successful scenario logging
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({
          data: mockUser,
          success: true,
        });

        (gameStateService.startSession as jest.Mock).mockResolvedValue({
          success: true,
          data: { status: 'active' },
        });

        (sessionsService.getSessionById as jest.Mock).mockResolvedValue({
          data: mockSession,
          error: null,
        });

        const request = createMockRequest();
        await POST(request, createMockParams());

        // Should not log any warnings or errors for successful case
        expect(log.warn).not.toHaveBeenCalled();
        expect(log.error).not.toHaveBeenCalled();
      });
    });
  });
});