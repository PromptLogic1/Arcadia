/**
 * @jest-environment node
 */

import { gameStateService } from '../game-state.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { MarkCellData, CompleteGameData } from '../game-state.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

// Mock validation schemas and transforms
jest.mock('@/lib/validation/schemas/bingo', () => ({
  boardStateSchema: {
    safeParse: jest.fn().mockReturnValue({
      success: true,
      data: [
        { id: 'cell-1', is_marked: false, last_updated: Date.now() },
        { id: 'cell-2', is_marked: true, last_updated: Date.now() - 1000 },
      ],
    }),
  },
}));

jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn().mockImplementation(data => data),
  transformBoardCell: jest.fn().mockImplementation(data => data),
}));

const mockSupabaseClient = {
  from: jest.fn(),
};

// Import the mocked modules to access their functions
import { boardStateSchema } from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformBoardCell,
} from '@/lib/validation/transforms';

describe('gameStateService - Enhanced Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Reset mock implementations to default behavior
    (boardStateSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: [
        { id: 'cell-1', is_marked: false, last_updated: Date.now() },
        { id: 'cell-2', is_marked: true, last_updated: Date.now() - 1000 },
      ],
    });

    (transformBoardState as jest.Mock).mockImplementation(data => data);
    (transformBoardCell as jest.Mock).mockImplementation(data => data);
  });

  describe('enhanced error handling coverage', () => {
    it('should handle session update failure in startSession (lines 114-116)', async () => {
      // Mock session validation to pass
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: 'host-123', status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      // Mock player count to pass
      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 3,
            error: null,
          }),
        }),
      };

      // Mock session update to fail
      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Update failed' },
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCountQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await gameStateService.startSession(
        'session-123',
        'host-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error starting session',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'startSession',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('should handle player count error in startSession (line 99)', async () => {
      // Mock session validation to pass
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { host_id: 'host-123', status: 'waiting' },
              error: null,
            }),
          }),
        }),
      };

      // Mock player count to fail
      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Count failed' },
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCountQuery);

      const result = await gameStateService.startSession(
        'session-123',
        'host-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count failed');
    });

    it('should handle complex error in completeGame (lines 275-393)', async () => {
      // Mock session validation to pass
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                status: 'active',
                started_at: '2024-01-01T00:00:00Z',
                board_id: 'board-123',
              },
              error: null,
            }),
          }),
        }),
      };

      // Mock session update to fail
      const mockSessionUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Session update failed' },
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockSessionUpdateQuery);

      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session update failed');
    });

    it('should handle failed board state parsing in markCell (lines 164-231)', async () => {
      // Mock board state schema to fail parsing
      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: 'Invalid board state',
      });

      // Mock session to return invalid state
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_state: 'invalid-state',
                version: 3,
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockSessionQuery);

      const markData: MarkCellData = {
        cell_position: 5,
        user_id: 'user-456',
        action: 'mark',
        version: 3,
      };

      const result = await gameStateService.markCell('session-123', markData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state in database');
    });

    it('should handle database errors in getBoardState (lines 461,466-469)', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting board state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getBoardState',
            sessionId: 'session-123',
          }),
        })
      );
    });

    it('should handle empty session in getBoardState (line 461)', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle invalid board state in getBoardState (lines 466-469)', async () => {
      // Mock validation to fail
      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: 'Invalid format',
      });

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_state: 'invalid-state',
                version: 5,
              },
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state in database');
    });

    it('should handle non-PGRST116 error in completeGame stats (lines 301-312)', async () => {
      // Mock session validation to pass
      const mockSessionSingle = jest.fn().mockResolvedValue({
        data: {
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          board_id: 'board-123',
        },
        error: null,
      });

      const mockSessionEq = jest.fn().mockReturnValue({
        single: mockSessionSingle,
      });

      const mockSessionSelect = jest.fn().mockReturnValue({
        eq: mockSessionEq,
      });

      // Mock successful session update
      const mockUpdateEq = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      // Mock stats fetch with non-PGRST116 error
      const mockStatsSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'SOME_OTHER_ERROR', message: 'Stats error' },
      });

      const mockStatsEq = jest.fn().mockReturnValue({
        single: mockStatsSingle,
      });

      const mockStatsSelect = jest.fn().mockReturnValue({
        eq: mockStatsEq,
      });

      // Mock successful upsert
      const mockUpsert = jest.fn().mockResolvedValue({
        error: null,
      });

      // Mock achievement creation
      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      // Set up the sequential calls
      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSessionSelect })
        .mockReturnValueOnce({ update: mockUpdate })
        .mockReturnValueOnce({ select: mockStatsSelect })
        .mockReturnValueOnce({ upsert: mockUpsert })
        .mockReturnValueOnce({ insert: mockInsert });

      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [
          {
            id: 'player-1',
            session_id: 'session-123',
            user_id: 'user-456',
            score: 85,
            color: 'blue',
            position: 1,
            joined_at: '2024-01-01T00:00:00Z',
            avatar_url: null,
            created_at: '2024-01-01T00:00:00Z',
            display_name: 'Player 1',
            is_host: false,
            is_ready: true,
            left_at: null,
            team: null,
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      // The method should still complete successfully but log a warning
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

    it('should handle database errors in getGameResults (lines 422-424)', async () => {
      // Create a proper mock chain for getGameResults
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await gameStateService.getGameResults('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting game results',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getGameResults',
            sessionId: 'session-123',
          }),
        })
      );
    });
  });

  describe('success scenarios for verification', () => {
    it('should handle successful session state retrieval', async () => {
      const mockSession = {
        id: 'session-123',
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

      // Create proper mock chain for getSessionState
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await gameStateService.getSessionState('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
    });

    it('should handle successful game results retrieval', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          session_id: 'session-123',
          user_id: 'user-456',
          score: 95,
          color: 'blue',
          position: 1,
          joined_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'player-2',
          session_id: 'session-123',
          user_id: 'user-789',
          score: 78,
          color: 'red',
          position: 2,
          joined_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Create proper mock chain for getGameResults
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockPlayers,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await gameStateService.getGameResults('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
    });
  });
});
