/**
 * @jest-environment jsdom
 */

import { sessionsService } from '../sessions.service.client';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { generateSessionCode } from '@/lib/crypto-utils';
import {
  createMockSupabaseClient,
  MockSupabaseQueryBuilder,
  setupSupabaseMock,
} from '@/lib/test/mocks/supabase.mock';

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

const mockSupabaseClient = createMockSupabaseClient();
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
    setupSupabaseMock(mockSupabaseClient);
    mockCreateClient.mockReturnValue(mockSupabaseClient);
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
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSession);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bingo_sessions');
    });

    it('returns error when session not found', async () => {
      const error = { message: 'Session not found', code: 'PGRST116' };
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null, error);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null, error);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });

    it('handles unexpected errors', async () => {
      mockSupabaseClient.from = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

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
      mockSupabaseClient.from = jest.fn().mockImplementation(() => {
        throw 'String error';
      });

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
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionStats);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('session_stats');
    });

    it('applies search filter', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const orSpy = jest.spyOn(mockQueryBuilder, 'or');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { search: 'test' };
      await sessionsService.getSessionsWithStats(filters);

      expect(orSpy).toHaveBeenCalledWith(
        'board_title.ilike.%test%,host_username.ilike.%test%'
      );
    });

    it('applies game category filter', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { gameCategory: 'Bingo' as never };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).toHaveBeenCalledWith('board_game_type', 'Bingo');
    });

    it('applies difficulty filter', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { difficulty: 'easy' as never };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).toHaveBeenCalledWith('board_difficulty', 'easy');
    });

    it('applies status filter for active sessions', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { status: 'active' as const };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).toHaveBeenCalledWith('status', 'active');
    });

    it('applies status filter for waiting sessions', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { status: 'waiting' as const };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).toHaveBeenCalledWith('status', 'waiting');
    });

    it('filters out private sessions when showPrivate is false', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { showPrivate: false };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).toHaveBeenCalledWith('has_password', false);
    });

    it('includes private sessions when showPrivate is true', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionStats);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const filters = { showPrivate: true };
      await sessionsService.getSessionsWithStats(filters);

      expect(eqSpy).not.toHaveBeenCalledWith('has_password', false);
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

      const mockQueryBuilder = new MockSupabaseQueryBuilder(invalidSessionStats);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionStats); // Only valid sessions returned
      expect(result.data).toHaveLength(2);
    });

    it('handles database errors', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null, error);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
      mockSupabaseClient.from = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles null data response', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionsWithPlayers);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionsWithPlayers);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bingo_sessions');
    });

    it('filters by status when provided', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(mockSessionsWithPlayers);
      const eqSpy = jest.spyOn(mockQueryBuilder, 'eq');
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

      const status = 'waiting' as never;
      await sessionsService.getSessionsByBoardIdWithPlayers(boardId, status);

      expect(eqSpy).toHaveBeenCalledWith('board_id', boardId);
      expect(eqSpy).toHaveBeenCalledWith('status', status);
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

      const mockQueryBuilder = new MockSupabaseQueryBuilder(sessionsWithoutPlayers);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null, error);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
      mockSupabaseClient.from = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles null data response', async () => {
      const mockQueryBuilder = new MockSupabaseQueryBuilder(null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQueryBuilder);

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
