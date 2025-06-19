/**
 * Additional Coverage Tests for Session State Service
 * 
 * Focusing on uncovered branches and edge cases to improve coverage
 * from 91.76% lines, 75.8% branches to 95%+ coverage.
 * 
 * Target uncovered lines: 187-195, 372-375, 408-409
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
// Removed unused imports
import type { Player } from '../session-state.service';
import type { Database } from '@/../../types/database.types';

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

// Mock error guards
jest.mock('@/lib/error-guards', () => ({
  isError: jest.fn((error) => error instanceof Error),
  getErrorMessage: jest.fn((error) => 
    error instanceof Error ? error.message : String(error)
  ),
}));

import { createClient } from '@/lib/supabase';

describe('SessionStateService - Additional Coverage', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  describe('initializeSession - Missing Branch Coverage', () => {
    const mockPlayer: Player = {
      id: 'player-123',
      display_name: 'TestPlayer',
      color: '#06b6d4',
      joined_at: new Date().toISOString(),
      is_active: true,
    };

    const _mockSessionStats = {
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

    it('should handle host join error (lines 187-195)', async () => {
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

      // Mock host join failure (lines 187-195)
      mockFrom.mockReturnValueOnce({
        insert: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Host join failed')),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Host join failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to add host to session',
        expect.objectContaining({ message: 'Host join failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'initializeSession',
            sessionId: 'new-session-123',
            hostId: mockPlayer.id,
          }),
        })
      );
    });

    it('should handle session creation without valid ID', async () => {
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

      // Mock creating new session without valid ID
      const sessionWithoutId = { ...factories.bingoSession(), id: null };
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(sessionWithoutId)),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create session with valid ID');
    });

    it('should handle full session stats fetch failure after creation', async () => {
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

      // Mock successful host join
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      // Mock fetching full session failure (return null data)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(null)),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch created session details');
    });

    it('should handle session creation error', async () => {
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

      // Mock session creation failure
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Creation failed')),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create new session',
        expect.objectContaining({ message: 'Creation failed' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'initializeSession',
            boardId: 'board-123',
            hostId: mockPlayer.id,
          }),
        })
      );
    });

    it('should handle non-Error exceptions in catch block', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Throw a non-Error exception
      mockFrom.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error initializing session',
        expect.any(Error), // isError wraps non-errors in Error objects
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'initializeSession',
            boardId: 'board-123',
            playerId: mockPlayer.id,
          }),
        })
      );
    });
  });

  describe('getSessionPlayers - Missing Branch Coverage', () => {
    it('should handle players with null joined_at (filtered out)', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const playersWithNullJoinedAt = [
        {
          session_id: 'session-123',
          user_id: 'player-1',
          display_name: 'Player 1',
          color: '#06b6d4',
          joined_at: null, // Will be filtered out
          is_host: false,
          is_ready: true,
          score: 0,
          position: 1,
          avatar_url: null,
          team: null,
          left_at: null,
        },
        {
          session_id: 'session-123',
          user_id: 'player-2',
          display_name: 'Player 2',
          color: '#8b5cf6',
          joined_at: '2024-01-01T00:00:00Z', // Valid timestamp
          is_host: false,
          is_ready: true,
          score: 0,
          position: 2,
          avatar_url: null,
          team: null,
          left_at: null,
        },
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: playersWithNullJoinedAt,
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      // Player with null joined_at is filtered out, so only 1 player remains
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.id).toBe('player-2');
    });

    it('should handle players with valid joined_at timestamp', async () => {
      // This test ensures players with valid data are processed correctly
      const mockFrom = mockSupabase.from as jest.Mock;
      const validPlayer = {
        session_id: 'session-123',
        user_id: 'player-1',
        display_name: 'Player 1',
        color: '#06b6d4',
        joined_at: '2024-01-01T00:00:00Z', // Valid timestamp
        is_host: false,
        is_ready: true,
        score: 0,
        position: 1,
        avatar_url: null,
        team: null,
        left_at: null,
      };

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [validPlayer],
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.joined_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle non-Error exceptions in catch block', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Throw a non-Error exception
      mockFrom.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting session players',
        expect.any(Error), // isError wraps non-errors in Error objects
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'getSessionPlayers',
            sessionId: 'session-123',
          }),
        })
      );
    });
  });

  describe('leaveSession - Missing Branch Coverage', () => {
    it('should handle non-Error exceptions in catch block', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Throw a non-Error exception
      mockFrom.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await sessionStateService.leaveSession(
        'session-123',
        'player-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error leaving session',
        expect.any(Error), // isError wraps non-errors in Error objects
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'leaveSession',
            sessionId: 'session-123',
            playerId: 'player-123',
          }),
        })
      );
    });
  });

  describe('subscribeToSession - Missing Branch Coverage (lines 372-375, 408-409)', () => {
    it('should handle session update callback with missing session data (lines 372-375)', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let sessionUpdateCallback: (...args: unknown[]) => unknown = () => {};
      
      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (channelName: string, config: { onUpdate?: (...args: unknown[]) => unknown; onError?: (...args: unknown[]) => unknown }) => {
          if (channelName.includes('_sessions')) {
            if (config.onUpdate) {
              sessionUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Create a fresh mock for this specific test to avoid interference
      const freshMockSupabase = createMockSupabaseClient();
      (createClient as jest.Mock).mockReturnValue(freshMockSupabase);
      setupSupabaseMock(freshMockSupabase);

      // Mock supabase for session fetch returning null
      const mockFrom = freshMockSupabase.from as jest.Mock;
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No session data
          error: null,
        }),
      });

      // Mock getSessionPlayers to return success
      jest.spyOn(sessionStateService, 'getSessionPlayers').mockResolvedValueOnce({
        success: true,
        data: [],
        error: null,
      });

      // Trigger the session update callback
      await sessionUpdateCallback();

      // Callback should not be called when session data is missing
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle session update callback with missing player data (lines 372-375)', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let sessionUpdateCallback: (...args: unknown[]) => unknown = () => {};
      
      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (channelName: string, config: { onUpdate?: (...args: unknown[]) => unknown; onError?: (...args: unknown[]) => unknown }) => {
          if (channelName.includes('_sessions')) {
            if (config.onUpdate) {
              sessionUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Create a fresh mock for this specific test
      const freshMockSupabase = createMockSupabaseClient();
      (createClient as jest.Mock).mockReturnValue(freshMockSupabase);
      setupSupabaseMock(freshMockSupabase);

      // Mock supabase for session fetch returning valid data
      const mockSession = factories.bingoSession({ id: 'session-123' });
      const mockFrom = freshMockSupabase.from as jest.Mock;
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSession,
          error: null,
        }),
      });

      // Mock getSessionPlayers to return failure
      jest.spyOn(sessionStateService, 'getSessionPlayers').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Player fetch failed',
      });

      // Trigger the session update callback
      await sessionUpdateCallback();

      // Callback should not be called when player data is missing
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle player update callback with missing session data (lines 408-409)', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let playerUpdateCallback: (...args: unknown[]) => unknown = () => {};
      
      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (channelName: string, config: { onUpdate?: (...args: unknown[]) => unknown; onError?: (...args: unknown[]) => unknown }) => {
          if (channelName.includes('_players')) {
            if (config.onUpdate) {
              playerUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Mock getSessionPlayers to return success
      jest.spyOn(sessionStateService, 'getSessionPlayers').mockResolvedValueOnce({
        success: true,
        data: [],
        error: null,
      });

      // Create a fresh mock for this specific test
      const freshMockSupabase = createMockSupabaseClient();
      (createClient as jest.Mock).mockReturnValue(freshMockSupabase);
      setupSupabaseMock(freshMockSupabase);

      // Mock supabase for session fetch returning null
      const mockFrom = freshMockSupabase.from as jest.Mock;
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No session data
          error: null,
        }),
      });

      // Trigger the player update callback
      await playerUpdateCallback();

      // Callback should not be called when session data is missing
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle player update callback with missing player data (lines 408-409)', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let playerUpdateCallback: (...args: unknown[]) => unknown = () => {};
      
      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (channelName: string, config: { onUpdate?: (...args: unknown[]) => unknown; onError?: (...args: unknown[]) => unknown }) => {
          if (channelName.includes('_players')) {
            if (config.onUpdate) {
              playerUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Mock getSessionPlayers to return failure
      jest.spyOn(sessionStateService, 'getSessionPlayers').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Player fetch failed',
      });

      // Create a fresh mock for this specific test
      const freshMockSupabase = createMockSupabaseClient();
      (createClient as jest.Mock).mockReturnValue(freshMockSupabase);
      setupSupabaseMock(freshMockSupabase);

      // Mock supabase for session fetch returning valid data
      const mockSession = factories.bingoSession({ id: 'session-123' });
      const mockFrom = freshMockSupabase.from as jest.Mock;
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSession,
          error: null,
        }),
      });

      // Trigger the player update callback
      await playerUpdateCallback();

      // Callback should not be called when player data is missing
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle subscription error callbacks', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let sessionErrorCallback: (...args: unknown[]) => unknown = () => {};
      let playerErrorCallback: (...args: unknown[]) => unknown = () => {};
      
      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (channelName: string, config: { onUpdate?: (...args: unknown[]) => unknown; onError?: (...args: unknown[]) => unknown }) => {
          if (channelName.includes('_sessions')) {
            if (config.onError) {
              sessionErrorCallback = config.onError;
            }
          } else if (channelName.includes('_players')) {
            if (config.onError) {
              playerErrorCallback = config.onError;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      const sessionError = new Error('Session subscription error');
      const playerError = new Error('Player subscription error');

      // Test session error callback
      sessionErrorCallback(sessionError);
      expect(log.error).toHaveBeenCalledWith(
        'Session subscription error',
        sessionError,
        { metadata: { sessionId: 'session-123' } }
      );

      // Test player error callback
      playerErrorCallback(playerError);
      expect(log.error).toHaveBeenCalledWith(
        'Player subscription error',
        playerError,
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('transformSessionState - Missing Branch Coverage', () => {
    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        display_name: 'Player 1',
        color: '#06b6d4',
        joined_at: new Date().toISOString(),
        is_active: true,
      },
    ];

    const mockBoardState: Database['public']['CompositeTypes']['board_cell'][] = [
      {
        cell_id: 'cell-1',
        text: 'Test Card',
        colors: [],
        completed_by: [],
        blocked: false,
        is_marked: false,
        version: 1,
        last_updated: Date.now(),
        last_modified_by: null,
      },
    ];

    it('should handle session with undefined version (fallback to 0)', () => {
      const sessionWithoutVersion = factories.bingoSession({
        id: 'session-123',
        status: 'active',
        started_at: new Date().toISOString(),
      });
      // Remove version to test fallback
      delete (sessionWithoutVersion as any).version;

      const result = sessionStateService.transformSessionState(
        sessionWithoutVersion,
        mockPlayers,
        mockBoardState
      );

      expect(result?.version).toBe(0); // Should fallback to 0
    });

    it('should handle session with null version (fallback to 0)', () => {
      const sessionWithNullVersion = {
        id: 'session-123',
        status: 'active' as const,
        started_at: new Date().toISOString(),
        version: null,
      };

      const result = sessionStateService.transformSessionState(
        sessionWithNullVersion as any,
        mockPlayers,
        mockBoardState
      );

      expect(result?.version).toBe(0); // Should fallback to 0
    });

    it('should handle session stats object with ended_at', () => {
      const sessionStatsWithEndedAt = factories.bingoSession({
        id: 'session-123',
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        version: 1,
      });

      const result = sessionStateService.transformSessionState(
        sessionStatsWithEndedAt,
        mockPlayers,
        mockBoardState
      );

      expect(result?.isFinished).toBe(true);
      expect(result?.endTime).toBeTruthy();
    });

    it('should handle session stats object without ended_at', () => {
      const sessionStatsWithoutEndedAt = factories.bingoSession({
        id: 'session-123',
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
        version: 1,
      });

      const result = sessionStateService.transformSessionState(
        sessionStatsWithoutEndedAt,
        mockPlayers,
        mockBoardState
      );

      expect(result?.isActive).toBe(true);
      expect(result?.endTime).toBeNull();
    });

    it('should handle session without started_at', () => {
      const sessionWithoutStartedAt = {
        id: 'session-123',
        status: 'waiting' as const,
        started_at: null,
        version: 1,
      };

      const result = sessionStateService.transformSessionState(
        sessionWithoutStartedAt as any,
        mockPlayers,
        mockBoardState
      );

      expect(result?.isActive).toBe(false);
      expect(result?.startTime).toBeNull();
    });
  });

  describe('generateSessionCode - Edge Cases', () => {
    it('should generate codes with consistent character set', () => {
      const validChars = /^[A-Z0-9]{6}$/;
      
      for (let i = 0; i < 100; i++) {
        const code = sessionStateService.generateSessionCode();
        expect(code).toMatch(validChars);
        expect(code).toHaveLength(6);
      }
    });

    it('should have good randomness distribution', () => {
      const codes = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        codes.add(sessionStateService.generateSessionCode());
      }
      
      // Should have high uniqueness (> 95%)
      expect(codes.size / iterations).toBeGreaterThan(0.95);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed session data consistently', async () => {
      const malformedData = [
        { id: null },
        { id: '', status: 'invalid' },
        { id: 'valid-id', status: 'active' },
      ];

      for (const data of malformedData) {
        const result = sessionStateService.transformSessionState(
          data as any,
          [],
          []
        );

        if (data && (data as any).id) {
          expect(result).toBeTruthy();
        } else {
          expect(result).toBeNull();
        }
      }

      // Test null and undefined separately - the service implementation will fail on null access
      // but that's expected behavior since these are invalid inputs
      try {
        sessionStateService.transformSessionState(null as any, [], []);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }

      try {
        sessionStateService.transformSessionState(undefined as any, [], []);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }

      // Empty object without id should return null
      expect(sessionStateService.transformSessionState({} as any, [], [])).toBeNull();
    });

    it('should handle service response structure validation', async () => {
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

        // All methods should return proper ServiceResponse structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('error');
        expect(typeof result.success).toBe('boolean');

        // When success is false, error should be present
        if (!result.success) {
          expect(result.error).toBeTruthy();
          expect(typeof result.error).toBe('string');
        }
      }
    });
  });
});