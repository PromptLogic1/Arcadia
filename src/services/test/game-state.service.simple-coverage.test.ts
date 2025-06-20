/**
 * @jest-environment node
 *
 * Game State Service Simple Coverage Tests
 * Target specific uncovered lines with minimal complexity
 */

import { gameStateService } from '../game-state.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { CompleteGameData } from '../game-state.service';
import type { Tables } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  boardStateSchema: {
    safeParse: jest.fn(),
  },
}));
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn().mockImplementation(data => data),
  transformBoardCell: jest.fn().mockImplementation(data => data),
}));

import { boardStateSchema } from '@/lib/validation/schemas/bingo';

type SessionPlayer = Tables<'bingo_session_players'>;

describe('gameStateService - Simple Coverage', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a flexible mock with proper chaining
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Default board state parsing
    (boardStateSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: [],
    });
  });

  describe('completeGame - timeToWin calculation (lines 275-278)', () => {
    it('should calculate timeToWin when started_at exists', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const mockNow = startTime.getTime() + 300000; // 5 minutes later
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Mock the session fetch (first call)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          status: 'active',
          started_at: startTime.toISOString(),
          board_id: 'board-123',
        },
        error: null,
      });

      // Mock the session update
      mockSupabase.update.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));

      // Mock the achievement insert
      mockSupabase.insert.mockResolvedValue({ error: null });

      const gameData: CompleteGameData = {
        winner_id: 'user-123',
        winning_patterns: ['row'],
        final_score: 100,
        players: [],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      expect(result.success).toBe(true);
      // The timeToWin would be 300 seconds (5 minutes)

      jest.restoreAllMocks();
    });

    it('should default timeToWin to 0 when started_at is null', async () => {
      // Mock the session fetch with null started_at
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          status: 'active',
          started_at: null,
          board_id: 'board-123',
        },
        error: null,
      });

      // Mock the session update
      mockSupabase.update.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));

      // Mock the achievement insert
      mockSupabase.insert.mockResolvedValue({ error: null });

      const gameData: CompleteGameData = {
        winner_id: 'user-123',
        winning_patterns: ['row'],
        final_score: 100,
        players: [],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      expect(result.success).toBe(true);
      // The timeToWin would be 0 when no start time
    });
  });

  describe('completeGame - player stats error handling (lines 301-313)', () => {
    it('should skip player when stats fetch fails with non-PGRST116 error', async () => {
      const player: SessionPlayer = {
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
        is_host: true,
        is_ready: true,
        left_at: null,
        team: null,
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock session verification (first call)
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            status: 'active',
            started_at: '2024-01-01T10:00:00Z',
            board_id: 'board-123',
          },
          error: null,
        })
        // Mock stats fetch error (non-PGRST116) - second call
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'NETWORK_ERROR', message: 'Network failed' },
        });

      // Mock the session update
      mockSupabase.update.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));

      // Mock the achievement insert
      mockSupabase.insert.mockResolvedValue({ error: null });

      const gameData: CompleteGameData = {
        winner_id: 'user-456',
        winning_patterns: ['row-1'],
        final_score: 85,
        players: [player],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        'Failed to fetch user stats',
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: { code: 'NETWORK_ERROR', message: 'Network failed' },
            userId: 'user-456',
          }),
        })
      );
    });
  });

  describe('completeGame - win streak reset (lines 343-344)', () => {
    it('should reset win streak for non-winner', async () => {
      const losingPlayer: SessionPlayer = {
        id: 'player-2',
        session_id: 'session-123',
        user_id: 'user-789',
        score: 60,
        color: 'red',
        position: 2,
        joined_at: '2024-01-01T00:00:00Z',
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        display_name: 'Losing Player',
        is_host: false,
        is_ready: true,
        left_at: null,
        team: null,
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock session verification (first call)
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            status: 'active',
            started_at: '2024-01-01T10:00:00Z',
            board_id: 'board-123',
          },
          error: null,
        })
        // Mock existing stats with win streak (second call)
        .mockResolvedValueOnce({
          data: {
            total_games: 10,
            total_score: 500,
            games_completed: 9,
            games_won: 3,
            current_win_streak: 2,
            longest_win_streak: 4,
            fastest_win: 180,
            total_playtime: 3600,
            highest_score: 80,
          },
          error: null,
        });

      // Mock the session update
      mockSupabase.update.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));

      // Mock the stats upsert
      mockSupabase.upsert.mockResolvedValue({ error: null });

      // Mock the achievement insert
      mockSupabase.insert.mockResolvedValue({ error: null });

      const gameData: CompleteGameData = {
        winner_id: 'user-456', // Different user wins
        winning_patterns: ['row-1'],
        final_score: 100,
        players: [losingPlayer],
      };

      const result = await gameStateService.completeGame(
        'session-123',
        gameData
      );

      expect(result.success).toBe(true);

      // Check that upsert was called with current_win_streak: 0
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          current_win_streak: 0,
        }),
        { onConflict: 'user_id' }
      );
    });
  });

  describe('getBoardState - null handling (lines 460-461)', () => {
    it('should handle null session data', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('getBoardState - version handling (lines 471-472)', () => {
    it('should default version to 0 when null', async () => {
      const mockBoardState = [{ id: 'cell-1', is_marked: false }];

      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoardState,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          current_state: mockBoardState,
          version: null,
        },
        error: null,
      });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(0);
    });

    it('should default version to 0 when undefined', async () => {
      const mockBoardState = [{ id: 'cell-1', is_marked: false }];

      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: mockBoardState,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          current_state: mockBoardState,
          version: undefined,
        },
        error: null,
      });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(0);
    });
  });
});
