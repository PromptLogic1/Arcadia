/**
 * @jest-environment node
 */

import { POST, PATCH, GET } from '../route';
import { NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { bingoBoardsService } from '@/services/bingo-boards.service';
import { sessionsService } from '@/services/sessions.service';
import { log } from '@/lib/logger';

// Mock dependencies
jest.mock('@/services/auth.service');
jest.mock('@/services/user.service');
jest.mock('@/services/bingo-boards.service');
jest.mock('@/services/sessions.service');
jest.mock('@/lib/logger');
jest.mock('@/lib/rate-limiter-middleware', () => ({
  withRateLimit: <T extends (...args: unknown[]) => unknown>(handler: T) =>
    handler,
  RATE_LIMIT_CONFIGS: {
    create: {},
    gameAction: {},
    read: {},
  },
}));

// Mock validation middleware
jest.mock('@/lib/validation/middleware', () => ({
  validateRequestBody: jest.fn(),
  validateQueryParams: jest.fn(),
  isValidationError: jest.fn(),
}));

import * as validationMiddleware from '@/lib/validation/middleware';

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserService = userService as jest.Mocked<typeof userService>;
const mockBingoBoardsService = bingoBoardsService as jest.Mocked<
  typeof bingoBoardsService
>;
const mockSessionsService = sessionsService as jest.Mocked<
  typeof sessionsService
>;
const mockValidationMiddleware = validationMiddleware as jest.Mocked<
  typeof validationMiddleware
>;

describe('Bingo Sessions API Route', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    phone: null,
    auth_username: null,
    provider: 'email',
    userRole: 'user' as const,
  };

  const mockProfile = {
    id: 'user-123',
    username: 'testuser',
    full_name: null,
    bio: null,
    avatar_url: null,
    city: null,
    region: null,
    land: null,
    role: 'user' as const,
    experience_points: null,
    profile_visibility: 'public' as const,
    achievements_visibility: 'public' as const,
    submissions_visibility: 'public' as const,
    auth_id: null,
    last_login_at: null,
    created_at: null,
    updated_at: null,
  };

  const mockBoard = {
    id: 'board-123',
    title: 'Test Board',
    description: null,
    game_type: 'All Games' as const,
    difficulty: 'medium' as const,
    size: 5,
    board_state: [],
    settings: null,
    status: 'active' as const,
    is_public: true,
    creator_id: 'user-123',
    cloned_from: null,
    votes: 0,
    bookmarked_count: 0,
    version: 1,
    created_at: null,
    updated_at: null,
  };

  const mockSession = {
    id: 'session-123',
    board_id: 'board-123',
    host_id: 'user-123',
    session_code: 'ABC123',
    status: 'waiting' as const,
    settings: null,
    current_state: null,
    started_at: null,
    ended_at: null,
    winner_id: null,
    version: 1,
    created_at: null,
    updated_at: null,
  };

  const mockPlayer = {
    id: 'player-123',
    session_id: 'session-123',
    user_id: 'user-123',
    display_name: 'testuser',
    color: '#3B82F6',
    avatar_url: null,
    position: null,
    team: null,
    score: null,
    is_host: false,
    is_ready: false,
    joined_at: null,
    left_at: null,
    created_at: null,
    updated_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bingo/sessions', () => {
    it('creates a session successfully when user is authenticated', async () => {
      const mockBody = {
        boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Valid UUID
        settings: {
          max_players: 8,
          allow_spectators: true,
        },
      };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
        error: null,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: mockBoard,
        error: null,
      });

      mockSessionsService.createSession.mockResolvedValue({
        success: true,
        data: mockSession,
        error: null,
      });

      mockSessionsService.joinSession.mockResolvedValue({
        success: true,
        data: mockPlayer,
        error: null,
      });

      mockSessionsService.updatePlayerReady.mockResolvedValue({
        player: mockPlayer,
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        session: mockSession,
        player: mockPlayer,
      });
      expect(mockSessionsService.createSession).toHaveBeenCalledWith({
        board_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        host_id: 'user-123',
        settings: {
          max_players: 8,
          allow_spectators: true,
          auto_start: undefined,
          time_limit: undefined,
          require_approval: undefined,
          password: undefined,
        },
      });
    });

    it('returns 401 when user is not authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: false,
        data: null,
        error: 'Not authenticated',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify({
          boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 when board is not found', async () => {
      const mockBody = { boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
        error: null,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: false,
        data: null,
        error: 'Board not found',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Board not found' });
    });

    it('returns 400 when board is not active and user is not creator', async () => {
      const mockBody = { boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
        error: null,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: {
          ...mockBoard,
          status: 'draft' as const,
          creator_id: 'other-user',
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Board is not active');
    });

    it('cleans up session when joining as host fails', async () => {
      const mockBody = { boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
        error: null,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: mockBoard,
        error: null,
      });

      mockSessionsService.createSession.mockResolvedValue({
        success: true,
        data: mockSession,
        error: null,
      });

      mockSessionsService.joinSession.mockResolvedValue({
        success: false,
        data: null,
        error: 'Failed to join',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockSessionsService.deleteSession).toHaveBeenCalledWith(
        'session-123'
      );
    });
  });

  describe('PATCH /api/bingo/sessions', () => {
    it('updates session successfully', async () => {
      const mockBody = {
        sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'active' as const,
      };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockSessionsService.updateSession.mockResolvedValue({
        session: { ...mockSession, status: 'active' as const },
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify(mockBody),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('active');
      expect(mockSessionsService.updateSession).toHaveBeenCalledWith(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        {
          current_state: undefined,
          winner_id: undefined,
          status: 'active',
        }
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: false,
        data: null,
        error: 'Not authenticated',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 when update fails', async () => {
      const mockBody = {
        sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'active' as const,
      };

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
        error: null,
      });

      mockValidationMiddleware.validateRequestBody.mockResolvedValue({
        success: true,
        data: mockBody,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockSessionsService.updateSession.mockResolvedValue({
        session: null,
        error: 'Update failed',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify(mockBody),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });
  });

  describe('GET /api/bingo/sessions', () => {
    it('retrieves sessions successfully', async () => {
      const mockQuery = {
        boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'active' as const,
      };

      const mockSessionsWithPlayers = [
        {
          ...mockSession,
          bingo_session_players: [
            {
              user_id: mockPlayer.user_id,
              display_name: mockPlayer.display_name,
              color: mockPlayer.color,
              team: mockPlayer.team,
            },
          ],
        },
      ];

      mockValidationMiddleware.validateQueryParams.mockReturnValue({
        success: true,
        data: mockQuery,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: true,
        data: mockSessionsWithPlayers,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=f47ac10b-58cc-4372-a567-0e02b2c3d479&status=active'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSessionsWithPlayers);
      expect(
        mockSessionsService.getSessionsByBoardIdWithPlayers
      ).toHaveBeenCalledWith('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'active');
    });

    it('uses default status when not provided', async () => {
      const mockQuery = {
        boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      };

      mockValidationMiddleware.validateQueryParams.mockReturnValue({
        success: true,
        data: mockQuery,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: true,
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );

      await GET(request);

      expect(
        mockSessionsService.getSessionsByBoardIdWithPlayers
      ).toHaveBeenCalledWith('f47ac10b-58cc-4372-a567-0e02b2c3d479', undefined);
    });

    it('returns 500 when service fails', async () => {
      const mockQuery = {
        boardId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      };

      mockValidationMiddleware.validateQueryParams.mockReturnValue({
        success: true,
        data: mockQuery,
      });
      mockValidationMiddleware.isValidationError.mockReturnValue(false);

      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database error',
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });
});
