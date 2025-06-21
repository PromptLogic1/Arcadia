/**
 * Session State Service - Enhanced Branch Coverage Tests
 *
 * Targeting specific uncovered branches to improve coverage from 85.48% to >90%.
 * Focus areas:
 * - Edge cases in session initialization and player management
 * - Error handling in subscription callbacks  
 * - Boundary conditions in session transformation
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
import type { Database } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/realtime-manager', () => ({
  safeRealtimeManager: {
    subscribe: jest.fn(),
  },
}));

jest.mock('@/lib/error-guards', () => ({
  isError: jest.fn(error => error instanceof Error),
  getErrorMessage: jest.fn(error =>
    error instanceof Error ? error.message : String(error)
  ),
}));

import { createClient } from '@/lib/supabase';

describe('SessionStateService - Enhanced Branch Coverage', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeSession - Additional Edge Cases', () => {
    const mockPlayer: Player = {
      id: 'player-123',
      display_name: 'TestPlayer',
      color: '#06b6d4',
      joined_at: new Date().toISOString(),
      is_active: true,
    };

    it('should handle existing session with null ID edge case', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock existing session found but with null ID (edge case)
      const sessionWithNullId = {
        ...factories.bingoSession(),
        id: null,
      };

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(sessionWithNullId)),
        })),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session ID');
    });

    it('should handle database connection timeout during session creation', async () => {
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

      // Mock session creation with timeout error
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Connection timeout', '40001')
          ),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create new session',
        expect.objectContaining({ message: 'Connection timeout' }),
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

    it('should handle edge case where session lookup returns unexpected error code', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session lookup with unexpected error (not PGRST116)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseErrorResponse('Permission denied', '42501')
            ),
        })),
      });

      const result = await sessionStateService.initializeSession(
        'board-123',
        mockPlayer
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to find existing session',
        expect.objectContaining({ message: 'Permission denied' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            service: 'session-state',
            method: 'initializeSession',
            boardId: 'board-123',
          }),
        })
      );
    });
  });

  describe('getSessionPlayers - Data Filtering Edge Cases', () => {
    it('should filter out players with missing required fields', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const playersWithMissingFields = [
        // Missing user_id
        {
          session_id: 'session-123',
          user_id: null,
          display_name: 'Player 1',
          color: '#06b6d4',
          joined_at: '2024-01-01T00:00:00Z',
          is_host: false,
          is_ready: true,
        },
        // Missing display_name
        {
          session_id: 'session-123',
          user_id: 'player-2',
          display_name: null,
          color: '#8b5cf6',
          joined_at: '2024-01-01T00:00:00Z',
          is_host: false,
          is_ready: true,
        },
        // Missing color
        {
          session_id: 'session-123',
          user_id: 'player-3',
          display_name: 'Player 3',
          color: null,
          joined_at: '2024-01-01T00:00:00Z',
          is_host: false,
          is_ready: true,
        },
        // Valid player
        {
          session_id: 'session-123',
          user_id: 'player-4',
          display_name: 'Player 4',
          color: '#f59e0b',
          joined_at: '2024-01-01T00:00:00Z',
          is_host: true,
          is_ready: true,
        },
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: playersWithMissingFields,
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      // Only one valid player should remain after filtering
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.id).toBe('player-4');
      expect(result.data?.[0]?.display_name).toBe('Player 4');
    });

    it('should handle players with null joined_at gracefully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const playersWithNullJoinedAt = [
        {
          session_id: 'session-123',
          user_id: 'player-1',
          display_name: 'Player 1',
          color: '#06b6d4',
          joined_at: null, // Will use fallback
          is_host: false,
          is_ready: null, // Will use default
          score: null, // Will use default
          position: null, // Will use default
          avatar_url: undefined,
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
      expect(result.data).toHaveLength(0); // Filtered out due to null joined_at
    });

    it('should handle players with all null optional fields', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const playerWithNulls = [
        {
          session_id: 'session-123',
          user_id: 'player-1',
          display_name: 'Minimal Player',
          color: '#06b6d4',
          joined_at: '2024-01-01T00:00:00Z',
          is_host: null,
          is_ready: null,
          score: null,
          position: null,
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
          data: playerWithNulls,
          error: null,
        }),
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const player = result.data?.[0];
      expect(player).toBeDefined();
      expect(player?.is_host).toBe(false); // Default from ?? false
      expect(player?.is_ready).toBe(true); // Default from ?? true
      expect(player?.score).toBe(0); // Default from ?? 0
      expect(player?.position).toBeUndefined(); // Default from ?? undefined
      expect(player?.avatar_url).toBeUndefined(); // Converted from null
    });
  });

  describe('subscribeToSession - Callback Error Scenarios', () => {
    it('should handle errors in session update callback execution', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let sessionUpdateCallback: (...args: unknown[]) => unknown = () => Promise.resolve();

      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (
          channelName: string,
          config: {
            onUpdate?: (...args: unknown[]) => unknown;
            onError?: (...args: unknown[]) => unknown;
          }
        ) => {
          if (channelName.includes('_sessions')) {
            if (config.onUpdate) {
              sessionUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Mock the supabase query to return null data (session not found)
      const mockFrom = mockSupabase.from as jest.Mock;
      
      // Set up the proper chain of methods for from().select().eq().single()
      const singleMock = jest.fn().mockResolvedValue(
        createSupabaseSuccessResponse(null) // null data means session not found
      );
      
      const eqMock = jest.fn().mockReturnValue({
        single: singleMock,
      });
      
      const selectMock = jest.fn().mockReturnValue({
        eq: eqMock,
      });
      
      mockFrom.mockReturnValueOnce({
        select: selectMock,
      });

      // Mock getSessionPlayers to succeed
      jest
        .spyOn(sessionStateService, 'getSessionPlayers')
        .mockResolvedValue({
          success: true,
          data: [],
          error: null,
        });

      // Trigger callback - should handle errors gracefully
      await sessionUpdateCallback();

      // Callback should not be called because session is null
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle successful subscription callback with valid data', async () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      let sessionUpdateCallback: (...args: unknown[]) => unknown = () => {};
      let playerUpdateCallback: (...args: unknown[]) => unknown = () => {};

      (safeRealtimeManager.subscribe as jest.Mock).mockImplementation(
        (
          channelName: string,
          config: {
            onUpdate?: (...args: unknown[]) => unknown;
            onError?: (...args: unknown[]) => unknown;
          }
        ) => {
          if (channelName.includes('_sessions')) {
            if (config.onUpdate) {
              sessionUpdateCallback = config.onUpdate;
            }
          } else if (channelName.includes('_players')) {
            if (config.onUpdate) {
              playerUpdateCallback = config.onUpdate;
            }
          }
          return mockUnsubscribe;
        }
      );

      sessionStateService.subscribeToSession('session-123', mockCallback);

      // Create fresh mock for successful responses
      const successMockSupabase = createMockSupabaseClient();
      const mockFrom = successMockSupabase.from as jest.Mock;
      
      const mockSession = factories.bingoSession({ id: 'session-123' });
      const mockPlayers = [
        {
          id: 'player-1',
          display_name: 'Player 1',
          color: '#06b6d4',
          joined_at: new Date().toISOString(),
          is_active: true,
        },
      ];

      (createClient as jest.Mock).mockReturnValue(successMockSupabase);
      setupSupabaseMock(successMockSupabase);

      // Mock session fetch
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSession,
          error: null,
        }),
      });

      // Mock getSessionPlayers
      jest
        .spyOn(sessionStateService, 'getSessionPlayers')
        .mockResolvedValue({
          success: true,
          data: mockPlayers,
          error: null,
        });

      // Trigger both callbacks
      await sessionUpdateCallback();
      await playerUpdateCallback();

      // Callback should be called for both updates
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalledWith({
        session: mockSession,
        players: mockPlayers,
      });
    });
  });

  describe('transformSessionState - Complex Edge Cases', () => {
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

    it('should handle session with complex status combinations', async () => {
      const testCases = [
        { status: 'waiting', expectedActive: false, expectedFinished: false },
        { status: 'active', expectedActive: true, expectedFinished: false },
        { status: 'completed', expectedActive: false, expectedFinished: true },
        { status: 'cancelled', expectedActive: false, expectedFinished: false },
      ];

      for (const testCase of testCases) {
        const session = factories.bingoSession({
          id: 'session-test',
          status: testCase.status as any,
          started_at: testCase.status === 'waiting' ? null : new Date().toISOString(),
          version: 1,
        });

        const result = sessionStateService.transformSessionState(
          session,
          mockPlayers,
          mockBoardState
        );

        expect(result).not.toBeNull();
        expect(result!.isActive).toBe(testCase.expectedActive);
        expect(result!.isFinished).toBe(testCase.expectedFinished);
        
        if (testCase.status === 'waiting') {
          expect(result!.startTime).toBeNull();
        } else {
          expect(result!.startTime).toBeTruthy();
        }
      }
    });

    it('should handle session with ended_at field correctly', async () => {
      const sessionWithEndedAt = factories.bingoSession({
        id: 'session-123',
        status: 'completed' as const,
        started_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        ended_at: new Date('2024-01-01T11:30:00Z').toISOString(),
        version: 2,
      });

      const result = sessionStateService.transformSessionState(
        sessionWithEndedAt,
        mockPlayers,
        mockBoardState
      );

      expect(result).not.toBeNull();
      expect(result!.isFinished).toBe(true);
      expect(result!.startTime).toBe(new Date('2024-01-01T10:00:00Z').getTime());
      expect(result!.endTime).toBe(new Date('2024-01-01T11:30:00Z').getTime());
      expect(result!.version).toBe(2);
    });

    it('should handle session without ended_at field', async () => {
      const sessionWithoutEndedAt = {
        id: 'session-123',
        status: 'active' as const,
        started_at: new Date().toISOString(),
        // No ended_at field
        version: 1,
      };

      const result = sessionStateService.transformSessionState(
        sessionWithoutEndedAt as any,
        mockPlayers,
        mockBoardState
      );

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(true);
      expect(result!.endTime).toBeNull();
    });

    it('should handle empty players array', async () => {
      const session = factories.bingoSession({
        id: 'session-123',
        status: 'waiting',
      });

      const result = sessionStateService.transformSessionState(
        session,
        [], // Empty players array
        mockBoardState
      );

      expect(result).not.toBeNull();
      expect(result!.currentPlayer).toBeNull(); // No players, so currentPlayer is null
      expect(result!.players).toEqual([]);
    });
  });

  describe('generateSessionCode - Randomness and Uniqueness', () => {
    it('should generate codes with proper character distribution', async () => {
      const codes = [];
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        codes.push(sessionStateService.generateSessionCode());
      }

      // Check format consistency
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
        expect(code.length).toBe(6);
      });

      // Check character distribution (should include both letters and numbers)
      const allChars = codes.join('');
      const hasLetters = /[A-Z]/.test(allChars);
      const hasNumbers = /[0-9]/.test(allChars);
      
      expect(hasLetters).toBe(true);
      expect(hasNumbers).toBe(true);

      // Check uniqueness (should be very high)
      const uniqueCodes = new Set(codes);
      const uniquenessRatio = uniqueCodes.size / codes.length;
      expect(uniquenessRatio).toBeGreaterThan(0.9); // >90% unique
    });

    it('should generate codes with consistent randomness', async () => {
      const firstBatch = Array.from({ length: 10 }, () => 
        sessionStateService.generateSessionCode()
      );
      
      const secondBatch = Array.from({ length: 10 }, () => 
        sessionStateService.generateSessionCode()
      );

      // Should not generate identical sequences
      expect(firstBatch).not.toEqual(secondBatch);
      
      // Should have different first characters (very likely with good randomness)
      const firstChars = [...firstBatch, ...secondBatch].map(code => code[0]);
      const uniqueFirstChars = new Set(firstChars);
      expect(uniqueFirstChars.size).toBeGreaterThan(1);
    });
  });

  describe('Error Propagation and Logging', () => {
    it('should handle promise rejection in async operations', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock promise rejection - the Supabase query chain itself rejects
      mockFrom.mockImplementationOnce(() => {
        throw new Error('Async operation failed');
      });

      const result = await sessionStateService.getSessionPlayers('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Async operation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting session players',
        expect.any(Error),
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
});