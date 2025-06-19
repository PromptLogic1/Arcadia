/**
 * @jest-environment jsdom
 */

import { sessionsService } from '../sessions.service.client';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { generateSessionCode } from '@/lib/crypto-utils';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/crypto-utils', () => ({
  generateSessionCode: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockLog = log as jest.Mocked<typeof log>;
const mockGenerateSessionCode = generateSessionCode as jest.MockedFunction<
  typeof generateSessionCode
>;

describe('Sessions Service Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase as never);
  });

  describe('getSessionById', () => {
    const sessionId = 'session-123';
    const mockSession = {
      id: sessionId,
      board_id: 'board-123',
      host_id: 'user-123',
      status: 'waiting',
      session_code: 'ABC123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('returns session when found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', sessionId);
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('returns error when session not found', async () => {
      const error = { message: 'Session not found', code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get session by ID',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionById',
            sessionId,
          }),
        })
      );
    });

    it('handles database connection errors', async () => {
      const error = { message: 'Connection failed', code: 'CONNECTION_ERROR' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });

    it('handles unexpected errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'));

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting session by ID',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionById',
            sessionId,
          }),
        })
      );
    });

    it('handles non-Error exceptions', async () => {
      mockSupabase.single.mockRejectedValue('String error');

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('getSessionsWithStats', () => {
    const mockSessionStats = [
      {
        id: 'session-1',
        host_id: 'user-1',
        board_id: 'board-1',
        status: 'waiting',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        board_title: 'Test Board',
        host_username: 'testuser',
        current_player_count: 2,
        has_password: false,
      },
      {
        id: 'session-2',
        host_id: 'user-2',
        board_id: 'board-2',
        status: 'active',
        created_at: '2024-01-01T01:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        board_title: 'Another Board',
        host_username: 'anotheruser',
        current_player_count: 4,
        has_password: true,
      },
    ];

    it('returns sessions with no filters', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionStats);
      expect(mockSupabase.from).toHaveBeenCalledWith('session_stats');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });

    it('applies search filter', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { search: 'test' };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'board_title.ilike.%test%,host_username.ilike.%test%'
      );
    });

    it('applies game category filter', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { gameCategory: 'Bingo' as never };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).toHaveBeenCalledWith('board_game_type', 'Bingo');
    });

    it('applies difficulty filter', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { difficulty: 'easy' as never };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).toHaveBeenCalledWith('board_difficulty', 'easy');
    });

    it('applies status filter for active sessions', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { status: 'active' as const };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('applies status filter for waiting sessions', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { status: 'waiting' as const };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'waiting');
    });

    it('filters out private sessions when showPrivate is false', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { showPrivate: false };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).toHaveBeenCalledWith('has_password', false);
    });

    it('includes private sessions when showPrivate is true', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
      });

      const filters = { showPrivate: true };
      await sessionsService.getSessionsWithStats(filters);

      expect(mockSupabase.eq).not.toHaveBeenCalledWith('has_password', false);
    });

    it('filters out invalid sessions (missing required fields)', async () => {
      const invalidSessionStats = [
        ...mockSessionStats,
        {
          id: null, // Invalid - missing required ID
          host_id: 'user-3',
          board_id: 'board-3',
          status: 'waiting',
          created_at: '2024-01-01T02:00:00Z',
          updated_at: '2024-01-01T02:00:00Z',
        },
        {
          id: 'session-4',
          host_id: null, // Invalid - missing required host_id
          board_id: 'board-4',
          status: 'waiting',
          created_at: '2024-01-01T03:00:00Z',
          updated_at: '2024-01-01T03:00:00Z',
        },
      ];

      mockSupabase.single.mockResolvedValue({
        data: invalidSessionStats,
        error: null,
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionStats); // Only valid sessions returned
      expect(result.data).toHaveLength(2);
    });

    it('handles database errors', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get sessions with stats',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionsWithStats',
          }),
        })
      );
    });

    it('handles unexpected errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'));

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles null data response', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getSessionsByBoardIdWithPlayers', () => {
    const boardId = 'board-123';
    const mockSessionsWithPlayers = [
      {
        id: 'session-1',
        board_id: boardId,
        host_id: 'user-1',
        status: 'waiting',
        bingo_session_players: [
          {
            user_id: 'user-1',
            display_name: 'Player 1',
            color: 'blue',
            team: 1,
          },
          {
            user_id: 'user-2',
            display_name: 'Player 2',
            color: 'red',
            team: 2,
          },
        ],
      },
    ];

    it('returns sessions with players for board ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionsWithPlayers,
        error: null,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionsWithPlayers);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
      expect(mockSupabase.select).toHaveBeenCalledWith(`
          *,
          bingo_session_players (
            user_id,
            display_name,
            color,
            team
          )
        `);
      expect(mockSupabase.eq).toHaveBeenCalledWith('board_id', boardId);
    });

    it('filters by status when provided', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionsWithPlayers,
        error: null,
      });

      const status = 'waiting' as never;
      await sessionsService.getSessionsByBoardIdWithPlayers(boardId, status);

      expect(mockSupabase.eq).toHaveBeenCalledWith('board_id', boardId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', status);
    });

    it('handles sessions with no players', async () => {
      const sessionsWithoutPlayers = [
        {
          id: 'session-1',
          board_id: boardId,
          host_id: 'user-1',
          status: 'waiting',
          bingo_session_players: null, // No players
        },
      ];

      mockSupabase.single.mockResolvedValue({
        data: sessionsWithoutPlayers,
        error: null,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          ...sessionsWithoutPlayers[0],
          bingo_session_players: [], // Transformed to empty array
        },
      ]);
    });

    it('handles database errors', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get sessions with players by board ID',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId,
          }),
        })
      );
    });

    it('handles unexpected errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'));

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles null data response', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('generateSessionCode', () => {
    it('exports generateSessionCode function', () => {
      mockGenerateSessionCode.mockReturnValue('ABC123');

      const result = sessionsService.generateSessionCode();

      expect(result).toBe('ABC123');
      expect(mockGenerateSessionCode).toHaveBeenCalled();
    });
  });
});
