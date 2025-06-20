/**
 * @jest-environment node
 */

import { gameStateService } from '../game-state.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { MarkCellData } from '../game-state.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

// Mock validation schemas and transforms
jest.mock('@/lib/validation/schemas/bingo', () => ({
  boardStateSchema: {
    safeParse: jest.fn(),
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

describe('gameStateService - Coverage Enhancement', () => {
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
  });

  describe('critical edge cases', () => {
    it('should handle session not found in getSessionState', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getSessionState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle database error in getSessionState', async () => {
      const dbError = { message: 'Database connection failed' };
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getSessionState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Error getting session state',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'gameStateService',
            method: 'getSessionState',
            sessionId: 'session-123',
          }),
        })
      );
    });

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

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSession,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getSessionState('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
    });

    it('should handle failed board state parsing in markCell', async () => {
      // Mock board state schema to fail parsing
      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: 'Invalid board state',
      });

      // Mock session to return invalid state
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          current_state: 'invalid-state',
          version: 3,
          status: 'active',
        },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

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

    it('should handle empty session in getBoardState', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle invalid board state in getBoardState', async () => {
      // Mock validation to fail
      (boardStateSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: 'Invalid format',
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          current_state: 'invalid-state',
          version: 5,
        },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid board state in database');
    });

    it('should handle database errors in getBoardState', async () => {
      const dbError = { message: 'Database connection failed' };
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

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

    it('should handle database errors in getGameResults', async () => {
      const dbError = { message: 'Database error' };
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

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

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockPlayers,
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getGameResults('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
    });

    it('should handle successful board state retrieval', async () => {
      const now = Date.now();
      const mockBoardState = [
        { id: 'cell-1', is_marked: false, last_updated: now },
        { id: 'cell-2', is_marked: true, last_updated: now - 1000 },
      ];

      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          current_state: mockBoardState,
          version: 5,
        },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await gameStateService.getBoardState('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        boardState: mockBoardState,
        version: 5,
      });
    });
  });
});
