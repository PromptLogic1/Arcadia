import { POST, PATCH, GET } from './route';
import { NextRequest, NextResponse } from 'next/server';
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
  withRateLimit: (handler: any) => handler,
  RATE_LIMIT_CONFIGS: {
    create: {},
    gameAction: {},
    read: {},
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserService = userService as jest.Mocked<typeof userService>;
const mockBingoBoardsService = bingoBoardsService as jest.Mocked<typeof bingoBoardsService>;
const mockSessionsService = sessionsService as jest.Mocked<typeof sessionsService>;

describe('Bingo Sessions API Route', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    username: 'testuser',
  };

  const mockBoard = {
    id: 'board-123',
    name: 'Test Board',
    status: 'active' as const,
    creator_id: 'user-123',
  };

  const mockSession = {
    id: 'session-123',
    board_id: 'board-123',
    host_id: 'user-123',
    status: 'waiting' as const,
  };

  const mockPlayer = {
    id: 'player-123',
    session_id: 'session-123',
    user_id: 'user-123',
    display_name: 'testuser',
    color: '#3B82F6',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bingo/sessions', () => {
    it('creates a session successfully when user is authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: mockBoard,
      });

      mockSessionsService.createSession.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      mockSessionsService.joinSession.mockResolvedValue({
        success: true,
        data: mockPlayer,
      });

      mockSessionsService.updatePlayerReady.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const mockBody = {
        boardId: 'board-123',
        settings: {
          max_players: 8,
          allow_spectators: true,
        },
      };

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
        board_id: 'board-123',
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
        error: 'Not authenticated',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify({ boardId: 'board-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 when board is not found', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: false,
        error: 'Board not found',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify({ boardId: 'board-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Board not found' });
    });

    it('returns 400 when board is not active and user is not creator', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: {
          ...mockBoard,
          status: 'draft' as const,
          creator_id: 'other-user',
        },
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify({ boardId: 'board-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Board is not active');
    });

    it('cleans up session when joining as host fails', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      mockBingoBoardsService.getBoardById.mockResolvedValue({
        success: true,
        data: mockBoard,
      });

      mockSessionsService.createSession.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      mockSessionsService.joinSession.mockResolvedValue({
        success: false,
        error: 'Failed to join',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'POST',
        body: JSON.stringify({ boardId: 'board-123' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockSessionsService.deleteSession).toHaveBeenCalledWith('session-123');
    });
  });

  describe('PATCH /api/bingo/sessions', () => {
    it('updates session successfully', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockSessionsService.updateSession.mockResolvedValue({
        session: { ...mockSession, status: 'active' as const },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: 'session-123',
          status: 'active',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('active');
      expect(mockSessionsService.updateSession).toHaveBeenCalledWith(
        'session-123',
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
        error: 'Not authenticated',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify({ sessionId: 'session-123' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 when update fails', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockSessionsService.updateSession.mockResolvedValue({
        session: null,
        error: 'Update failed',
      });

      const request = new NextRequest('http://localhost/api/bingo/sessions', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: 'session-123',
          status: 'active',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });
  });

  describe('GET /api/bingo/sessions', () => {
    it('retrieves sessions successfully', async () => {
      const mockSessionsWithPlayers = [
        {
          ...mockSession,
          players: [mockPlayer],
        },
      ];

      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: true,
        data: mockSessionsWithPlayers,
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=board-123&status=active'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSessionsWithPlayers);
      expect(mockSessionsService.getSessionsByBoardIdWithPlayers).toHaveBeenCalledWith(
        'board-123',
        'active'
      );
    });

    it('uses default status when not provided', async () => {
      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: true,
        data: [],
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=board-123'
      );

      await GET(request);

      expect(mockSessionsService.getSessionsByBoardIdWithPlayers).toHaveBeenCalledWith(
        'board-123',
        undefined
      );
    });

    it('returns 500 when service fails', async () => {
      mockSessionsService.getSessionsByBoardIdWithPlayers.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = new NextRequest(
        'http://localhost/api/bingo/sessions?boardId=board-123'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });
});