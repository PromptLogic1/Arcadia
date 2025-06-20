/**
 * Additional Coverage Tests for Session Join Service
 *
 * Focusing on uncovered branches and edge cases to improve coverage
 * from 87% lines, 63.46% branches to 95%+ coverage.
 */

import { sessionJoinService } from '../session-join.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
  mockSupabaseUser,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import {
  bingoSessionSchema,
  bingoSessionPlayerSchema,
} from '@/lib/validation/schemas/bingo';
import { AuthError } from '@supabase/auth-js';
import { transformBoardState } from '@/lib/validation/transforms';
import type { Tables } from '@/types/database.types';

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

// Mock validation schemas
jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoSessionSchema: {
    safeParse: jest.fn(),
  },
  bingoSessionPlayerSchema: {
    safeParse: jest.fn(),
  },
}));

// Mock transforms
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(state => state),
  transformSessionSettings: jest.fn(settings => settings),
}));

// Mock error guards
jest.mock('@/lib/error-guards', () => ({
  getErrorMessage: jest.fn(error =>
    error instanceof Error ? error.message : String(error)
  ),
}));

import { createClient } from '@/lib/supabase';

describe('SessionJoinService - Additional Coverage', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);

    // Default schema validation behavior
    (bingoSessionSchema.safeParse as jest.Mock).mockImplementation(data => ({
      success: true,
      data,
    }));
    (bingoSessionPlayerSchema.safeParse as jest.Mock).mockImplementation(
      data => ({
        success: true,
        data,
      })
    );
  });

  describe('getSessionJoinDetails - Missing Branch Coverage', () => {
    const mockSession = factories.bingoSession({
      id: 'session-123',
      status: 'waiting',
      settings: {
        max_players: 4,
        allow_spectators: null,
        auto_start: null,
        time_limit: null,
        require_approval: null,
        password: null,
      },
    });

    const mockBoard = factories.bingoBoard({
      id: 'board-123',
      title: 'Test Board',
    });

    const mockSessionWithBoard = {
      ...mockSession,
      bingo_boards: mockBoard,
    };

    it('should handle session data being null after successful fetch', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(null)),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(log.error).toHaveBeenCalledWith(
        'Session data is null',
        expect.any(Error),
        { metadata: { sessionId: 'session-123' } }
      );
    });

    it('should handle session with status "active" (joinable)', async () => {
      const activeSession = {
        ...mockSessionWithBoard,
        status: 'active',
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(activeSession)),
      });

      // Mock player count
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.canJoin).toBe(true);
    });

    it('should handle player count fetch error', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithBoard)
          ),
      });

      // Mock player count error
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Count failed' },
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check player count');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check player count',
        expect.objectContaining({ message: 'Count failed' }),
        { metadata: { sessionId: 'session-123' } }
      );
    });

    it('should handle null player count response', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock successful session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithBoard)
          ),
      });

      // Mock null player count (should default to 0)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.currentPlayerCount).toBe(0);
      expect(result.data?.canJoin).toBe(true);
    });

    it('should handle session with null settings (default max_players)', async () => {
      const sessionWithNullSettings = {
        ...mockSessionWithBoard,
        settings: null,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(sessionWithNullSettings)
          ),
      });

      // Mock player count
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.currentPlayerCount).toBe(3);
      expect(result.data?.canJoin).toBe(true); // 3 < 4 (default max_players)
    });

    it('should handle session settings without max_players (default to 4)', async () => {
      const sessionWithoutMaxPlayers = {
        ...mockSessionWithBoard,
        settings: { some_other_setting: true },
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(sessionWithoutMaxPlayers)
          ),
      });

      // Mock player count at max (4)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 4,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.currentPlayerCount).toBe(4);
      expect(result.data?.canJoin).toBe(false);
      expect(result.data?.reason).toBe('Session is full');
    });

    it('should handle non-PGRST116 database errors differently', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Database error', 'DB_ERROR')
          ),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get session details',
        expect.objectContaining({ code: 'DB_ERROR' }),
        { metadata: { sessionId: 'session-123', errorCode: 'DB_ERROR' } }
      );
    });

    it('should handle session transform with current_state', async () => {
      const sessionWithState = {
        ...mockSessionWithBoard,
        current_state: [{ id: 'cell-1', marked: false }],
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(sessionWithState)),
      });

      // Mock player count
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(transformBoardState).toHaveBeenCalledWith([
        { id: 'cell-1', marked: false },
      ]);
    });

    it('should handle session transform with null current_state', async () => {
      const sessionWithNullState = {
        ...mockSessionWithBoard,
        current_state: null,
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(sessionWithNullState)
          ),
      });

      // Mock player count
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.session.current_state).toBeNull();
    });

    it('should handle unexpected error during fetch', async () => {
      const error = new Error('Unexpected fetch error');
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw error;
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected fetch error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getSessionJoinDetails',
        error,
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('joinSession - Missing Branch Coverage', () => {
    const mockUser = mockSupabaseUser({
      id: 'user-123',
      email: 'test@example.com',
    });
    const joinData = {
      sessionId: 'session-123',
      playerName: 'TestPlayer',
      selectedColor: '#06b6d4',
      teamName: 'Team A',
    };

    it('should handle auth user error', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new AuthError('Auth error', 401),
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to join session');
      expect(log.error).toHaveBeenCalledWith(
        'User authentication failed',
        expect.objectContaining({ message: 'Auth error' }),
        { metadata: { sessionId: 'session-123' } }
      );
    });

    it('should handle session verification failure', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock check existing player - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // Mock getSessionJoinDetails failure
      jest
        .spyOn(sessionJoinService, 'getSessionJoinDetails')
        .mockResolvedValueOnce({
          success: false,
          data: null,
          error: 'Session verification failed',
        });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session verification failed');
    });

    it('should handle session not joinable after verification', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock check existing player - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // Mock getSessionJoinDetails - session full
      jest
        .spyOn(sessionJoinService, 'getSessionJoinDetails')
        .mockResolvedValueOnce({
          success: true,
          data: {
            session: factories.bingoSession({ status: 'waiting' }),
            currentPlayerCount: 4,
            canJoin: false,
            reason: 'Session is full',
          },
          error: null,
        });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is full');
      expect(log.warn).toHaveBeenCalledWith('Session not joinable', {
        metadata: { sessionId: 'session-123', reason: 'Session is full' },
      });
    });

    it('should handle session not joinable without reason', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock check existing player - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // Mock getSessionJoinDetails - session not joinable but no reason
      jest
        .spyOn(sessionJoinService, 'getSessionJoinDetails')
        .mockResolvedValueOnce({
          success: true,
          data: {
            session: factories.bingoSession({ status: 'waiting' }),
            currentPlayerCount: 4,
            canJoin: false,
            // reason is undefined
          },
          error: null,
        });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot join session');
    });

    it('should handle join without team name (team = null)', async () => {
      const joinDataWithoutTeam = {
        ...joinData,
        teamName: undefined, // No team name
      };

      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock check existing player - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // Mock getSessionJoinDetails success
      jest
        .spyOn(sessionJoinService, 'getSessionJoinDetails')
        .mockResolvedValueOnce({
          success: true,
          data: {
            session: factories.bingoSession({ status: 'waiting' }),
            currentPlayerCount: 2,
            canJoin: true,
          },
          error: null,
        });

      // Mock successful insert
      const newPlayer = factories.bingoSessionPlayer({
        session_id: joinDataWithoutTeam.sessionId,
        user_id: mockUser.id,
        display_name: joinDataWithoutTeam.playerName,
        color: joinDataWithoutTeam.selectedColor,
        team: null, // Should be null when no team name
      });

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newPlayer)),
      });

      const result = await sessionJoinService.joinSession(joinDataWithoutTeam);

      expect(result.success).toBe(true);
      expect(result.data?.team).toBeNull();
    });

    it('should handle new player validation failure', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock check existing player - not found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // Mock getSessionJoinDetails success
      jest
        .spyOn(sessionJoinService, 'getSessionJoinDetails')
        .mockResolvedValueOnce({
          success: true,
          data: {
            session: factories.bingoSession({ status: 'waiting' }),
            currentPlayerCount: 2,
            canJoin: true,
          },
          error: null,
        });

      // Mock successful insert
      const newPlayer = { invalid: 'data' };
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newPlayer)),
      });

      // Mock validation failure
      (bingoSessionPlayerSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Player validation failed'),
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player data format');
      expect(log.error).toHaveBeenCalledWith(
        'New player data validation failed',
        expect.any(Error),
        { metadata: { newPlayer } }
      );
    });

    it('should handle unexpected error during join', async () => {
      const error = new Error('Unexpected join error');
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockImplementation(() => {
        throw error;
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected join error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in joinSession',
        error,
        { metadata: { data: joinData } }
      );
    });
  });

  describe('checkUserInSession - Missing Branch Coverage', () => {
    const mockUser = mockSupabaseUser({
      id: 'user-123',
      email: 'test@example.com',
    });

    it('should handle auth error during user check', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new AuthError('Auth failed', 401),
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
      expect(log.error).toHaveBeenCalledWith(
        'User authentication failed',
        expect.objectContaining({ message: 'Auth failed' }),
        { metadata: { sessionId: 'session-123' } }
      );
    });

    it('should handle non-PGRST116 database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to check user session status',
        expect.objectContaining({ code: 'DB_ERROR' }),
        { metadata: { sessionId: 'session-123', userId: 'user-123' } }
      );
    });

    it('should handle player validation failure', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidPlayer = { invalid: 'data' };
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(invalidPlayer)),
        })),
      });

      // Mock validation failure
      (bingoSessionPlayerSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Player validation failed'),
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player data format');
      expect(log.error).toHaveBeenCalledWith(
        'Player data validation failed',
        expect.any(Error),
        { metadata: { player: invalidPlayer } }
      );
    });

    it('should handle unexpected non-Error exceptions', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check session status');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in checkUserInSession',
        'String error',
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('getAvailableColors - Missing Branch Coverage', () => {
    it('should handle null players data response', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.usedColors).toEqual([]);
      expect(result.data?.availableColors.length).toBe(12); // All default colors
    });

    it('should filter out players with null colors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const playersWithNullColors = [
        factories.bingoSessionPlayer({ color: '#06b6d4' }),
        {
          ...factories.bingoSessionPlayer({ color: '#000000' }),
          color: null,
        } as unknown as Tables<'bingo_session_players'>, // Should be filtered out
        factories.bingoSessionPlayer({ color: '#8b5cf6' }),
        factories.bingoSessionPlayer({ color: '' }), // Should be filtered out (falsy)
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: playersWithNullColors,
          error: null,
        }),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.usedColors).toEqual(['#06b6d4', '#8b5cf6']);
      expect(result.data?.availableColors).not.toContain('#06b6d4');
      expect(result.data?.availableColors).not.toContain('#8b5cf6');
    });

    it('should handle unexpected non-Error exceptions', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get available colors');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getAvailableColors',
        'String error',
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle all error paths consistently', async () => {
      const scenarios = [
        {
          name: 'getSessionJoinDetails with invalid ID',
          method: () => sessionJoinService.getSessionJoinDetails(''),
        },
        {
          name: 'joinSession with invalid data',
          method: () =>
            sessionJoinService.joinSession({
              sessionId: '',
              playerName: '',
              selectedColor: '',
            }),
        },
        {
          name: 'checkUserInSession with invalid ID',
          method: () => sessionJoinService.checkUserInSession(''),
        },
        {
          name: 'getAvailableColors with invalid ID',
          method: () => sessionJoinService.getAvailableColors(''),
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

    it('should handle service response structure validation', async () => {
      // Mock a successful response to verify structure
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockSupabaseUser({ id: 'user-123' }) },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result).toEqual({
        success: true,
        data: {
          availableColors: expect.any(Array),
          usedColors: expect.any(Array),
        },
        error: null,
      });
    });
  });
});
