/**
 * @jest-environment node
 */

import { gameStateService } from '../game-state.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { MarkCellData, CompleteGameData } from '../game-state.service';
import type { Tables, TablesUpdate } from '@/types/database.types';
import type { BoardCell } from '@/types/domains/bingo';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo');
jest.mock('@/lib/validation/transforms');

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  upsert: jest.fn(),
};

describe('gameStateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Reset all mocks to clean state
    Object.values(mockFrom).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });

    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior for all methods
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.upsert.mockReturnValue(mockFrom);

    // Set default return values to prevent errors
    mockFrom.single.mockResolvedValue({ data: null, error: null });
    mockFrom.order.mockResolvedValue({ data: [], error: null });
    mockFrom.upsert.mockResolvedValue({ error: null });
    mockFrom.insert.mockResolvedValue({ error: null });

    // Mock validation schemas
    const mockSchema = {
      safeParse: jest.fn().mockReturnValue({
        success: true,
        data: [
          { id: 'cell-1', is_marked: false, last_updated: Date.now() },
          { id: 'cell-2', is_marked: true, last_updated: Date.now() - 1000 },
        ],
      }),
    };

    jest.doMock('@/lib/validation/schemas/bingo', () => ({
      boardStateSchema: mockSchema,
    }));

    // Mock transform functions
    jest.doMock('@/lib/validation/transforms', () => ({
      transformBoardState: jest.fn().mockImplementation(data => data),
      transformBoardCell: jest.fn().mockImplementation(data => data),
    }));
  });

  describe('getSessionState', () => {
    it('should fetch session state successfully', async () => {
      const sessionId = 'session-123';
      const mockSession: Tables<'bingo_sessions'> = {
        id: sessionId,
        host_id: 'host-456',
        board_id: 'board-789',
        status: 'active',
        current_state: [],
        version: 1,
        max_players: 4,
        is_public: true,
        join_code: 'ABC123',
        started_at: null,
        ended_at: null,
        winner_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.getSessionState(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', sessionId);
    });

    it('should handle session not found', async () => {
      const sessionId = 'nonexistent-session';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await gameStateService.getSessionState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle database errors', async () => {
      const sessionId = 'session-123';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await gameStateService.getSessionState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting session state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getSessionState',
            sessionId,
          }),
        })
      );
    });

    it('should handle unexpected errors', async () => {
      const sessionId = 'session-123';

      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await gameStateService.getSessionState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting session state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getSessionState',
            sessionId,
          }),
        })
      );
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';

      // Create separate mock instances for different calls
      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCountFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      };

      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      // Mock the from calls in sequence
      mockSupabase.from
        .mockReturnValueOnce(mockSessionFrom)
        .mockReturnValueOnce(mockPlayerCountFrom)
        .mockReturnValueOnce(mockUpdateFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should handle session update failure', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCountFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      };

      // Mock update error (lines 114-116)
      const mockUpdateFrom = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionFrom)
        .mockReturnValueOnce(mockPlayerCountFrom)
        .mockReturnValueOnce(mockUpdateFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error starting session',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'startSession',
            sessionId,
          }),
        })
      );
    });

    it('should handle player count error', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      // Mock player count error (line 99)
      const mockPlayerCountFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Count failed' },
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionFrom)
        .mockReturnValueOnce(mockPlayerCountFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count failed');
    });

    it('should reject non-host users', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';
      const nonHostId = 'user-789';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockSessionFrom);

      const result = await gameStateService.startSession(sessionId, nonHostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the host can start the session');
    });

    it('should reject if session not in waiting state', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'active' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockSessionFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not in waiting state');
    });

    it('should reject if not enough players', async () => {
      const sessionId = 'session-123';
      const hostId = 'host-456';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: hostId, status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCountFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
            error: null,
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionFrom)
        .mockReturnValueOnce(mockPlayerCountFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Need at least 2 players to start');
    });

    it('should handle session not found', async () => {
      const sessionId = 'nonexistent-session';
      const hostId = 'host-456';

      const mockSessionFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Session not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockSessionFrom);

      const result = await gameStateService.startSession(sessionId, hostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('markCell', () => {
    it('should mark cell successfully', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: [
          { id: 'cell-5', is_marked: false, last_updated: Date.now() - 5000 },
        ],
        version: 3,
        status: 'active',
      };

      const updatedSession = {
        current_state: [
          { id: 'cell-5', is_marked: true, last_updated: Date.now() },
        ],
        version: 4,
      };

      // Mock session fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock event logging
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(4);
    });

    it('should handle failed session update', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: [
          { id: 'cell-5', is_marked: false, last_updated: Date.now() - 5000 },
        ],
        version: 3,
        status: 'active',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update failure (line 191-194)
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null, // Failed update
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update session');
    });

    it('should handle event logging failure gracefully', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: [
          { id: 'cell-5', is_marked: false, last_updated: Date.now() - 5000 },
        ],
        version: 3,
        status: 'active',
      };

      const updatedSession = {
        current_state: [
          { id: 'cell-5', is_marked: true, last_updated: Date.now() },
        ],
        version: 4,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock event logging failure (lines 213-222)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Failed to log event' },
        }),
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to log cell marking event',
        {
          metadata: {
            error: { message: 'Failed to log event' },
            sessionId,
            userId: markData.user_id,
            cell_position: markData.cell_position,
          },
        }
      );
    });

    it('should handle failed board state parsing after update', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: [
          { id: 'cell-5', is_marked: false, last_updated: Date.now() - 5000 },
        ],
        version: 3,
        status: 'active',
      };

      const updatedSession = {
        current_state: 'invalid-state-after-update',
        version: 4,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock validation failure for updated state (lines 224-229)
      const mockSchema = {
        safeParse: jest
          .fn()
          .mockReturnValueOnce({
            success: true,
            data: mockSession.current_state,
          }) // First call succeeds
          .mockReturnValueOnce({
            success: false,
            error: 'Invalid updated state',
          }), // Second call fails
      };

      jest.doMock('@/lib/validation/schemas/bingo', () => ({
        boardStateSchema: mockSchema,
      }));

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse updated board state');
    });

    it('should unmark cell successfully', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'unmark',
        version: 3,
      };

      const mockSession = {
        current_state: [
          { id: 'cell-5', is_marked: true, last_updated: Date.now() - 5000 },
        ],
        version: 3,
        status: 'active',
      };

      // Mock session fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { current_state: [], version: 4 },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock event logging
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(true);
    });

    it('should handle version conflict', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 2, // Outdated version
      };

      const mockSession = {
        current_state: [],
        version: 3, // Current version is newer
        status: 'active',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_CONFLICT');
    });

    it('should handle inactive session', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: [],
        version: 3,
        status: 'completed',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not active');
    });

    it('should handle invalid board state', async () => {
      const sessionId = 'session-123';
      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const mockSession = {
        current_state: 'invalid-state',
        version: 3,
        status: 'active',
      };

      // Mock validation failure
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: 'Invalid format',
        }),
      };

      jest.doMock('@/lib/validation/schemas/bingo', () => ({
        boardStateSchema: mockSchema,
      }));

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.markCell(sessionId, markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state in database');
    });
  });

  describe('completeGame', () => {
    it('should complete game successfully', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1', 'diagonal'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: sessionId,
            user_id: 'user-456',
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'player-2',
            session_id: sessionId,
            user_id: 'user-789',
            score: 65,
            color: 'red',
            position: 2,
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      // Mock session verification
      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock user stats fetching and updating for each player
      gameData.players.forEach(() => {
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  total_games: 10,
                  total_score: 800,
                  games_completed: 8,
                  games_won: 3,
                  current_win_streak: 1,
                  longest_win_streak: 2,
                  fastest_win: 120,
                  total_playtime: 3600,
                  highest_score: 90,
                },
                error: null,
              }),
            }),
          }),
        });

        mockSupabase.from.mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({
            error: null,
          }),
        });
      });

      // Mock achievement creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should handle session update failure', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update error (line 291)
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Session update failed' },
          }),
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session update failed');
    });

    it('should handle stats update errors gracefully', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: sessionId,
            user_id: 'user-456',
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock stats fetch with non-PGRST116 error (lines 301-312)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'SOME_OTHER_ERROR', message: 'Stats error' },
            }),
          }),
        }),
      });

      // Mock achievement creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to fetch user stats',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: { code: 'SOME_OTHER_ERROR', message: 'Stats error' },
            service: 'gameStateService',
            method: 'completeGame',
            userId: 'user-456',
          }),
        })
      );
    });

    it('should handle stats upsert failure', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: sessionId,
            user_id: 'user-456',
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock successful stats fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                total_games: 10,
                total_score: 800,
                games_completed: 8,
                games_won: 3,
                current_win_streak: 1,
                longest_win_streak: 2,
                fastest_win: 120,
                total_playtime: 3600,
                highest_score: 90,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock stats upsert failure (lines 353-362)
      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Upsert failed' },
        }),
      });

      // Mock achievement creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to update player stats',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: { message: 'Upsert failed' },
            service: 'gameStateService',
            method: 'completeGame',
            userId: 'user-456',
          }),
        })
      );
    });

    it('should handle achievement creation failure', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock achievement creation failure (lines 382-391)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Achievement creation failed' },
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to award win achievement',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: { message: 'Achievement creation failed' },
            service: 'gameStateService',
            method: 'completeGame',
            userId: 'user-456',
          }),
        })
      );
    });

    it('should calculate win streak reset for non-winners', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: sessionId,
            user_id: 'user-456', // Winner
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'player-2',
            session_id: sessionId,
            user_id: 'user-789', // Non-winner (line 342-344)
            score: 65,
            color: 'red',
            position: 2,
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock stats for winner
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                total_games: 10,
                total_score: 800,
                games_completed: 8,
                games_won: 3,
                current_win_streak: 1,
                longest_win_streak: 2,
                fastest_win: 120,
                total_playtime: 3600,
                highest_score: 90,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock stats for non-winner
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                total_games: 5,
                total_score: 400,
                games_completed: 4,
                games_won: 1,
                current_win_streak: 2, // Should be reset to 0
                longest_win_streak: 2,
                fastest_win: 180,
                total_playtime: 1800,
                highest_score: 70,
              },
              error: null,
            }),
          }),
        }),
      });

      const mockUpsert = jest.fn().mockResolvedValue({
        error: null,
      });
      mockSupabase.from.mockReturnValueOnce({
        upsert: mockUpsert,
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);

      // Verify non-winner's streak was reset to 0
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          current_win_streak: 0,
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should handle inactive session', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [],
      };

      const mockSession = {
        status: 'waiting',
        started_at: null,
        board_id: 'board-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not active');
    });

    it('should handle session not found', async () => {
      const sessionId = 'nonexistent-session';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [],
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle stats update errors gracefully', async () => {
      const sessionId = 'session-123';
      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: sessionId,
            user_id: 'user-456',
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const mockSession = {
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        board_id: 'board-123',
      };

      // Mock session verification
      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock session update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock stats fetch error
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Stats fetch failed' },
            }),
          }),
        }),
      });

      // Mock achievement creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await gameStateService.completeGame(sessionId, gameData);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to fetch user stats',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: { message: 'Stats fetch failed' },
            service: 'gameStateService',
            method: 'completeGame',
            userId: 'user-456',
          }),
        })
      );
    });
  });

  describe('getGameResults', () => {
    it('should fetch game results successfully', async () => {
      const sessionId = 'session-123';
      const mockPlayers = [
        {
          id: 'player-1',
          session_id: sessionId,
          user_id: 'user-456',
          score: 95,
          color: 'blue',
          position: 1,
          joined_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'player-2',
          session_id: sessionId,
          user_id: 'user-789',
          score: 78,
          color: 'red',
          position: 2,
          joined_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: mockPlayers,
        error: null,
      });

      const result = await gameStateService.getGameResults(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_players');
      expect(mockFrom.eq).toHaveBeenCalledWith('session_id', sessionId);
      expect(mockFrom.order).toHaveBeenCalledWith('score', {
        ascending: false,
      });
    });

    it('should handle empty results', async () => {
      const sessionId = 'session-123';

      mockFrom.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await gameStateService.getGameResults(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const sessionId = 'session-123';

      mockFrom.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await gameStateService.getGameResults(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting game results',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getGameResults',
            sessionId,
          }),
        })
      );
    });
  });

  describe('getBoardState', () => {
    it('should fetch board state successfully', async () => {
      const sessionId = 'session-123';
      const mockBoardState: BoardCell[] = [
        {
          id: 'cell-1',
          is_marked: false,
          last_updated: Date.now() - 1000,
          last_modified_by: null,
        },
        {
          id: 'cell-2',
          is_marked: true,
          last_updated: Date.now(),
          last_modified_by: 'user-456',
        },
      ];

      const mockSession = {
        current_state: mockBoardState,
        version: 5,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.getBoardState(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        boardState: mockBoardState,
        version: 5,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', sessionId);
    });

    it('should handle session not found', async () => {
      const sessionId = 'nonexistent-session';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await gameStateService.getBoardState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle invalid board state', async () => {
      const sessionId = 'session-123';

      const mockSession = {
        current_state: 'invalid-state',
        version: 5,
      };

      // Mock validation failure
      const mockSchema = {
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: 'Invalid format',
        }),
      };

      jest.doMock('@/lib/validation/schemas/bingo', () => ({
        boardStateSchema: mockSchema,
      }));

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await gameStateService.getBoardState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state in database');
    });

    it('should handle database errors', async () => {
      const sessionId = 'session-123';

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await gameStateService.getBoardState(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting board state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getBoardState',
            sessionId,
          }),
        })
      );
    });
  });
});
