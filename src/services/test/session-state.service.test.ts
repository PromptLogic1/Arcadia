/**
 * Session State Service Tests
 *
 * Tests for session state management including session lifecycle,
 * player management, and real-time subscriptions.
 */

import { sessionStateService } from '../session-state.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import { safeRealtimeManager } from '@/lib/realtime-manager';
import type { Player } from '../session-state.service';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock createClient
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

// Mock realtime manager
jest.mock('@/lib/realtime-manager', () => ({
  safeRealtimeManager: {
    subscribe: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase';

describe('SessionStateService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('initializeSession', () => {
    const mockPlayer: Player = {
      id: 'player-123',
      display_name: 'TestPlayer',
      color: '#06b6d4',
      joined_at: new Date().toISOString(),
      is_active: true,
    };

    const _mockBoard = factories.bingoBoard({ id: 'board-123' });
    const mockSessionStats = {
      id: 'session-123',
      board_id: 'board-123',
      board_title: 'Test Board',
      host_id: 'player-123',
      host_username: 'TestPlayer',
      status: 'waiting',
      player_count: 1,
      max_players: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should join existing waiting session successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock finding existing session
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(mockSessionStats)),
        })),
      });

      // Mock joining session
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        session: mockSessionStats,
        isNewSession: false,
      });
      expect(mockFrom).toHaveBeenCalledWith('session_stats');
      expect(mockFrom).toHaveBeenCalledWith('bingo_session_players');
    });

    it('should create new session when none exists', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock no existing session found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseErrorResponse('Not found', 'PGRST116')
            ),
        })),
      });

      // Mock creating new session
      const newSession = factories.bingoSession({
        id: 'new-session-123',
        board_id: 'board-123',
        host_id: mockPlayer.id,
      });

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newSession)),
      });

      // Mock adding host as player
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      // Mock fetching full session from session_stats
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockSessionStats)),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        session: mockSessionStats,
        isNewSession: true,
      });
    });

    it('should handle database errors when finding session', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseErrorResponse('Database error', 'DB_ERROR')
            ),
        })),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to find existing session',
        expect.objectContaining({ code: 'DB_ERROR' }),
        expect.any(Object)
      );
    });

    it('should handle invalid session ID', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const invalidSession = { ...mockSessionStats, id: null };

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(invalidSession)),
        })),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session ID');
    });

    it('should handle join errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock finding existing session
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(mockSessionStats)),
        })),
      });

      // Mock join failure
      mockFrom.mockReturnValueOnce({
        insert: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Join failed')),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Join failed');
    });

    it('should handle unexpected errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const error = new Error('Unexpected error');

      mockFrom.mockImplementation(() => {
        throw error;
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error initializing session',
        error,
        expect.any(Object)
      );
    });
  });

  describe('getSessionPlayers', () => {
    const mockPlayers = [
      factories.bingoSessionPlayer({
        user_id: 'player-1',
        display_name: 'Player 1',
        color: '#06b6d4',
        joined_at: new Date().toISOString(),
        is_host: true,
        is_ready: true,
        score: 10,
      }),
      factories.bingoSessionPlayer({
        user_id: 'player-2',
        display_name: 'Player 2',
        color: '#8b5cf6',
        joined_at: new Date().toISOString(),
        is_host: false,
        is_ready: false,
        score: 5,
      }),
    ];

    it('should return players successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPlayers,
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toEqual({
        id: 'player-1',
        display_name: 'Player 1',
        avatar_url: undefined,
        joined_at: mockPlayers[0]!.joined_at,
        is_active: true,
        color: '#06b6d4',
        is_host: true,
        is_ready: true,
        score: 10,
        position: 1, // Position is set in the mock data
      });
    });

    it('should filter out invalid players', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const invalidPlayers = [
        ...mockPlayers,
        { ...mockPlayers[0], user_id: null }, // Invalid - no user_id
        { ...mockPlayers[0], display_name: null }, // Invalid - no display_name
        { ...mockPlayers[0], color: null }, // Invalid - no color
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: invalidPlayers,
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Only valid players
    });

    it('should handle empty player list', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('leaveSession', () => {
    it('should leave session successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await sessionStateService.leaveSession(
        'session-123',
        'player-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith('bingo_session_players');
    });

    it('should handle leave errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest
            .fn()
            .mockResolvedValue(createSupabaseErrorResponse('Update failed')),
        })),
      });

      const result = await sessionStateService.leaveSession(
        'session-123',
        'player-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('subscribeToSession', () => {
    it('should set up subscriptions correctly', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      (safeRealtimeManager.subscribe as jest.Mock).mockReturnValue(
        mockUnsubscribe
      );

      const unsubscribe = sessionStateService.subscribeToSession(
        'session-123',
        mockCallback
      );

      // Should create two subscriptions (sessions and players)
      expect(safeRealtimeManager.subscribe).toHaveBeenCalledTimes(2);
      expect(safeRealtimeManager.subscribe).toHaveBeenCalledWith(
        'session:session-123_sessions',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: 'id=eq.session-123',
        })
      );
      expect(safeRealtimeManager.subscribe).toHaveBeenCalledWith(
        'session:session-123_players',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'bingo_session_players',
          filter: 'session_id=eq.session-123',
        })
      );

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateSessionCode', () => {
    it('should generate a 6-character code', () => {
      const code = sessionStateService.generateSessionCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate different codes', () => {
      const codes = new Set();
      for (let i = 0; i < 10; i++) {
        codes.add(sessionStateService.generateSessionCode());
      }
      // Very unlikely to generate duplicates
      expect(codes.size).toBeGreaterThan(5);
    });
  });

  describe('transformSessionState', () => {
    const mockSession = factories.bingoSession({
      id: 'session-123',
      status: 'active',
      started_at: new Date().toISOString(),
    });

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        display_name: 'Player 1',
        color: '#06b6d4',
        joined_at: new Date().toISOString(),
        is_active: true,
      },
    ];

    const mockBoardState = [
      {
        cell_id: 'cell-1',
        text: 'Test Card',
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        version: 1,
        last_updated: Date.now(),
        last_modified_by: null,
      },
    ];

    it('should transform session state correctly', () => {
      const result = sessionStateService.transformSessionState(
        mockSession,
        mockPlayers,
        mockBoardState
      );

      expect(result).toEqual({
        id: 'session-123',
        isActive: true,
        isPaused: false,
        isFinished: false,
        startTime: new Date(mockSession.started_at!).getTime(),
        endTime: null,
        currentPlayer: mockPlayers[0],
        players: mockPlayers,
        boardState: mockBoardState,
        version: 1, // Default version is 1 in the mock
      });
    });

    it('should handle null session id', () => {
      const sessionWithoutId = { ...mockSession, id: null };
      const result = sessionStateService.transformSessionState(
        sessionWithoutId as any,
        mockPlayers,
        mockBoardState
      );

      expect(result).toBeNull();
    });

    it('should handle completed session', () => {
      const completedSession = {
        ...mockSession,
        status: 'completed' as const,
        ended_at: new Date().toISOString(),
      };

      const result = sessionStateService.transformSessionState(
        completedSession,
        mockPlayers,
        mockBoardState
      );

      expect(result?.isFinished).toBe(true);
      expect(result?.endTime).toBeTruthy();
    });

    it('should handle empty players', () => {
      const result = sessionStateService.transformSessionState(
        mockSession,
        [],
        mockBoardState
      );

      expect(result?.currentPlayer).toBeNull();
      expect(result?.players).toEqual([]);
    });
  });

  describe('Service Pattern Compliance', () => {
    it('should always return proper ServiceResponse shape', async () => {
      const scenarios = [
        {
          name: 'initializeSession',
          method: () =>
            sessionStateService.initializeSession('board-123', {
              id: 'player-123',
              display_name: 'Test',
              color: '#000',
              joined_at: new Date().toISOString(),
              is_active: true,
            }),
        },
        {
          name: 'getSessionPlayers',
          method: () => sessionStateService.getSessionPlayers('session-123'),
        },
        {
          name: 'leaveSession',
          method: () =>
            sessionStateService.leaveSession('session-123', 'player-123'),
        },
      ];

      for (const scenario of scenarios) {
        const result = await scenario.method();

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('error');
        expect(typeof result.success).toBe('boolean');
        expect(result.data !== null || result.error !== null).toBe(true);
      }
    });
  });
});
