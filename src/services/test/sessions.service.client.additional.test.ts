/**
 * @jest-environment jsdom
 *
 * Additional Tests for Sessions Service Client - Coverage Enhancement
 *
 * Focuses on specific uncovered lines:
 * - lines 225-232,238,248-259,294-306,317-329
 * - Error handling in getSessionsWithStats catch block
 * - Error handling in getSessionsByBoardIdWithPlayers catch block
 * - Non-Error exceptions and edge cases
 */

import { sessionsService } from '../sessions.service.client';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

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

const mockSupabase: any = {
  from: jest.fn((): any => mockSupabase),
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

describe('Sessions Service Client - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase as never);
  });

  describe('getSessionsWithStats - Uncovered Error Paths', () => {
    it('handles database errors with proper logging (lines 225-232)', async () => {
      const error = {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR',
        details: 'Network timeout',
      };

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error,
      });

      const filters = { search: 'test', gameCategory: 'bingo' as never };
      const result = await sessionsService.getSessionsWithStats(filters);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get sessions with stats',
        expect.any(Error),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsWithStats',
            filters,
          },
        }
      );
    });

    it('handles invalid session data with null filtering (line 238)', async () => {
      const mixedSessionData = [
        {
          id: 'session-1',
          host_id: 'user-1',
          board_id: 'board-1',
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: null, // This will be filtered out (line 238)
          host_id: 'user-2',
          board_id: 'board-2',
          status: 'waiting',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
        {
          id: 'session-3',
          host_id: null, // This will be filtered out (line 239)
          board_id: 'board-3',
          status: 'waiting',
          created_at: '2024-01-01T02:00:00Z',
          updated_at: '2024-01-01T02:00:00Z',
        },
        {
          id: 'session-4',
          host_id: 'user-4',
          board_id: null, // This will be filtered out (line 240)
          status: 'waiting',
          created_at: '2024-01-01T03:00:00Z',
          updated_at: '2024-01-01T03:00:00Z',
        },
        {
          id: 'session-5',
          host_id: 'user-5',
          board_id: 'board-5',
          status: null, // This will be filtered out (line 241)
          created_at: '2024-01-01T04:00:00Z',
          updated_at: '2024-01-01T04:00:00Z',
        },
        {
          id: 'session-6',
          host_id: 'user-6',
          board_id: 'board-6',
          status: 'waiting',
          created_at: null, // This will be filtered out (line 242)
          updated_at: '2024-01-01T05:00:00Z',
        },
        {
          id: 'session-7',
          host_id: 'user-7',
          board_id: 'board-7',
          status: 'waiting',
          created_at: '2024-01-01T06:00:00Z',
          updated_at: null, // This will be filtered out (line 243)
        },
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mixedSessionData,
        error: null,
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only session-1 should pass validation
      if (result.success && result.data) {
        expect(result.data[0]!.id).toBe('session-1');
      }
    });

    it('handles unexpected exceptions in catch block (lines 248-259)', async () => {
      // Mock a non-Error exception
      mockSupabase.from.mockImplementation(() => {
        throw 'String exception'; // Non-Error exception
      });

      const filters = { difficulty: 'hard' as never };
      const result = await sessionsService.getSessionsWithStats(filters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String exception');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with stats',
        expect.any(Error), // Should be wrapped in Error
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsWithStats',
            filters,
          },
        }
      );
    });

    it('handles promise rejection with Error object (lines 248-259)', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.from.mockImplementation(() => {
        throw networkError;
      });

      const result = await sessionsService.getSessionsWithStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network request failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with stats',
        networkError,
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsWithStats',
            filters: {},
          },
        }
      );
    });
  });

  describe('getSessionsByBoardIdWithPlayers - Uncovered Error Paths', () => {
    const boardId = 'board-123';

    it('handles database errors with proper logging (lines 294-306)', async () => {
      const error = {
        message: 'Query timeout',
        code: 'TIMEOUT',
        details: 'Query execution exceeded limit',
      };

      // Mock the final query resolution to return an error
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error,
      });

      const result = await sessionsService.getSessionsByBoardIdWithPlayers(
        boardId,
        'active' as never
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get sessions with players by board ID',
        expect.any(Error),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId,
            status: 'active',
          },
        }
      );
    });

    it('handles unexpected exceptions in catch block (lines 317-329)', async () => {
      // Mock a complex object exception
      const complexError = {
        code: 'CUSTOM_ERROR',
        message: 'Complex error object',
        nested: { details: 'Deep error' },
      };

      mockSupabase.from.mockImplementation(() => {
        throw complexError;
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('[object Object]'); // getErrorMessage converts objects
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with players by board ID',
        expect.any(Error), // Should be wrapped in Error
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId,
            status: undefined,
          },
        }
      );
    });

    it('handles null data response edge case', async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('handles sessions with various null player configurations', async () => {
      const sessionsWithVariousPlayerStates = [
        {
          id: 'session-1',
          board_id: boardId,
          bingo_session_players: null, // Null players array
        },
        {
          id: 'session-2',
          board_id: boardId,
          bingo_session_players: undefined, // Undefined players array
        },
        {
          id: 'session-3',
          board_id: boardId,
          bingo_session_players: [], // Empty players array
        },
        {
          id: 'session-4',
          board_id: boardId,
          bingo_session_players: [
            {
              user_id: 'user-1',
              display_name: 'Player 1',
              color: 'blue',
              team: 1,
            },
          ], // Valid players array
        },
      ];

      // Reset the mock chain properly
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({
        data: sessionsWithVariousPlayerStates,
        error: null,
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      // Check that null and undefined are converted to empty arrays
      if (result.success && result.data) {
        expect(result.data[0]!.bingo_session_players).toEqual([]);
        expect(result.data[1]!.bingo_session_players).toEqual([]);
        expect(result.data[2]!.bingo_session_players).toEqual([]);
        expect(result.data[3]!.bingo_session_players).toHaveLength(1);
      }
    });

    it('handles TypeError from query chain', async () => {
      // Mock a TypeError that might occur in query chain
      mockSupabase.select.mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });

      const result =
        await sessionsService.getSessionsByBoardIdWithPlayers(boardId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read property of undefined');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting sessions with players by board ID',
        expect.any(TypeError),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId,
          }),
        })
      );
    });
  });

  describe('toStandardError Helper Coverage', () => {
    it('creates proper Error objects with cause property', async () => {
      const supabaseError = {
        message: 'Database error',
        code: 'DB_ERROR',
        details: 'Connection failed',
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: supabaseError,
      });

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(false);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get session by ID',
        expect.objectContaining({
          message: 'Database error',
          cause: {
            code: 'DB_ERROR',
            details: 'Connection failed',
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely large filter combinations', async () => {
      const complexFilters = {
        search: 'a'.repeat(1000), // Very long search term
        gameCategory: 'bingo' as never,
        difficulty: 'expert' as never,
        status: 'active' as const,
        showPrivate: true,
      };

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await sessionsService.getSessionsWithStats(complexFilters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);

      // Verify all filters were applied
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining(complexFilters.search)
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('board_game_type', 'bingo');
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        'board_difficulty',
        'expert'
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
      // showPrivate: true means no has_password filter is applied
    });

    it('handles status filter with "all" value', async () => {
      const filters = { status: 'all' as const };

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await sessionsService.getSessionsWithStats(filters);

      // When status is 'all', no status filter should be applied
      expect(mockSupabase.eq).not.toHaveBeenCalledWith(
        'status',
        expect.anything()
      );
    });

    it('handles concurrent query modifications', async () => {
      // Simulate a race condition where the query object is modified during execution
      let callCount = 0;
      mockSupabase.eq.mockImplementation((_field: string, _value: any) => {
        callCount++;
        if (callCount === 3) {
          throw new Error('Concurrent modification detected');
        }
        return mockSupabase;
      });

      const result = await sessionsService.getSessionsWithStats({
        gameCategory: 'trivia' as never,
        difficulty: 'medium' as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Concurrent modification detected');
    });
  });
});
