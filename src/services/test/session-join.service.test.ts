/**
 * Session Join Service Tests
 *
 * Tests for session joining operations including checking join eligibility,
 * joining sessions, and managing player colors.
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

import { createClient } from '@/lib/supabase';

describe('SessionJoinService', () => {
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

  describe('getSessionJoinDetails', () => {
    const mockSession = factories.bingoSession({
      id: 'session-123',
      status: 'waiting',
      settings: { 
        max_players: 4,
        allow_spectators: null,
        auto_start: null,
        time_limit: null,
        require_approval: null,
        password: null
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

    it('should return session join details successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithBoard)
          ),
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
      expect(result.data).toEqual({
        session: expect.objectContaining({
          ...mockSession,
          bingo_boards: mockBoard, // The joined board data is included
        }),
        currentPlayerCount: 2,
        canJoin: true,
        reason: undefined,
      });
      expect(result.error).toBeNull();
    });

    it('should return error when session not found', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse('Session not found', 'PGRST116')
          ),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get session details',
        expect.objectContaining({ code: 'PGRST116' }),
        { metadata: { sessionId: 'non-existent', errorCode: 'PGRST116' } }
      );
    });

    it('should handle session not joinable due to status', async () => {
      const closedSession = {
        ...mockSessionWithBoard,
        status: 'completed',
      };

      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(closedSession)),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Session is completed. Cannot join at this time.'
      );
      expect(log.warn).toHaveBeenCalledWith('Session not joinable', {
        metadata: { sessionId: 'session-123', status: 'completed' },
      });
    });

    it('should handle session full', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithBoard)
          ),
      });

      // Mock player count at max
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
      expect(result.data).toEqual({
        session: expect.objectContaining({
          ...mockSession,
          bingo_boards: mockBoard, // The joined board data is included
        }),
        currentPlayerCount: 4,
        canJoin: false,
        reason: 'Session is full',
      });
    });

    it('should handle validation errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseSuccessResponse(mockSessionWithBoard)
          ),
      });

      // Mock player count to be called after session fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      // Mock validation failure
      (bingoSessionSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result =
        await sessionJoinService.getSessionJoinDetails('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(log.error).toHaveBeenCalledWith(
        'Session data validation failed',
        expect.any(Error),
        { metadata: { sessionId: 'session-123' } }
      );
    });
  });

  describe('joinSession', () => {
    const mockUser = mockSupabaseUser({ id: 'user-123', email: 'test@example.com' });
    const joinData = {
      sessionId: 'session-123',
      playerName: 'TestPlayer',
      selectedColor: '#06b6d4',
      teamName: 'Team A',
    };

    it('should join session successfully', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      // Mock auth user
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

      // Mock getSessionJoinDetails
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

      // Mock insert new player
      const newPlayer = factories.bingoSessionPlayer({
        session_id: joinData.sessionId,
        user_id: mockUser.id,
        display_name: joinData.playerName,
        color: joinData.selectedColor,
      });

      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(newPlayer)),
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newPlayer);
      expect(mockFrom).toHaveBeenCalledWith('bingo_session_players');
    });

    it('should error when user not authenticated', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null } as any,
        error: null,
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Must be authenticated to join session');
    });

    it('should error when user already in session', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock existing player found
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(
              createSupabaseSuccessResponse(factories.bingoSessionPlayer())
            ),
        })),
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are already in this session');
    });

    it('should handle join failures', async () => {
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

      // Mock getSessionJoinDetails
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

      // Mock insert failure
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Insert failed')),
      });

      const result = await sessionJoinService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('checkUserInSession', () => {
    const mockUser = mockSupabaseUser({ id: 'user-123', email: 'test@example.com' });

    it('should return user is in session', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPlayer = factories.bingoSessionPlayer({
        user_id: mockUser.id,
        session_id: 'session-123',
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue(createSupabaseSuccessResponse(mockPlayer)),
        })),
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        isInSession: true,
        player: mockPlayer,
      });
    });

    it('should return user is not in session', async () => {
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
              createSupabaseErrorResponse('Not found', 'PGRST116')
            ),
        })),
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        isInSession: false,
        player: undefined,
      });
    });

    it('should handle unauthenticated users', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null } as any,
        error: null,
      });

      const result = await sessionJoinService.checkUserInSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getAvailableColors', () => {
    it('should return available colors correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      const usedColors = ['#06b6d4', '#8b5cf6', '#ec4899'];
      const mockPlayers = usedColors.map(color =>
        factories.bingoSessionPlayer({ color })
      );

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockPlayers,
          error: null,
        }),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.usedColors).toEqual(usedColors);
      expect(result.data?.availableColors).not.toContain('#06b6d4');
      expect(result.data?.availableColors).not.toContain('#8b5cf6');
      expect(result.data?.availableColors).not.toContain('#ec4899');
      expect(result.data?.availableColors.length).toBeGreaterThan(0);
    });

    it('should return all colors when none are used', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.usedColors).toEqual([]);
      expect(result.data?.availableColors.length).toBe(12); // All default colors
    });

    it('should handle database errors', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest
          .fn()
          .mockResolvedValue(createSupabaseErrorResponse('Database error')),
      });

      const result = await sessionJoinService.getAvailableColors('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('Service Pattern Compliance', () => {
    it('should always return proper ServiceResponse shape', async () => {
      const scenarios = [
        {
          name: 'getSessionJoinDetails success',
          method: () => sessionJoinService.getSessionJoinDetails('test'),
        },
        {
          name: 'joinSession success',
          method: () =>
            sessionJoinService.joinSession({
              sessionId: 'test',
              playerName: 'Test',
              selectedColor: '#000',
            }),
        },
        {
          name: 'checkUserInSession success',
          method: () => sessionJoinService.checkUserInSession('test'),
        },
        {
          name: 'getAvailableColors success',
          method: () => sessionJoinService.getAvailableColors('test'),
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
