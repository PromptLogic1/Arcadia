/**
 * @jest-environment jsdom
 */

import { sessionsService } from '../sessions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import {
  hashPassword,
  verifyPassword,
  generateSessionCode,
} from '@/lib/crypto-utils';
import {
  bingoSessionSchema,
  sessionStatsArraySchema,
} from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformSessionSettings,
} from '@/lib/validation/transforms';
import { ZodError } from 'zod';

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

jest.mock('@/lib/crypto-utils', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  generateSessionCode: jest.fn(),
}));

jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoSessionSchema: {
    safeParse: jest.fn(),
  },
  sessionStatsArraySchema: {
    safeParse: jest.fn(),
  },
}));

jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn(),
  transformSessionSettings: jest.fn(),
}));

import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockLog = log as jest.Mocked<typeof log>;
const mockHashPassword = hashPassword as jest.MockedFunction<
  typeof hashPassword
>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<
  typeof verifyPassword
>;
const mockGenerateSessionCode = generateSessionCode as jest.MockedFunction<
  typeof generateSessionCode
>;
const mockBingoSessionSchema = bingoSessionSchema as jest.Mocked<
  typeof bingoSessionSchema
>;
const mockSessionStatsArraySchema = sessionStatsArraySchema as jest.Mocked<
  typeof sessionStatsArraySchema
>;
const mockTransformBoardState = transformBoardState as jest.MockedFunction<
  typeof transformBoardState
>;
const mockTransformSessionSettings =
  transformSessionSettings as jest.MockedFunction<
    typeof transformSessionSettings
  >;

describe('Sessions Service Main', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  // Helper to create a mock ZodError
  const createMockZodError = (message = 'Validation failed') => {
    const error = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['field'],
        message,
      },
    ]);
    return error;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockCreateClient.mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);
    mockTransformBoardState.mockImplementation(cells => {
      if (!cells) return [];
      return cells.map(cell => ({
        cell_id: cell.cell_id ?? null,
        text: cell.text ?? null,
        colors: cell.colors ?? null,
        completed_by: cell.completed_by ?? null,
        blocked: cell.blocked ?? null,
        is_marked: cell.is_marked ?? null,
        version: cell.version ?? null,
        last_updated: cell.last_updated ?? null,
        last_modified_by: cell.last_modified_by ?? null,
      }));
    });
    mockTransformSessionSettings.mockImplementation(settings => {
      if (!settings) return null;
      return {
        max_players: settings.max_players ?? null,
        allow_spectators: settings.allow_spectators ?? null,
        auto_start: settings.auto_start ?? null,
        time_limit: settings.time_limit ?? null,
        require_approval: settings.require_approval ?? null,
        password: settings.password ?? null,
      };
    });
  });

  // Helper to create a mock query builder with chainable methods
  const createMockQueryBuilder = (
    responses: Array<{ data?: any; error?: any; count?: any }>
  ) => {
    let responseIndex = 0;
    const mockBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        const response = responses[responseIndex] || {
          data: null,
          error: null,
        };
        responseIndex++;
        return Promise.resolve(response);
      }),
      maybeSingle: jest.fn().mockImplementation(() => {
        const response = responses[responseIndex] || {
          data: null,
          error: null,
        };
        responseIndex++;
        return Promise.resolve(response);
      }),
    };
    return mockBuilder;
  };

  describe('getSessionById', () => {
    const sessionId = 'session-123';
    const mockSession = {
      id: sessionId,
      board_id: 'board-123',
      host_id: 'user-123',
      status: 'waiting' as const,
      winner_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ended_at: null,
      started_at: null,
      session_code: 'ABC123',
      version: 1,
      current_state: [{ row: 0, col: 0, marked: false }],
      settings: { max_players: 4 },
    };

    it('returns transformed session when validation passes', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockSession)),
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockSession,
      });
      
      // Mock the transformations
      const transformedState = [{ transformed: true }];
      const transformedSettings = { transformed: true };
      mockTransformBoardState.mockReturnValue(transformedState);
      mockTransformSessionSettings.mockReturnValue(transformedSettings);

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockSession,
        current_state: transformedState,
        settings: transformedSettings,
      });
      expect(mockBingoSessionSchema.safeParse).toHaveBeenCalledWith(
        mockSession
      );
      expect(mockTransformBoardState).toHaveBeenCalledWith(
        mockSession.current_state
      );
      expect(mockTransformSessionSettings).toHaveBeenCalledWith(
        mockSession.settings
      );
    });

    it('returns error when validation fails', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockSession)),
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: false,
        error: createMockZodError('Validation failed'),
      });

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Session validation failed',
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            sessionId,
          }),
        })
      );
    });

    it('handles null current_state and settings', async () => {
      const sessionWithNulls = {
        ...mockSession,
        current_state: null,
        settings: null,
      };

      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(sessionWithNulls)),
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: sessionWithNulls,
      });

      await sessionsService.getSessionById(sessionId);

      expect(mockTransformBoardState).not.toHaveBeenCalled();
      expect(mockTransformSessionSettings).not.toHaveBeenCalled();
    });
  });

  describe('getSessionByCode', () => {
    const sessionCode = 'ABC123';
    const mockSession = {
      id: 'session-123',
      session_code: sessionCode,
      status: 'waiting' as const,
      board_id: 'board-123',
      host_id: 'host-123',
      winner_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ended_at: null,
      started_at: null,
      version: 1,
      current_state: [],
      settings: null,
    };

    it('returns session when found by code', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(mockSession)),
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockSession,
      });

      const result = await sessionsService.getSessionByCode(sessionCode);

      expect(result.success).toBe(true);
      expect(mockFrom().eq).toHaveBeenCalledWith('session_code', sessionCode);
    });

    it('returns error when session not found', async () => {
      const error = { message: 'Session not found', code: 'PGRST116' };
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(
            createSupabaseErrorResponse(error.message, error.code)
          ),
      });

      const result = await sessionsService.getSessionByCode(sessionCode);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });
  });

  describe('getActiveSessions', () => {
    const mockSessionStats = [
      {
        id: 'session-1',
        status: 'waiting' as const,
        board_id: 'board-1',
        host_id: 'host-1',
        winner_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        ended_at: null,
        started_at: null,
        session_code: 'ABCD',
        version: 1,
        current_state: [],
        settings: null,
      },
    ];

    it('returns active sessions with default filters', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toEqual(mockSessionStats);
      expect(result.data?.totalCount).toBe(1);
      expect(mockFrom().in).toHaveBeenCalledWith('status', [
        'waiting',
        'active',
      ]);
    });

    it('filters by specific status when not "all"', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ status: 'active' });

      expect(mockFrom().eq).toHaveBeenCalledWith('status', 'active');
    });

    it('includes all sessions when status is "all"', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ status: 'all' });

      expect(mockFrom().in).not.toHaveBeenCalledWith('status', [
        'waiting',
        'active',
      ]);
    });

    it('filters out private sessions when showPrivate is false', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ showPrivate: false });

      expect(mockFrom().eq).toHaveBeenCalledWith('has_password', false);
    });

    it('includes private sessions when showPrivate is true', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ showPrivate: true });

      expect(mockFrom().eq).not.toHaveBeenCalledWith('has_password', false);
    });

    it('filters by game category when not "All Games"', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockEq = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
        range: mockRange,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({
        gameCategory: 'Bingo' as never,
      });

      expect(mockEq).toHaveBeenCalledWith('board_game_type', 'Bingo');
    });

    it('skips game category filter when "All Games"', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockEq = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
        range: mockRange,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({
        gameCategory: 'All Games' as never,
      });

      // Should not filter by board_game_type when category is 'All Games'
      expect(mockEq).not.toHaveBeenCalledWith(
        'board_game_type',
        'All Games'
      );
    });

    it('applies search filter', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ search: 'test' });

      expect(mockFrom().ilike).toHaveBeenCalledWith('board_title', '%test%');
    });

    it('applies pagination correctly', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      const page = 2;
      const limit = 10;
      await sessionsService.getActiveSessions({}, page, limit);

      const start = (page - 1) * limit; // 10
      const end = start + limit - 1; // 19
      expect(mockFrom().range).toHaveBeenCalledWith(start, end);
    });

    it('returns empty data when validation fails', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessionStats,
          error: null,
          count: 1,
        }),
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: false,
        error: createMockZodError('Invalid session stats format'),
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Session stats validation warning',
        expect.objectContaining({
          metadata: expect.objectContaining({
            issues: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('createSession', () => {
    const sessionData = {
      board_id: 'board-123',
      host_id: 'user-123',
      settings: {
        max_players: 4,
        password: 'secret123',
      },
    };

    const mockUser = { id: 'user-123' };
    const mockCreatedSession = {
      id: 'session-123',
      ...sessionData,
      session_code: 'ABC123',
      status: 'waiting' as const,
      winner_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ended_at: null,
      started_at: null,
      version: 1,
      current_state: [],
    };

    beforeEach(() => {
      mockGenerateSessionCode.mockReturnValue('ABC123');
      mockHashPassword.mockResolvedValue('hashed_secret123');
    });

    it('creates session with password hashing', async () => {
      // Mock user exists check and session creation
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockUser, error: null }, // User check
        { data: mockCreatedSession, error: null }, // Session creation
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockCreatedSession,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(true);
      expect(mockHashPassword).toHaveBeenCalledWith('secret123');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            password: 'hashed_secret123',
          }),
        })
      );
    });

    it('creates session without password', async () => {
      const sessionDataNoPassword = {
        ...sessionData,
        settings: { max_players: 4 },
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockUser, error: null }, // User check
        { data: mockCreatedSession, error: null }, // Session creation
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockCreatedSession,
      });

      await sessionsService.createSession(sessionDataNoPassword);

      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            password: null,
          }),
        })
      );
    });

    it('handles empty password string', async () => {
      const sessionDataEmptyPassword = {
        ...sessionData,
        settings: { max_players: 4, password: '   ' },
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockUser, error: null }, // User check
        { data: mockCreatedSession, error: null }, // Session creation
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockCreatedSession,
      });

      await sessionsService.createSession(sessionDataEmptyPassword);

      expect(mockHashPassword).not.toHaveBeenCalled();
    });

    it('returns error when host_id is invalid', async () => {
      const invalidSessionData = {
        ...sessionData,
        host_id: '',
      };

      const result = await sessionsService.createSession(invalidSessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Valid host ID is required to create a session'
      );
    });

    it('returns error when user does not exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error: null }, // User not found
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'User not found. Please ensure you are logged in.'
      );
    });

    it('handles user lookup error', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error }, // Database error
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'User not found. Please ensure you are logged in.'
      );
    });
  });

  describe('joinSession', () => {
    const joinData = {
      session_id: 'session-123',
      user_id: 'user-123',
      display_name: 'Player',
      color: 'blue',
      team: 1,
    };

    const mockSession = {
      status: 'waiting',
      settings: { max_players: 4 },
    };

    const mockPlayer = {
      id: 'player-123',
      ...joinData,
    };

    it('successfully joins session', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: 0, error: null }, // Player count check
        { count: 0, error: null }, // Team count check
        { data: mockPlayer, error: null }, // Player insertion
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayer);
    });

    it('returns error when session not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error: { message: 'Not found' } },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('returns error when session is not waiting', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      const mockQueryBuilder = createMockQueryBuilder([
        { data: activeSession, error: null }, // Session check with non-waiting status
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not accepting new players');
    });

    it('returns error when player already exists', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: 1, error: null }, // Player already exists
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in session');
    });

    it('returns error when color is taken', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: 0, error: null }, // Player doesn't exist
        { count: 1, error: null }, // Color already taken
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });

    it('handles database errors during checks', async () => {
      const dbError = { message: 'Database error', code: 'DB_ERROR' };
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: null, error: dbError }, // Database error during count
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('joinSessionByCode', () => {
    const sessionCode = 'ABC123';
    const userId = 'user-123';
    const playerData = {
      display_name: 'Player',
      color: 'blue',
      team: 1,
      password: 'secret123',
    };

    const mockSession = {
      id: 'session-123',
      session_code: sessionCode.toUpperCase(),
      status: 'waiting',
      settings: { password: 'hashed_secret123', max_players: 4 },
    };

    it('successfully joins session by code with correct password', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session lookup
        { data: null, error: null }, // Existing player check
        { count: 2, error: null }, // Player count
        { data: { id: 'player-123', ...playerData }, error: null }, // New player insertion
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockVerifyPassword.mockResolvedValue(true);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.session).toEqual(mockSession);
      expect(result.player).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(mockVerifyPassword).toHaveBeenCalledWith(
        'secret123',
        'hashed_secret123'
      );
    });

    it('returns error when session not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error: { message: 'Not found' } },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Session not found');
    });

    it('returns error when session is not waiting', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      const mockQueryBuilder = createMockQueryBuilder([
        { data: activeSession, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Session is no longer accepting players');
    });

    it('returns error when password is required but not provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const playerDataNoPassword = { ...playerData, password: undefined };

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerDataNoPassword
      );

      expect(result.error).toBe('Password required');
    });

    it('returns error when password is incorrect', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockVerifyPassword.mockResolvedValue(false);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Incorrect password');
    });

    it('returns existing player when already in session', async () => {
      const existingPlayer = { id: 'existing-player-123', user_id: userId };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session lookup
        { data: existingPlayer, error: null }, // Existing player found
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockVerifyPassword.mockResolvedValue(true);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.session).toEqual(mockSession);
      expect(result.player).toEqual(existingPlayer);
      expect(result.sessionId).toBe(mockSession.id);
    });

    it('returns error when session is full', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session lookup
        { data: null, error: null }, // Player doesn't exist
        { count: 4, error: null }, // Session is full
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockVerifyPassword.mockResolvedValue(true);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Session is full');
    });

    it('handles session without password', async () => {
      const sessionNoPassword = {
        ...mockSession,
        settings: { ...mockSession.settings, password: null },
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: sessionNoPassword, error: null }, // Session lookup
        { data: null, error: null }, // Player doesn't exist
        { count: 2, error: null }, // Player count
        { data: { id: 'player-123', ...playerData }, error: null }, // Player insertion
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBeUndefined();
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('updateBoardState', () => {
    const sessionId = 'session-123';
    const boardState = [
      {
        cell_id: 'cell-0-0',
        text: 'Test cell',
        colors: null,
        completed_by: null,
        blocked: null,
        is_marked: true,
        version: null,
        last_updated: null,
        last_modified_by: null,
      },
    ];
    const currentVersion = 1;

    const mockCurrentSession = {
      id: sessionId,
      status: 'active' as const,
      board_id: 'board-123',
      host_id: 'host-123',
      winner_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ended_at: null,
      started_at: '2024-01-01T00:00:00Z',
      session_code: 'ABC123',
      version: currentVersion,
      current_state: [],
      settings: null,
    };

    const mockUpdatedSession = {
      id: sessionId,
      board_id: 'board-123',
      host_id: 'host-123',
      status: 'active' as const,
      winner_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ended_at: null,
      started_at: '2024-01-01T00:00:00Z',
      session_code: 'ABC123',
      version: currentVersion + 1,
      current_state: boardState,
      settings: null,
    };

    it('successfully updates board state with optimistic locking', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockCurrentSession, error: null }, // Version check
        { data: mockUpdatedSession, error: null }, // Update operation
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockUpdatedSession,
      });

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        current_state: boardState,
        version: currentVersion + 1,
        updated_at: expect.any(String),
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
        'version',
        currentVersion
      );
    });

    it('returns error on version conflict during check', async () => {
      const conflictedSession = {
        ...mockCurrentSession,
        version: currentVersion + 1, // Different version
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: conflictedSession, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Version conflict - session has been updated by another player'
      );
    });

    it('returns error when session not found during check', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('returns error when atomic update fails (version conflict)', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockCurrentSession, error: null }, // Version check OK
        { data: null, error: null }, // Update failed due to version conflict
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Version conflict - session has been updated by another player'
      );
    });

    it('handles database errors during version check', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      const mockQueryBuilder = createMockQueryBuilder([{ data: null, error }]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('startSession', () => {
    const sessionId = 'session-123';
    const hostId = 'user-123';

    const mockSession = {
      host_id: hostId,
      status: 'waiting',
    };

    beforeEach(() => {
      // Mock updateSessionStatus method
      jest.spyOn(sessionsService, 'updateSessionStatus').mockResolvedValue({
        session: { id: sessionId, status: 'active' } as never,
      });
    });

    it('successfully starts session when conditions are met', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: 3, error: null }, // Player count
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.session).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(sessionsService.updateSessionStatus).toHaveBeenCalledWith(
        sessionId,
        'active'
      );
    });

    it('returns error when session not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: null, error: { message: 'Not found' } },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Session not found');
    });

    it('returns error when user is not the host', async () => {
      const sessionDifferentHost = {
        ...mockSession,
        host_id: 'different-user',
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: sessionDifferentHost, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Only the host can start the session');
    });

    it('returns error when session is not in waiting state', async () => {
      const activeSession = {
        ...mockSession,
        status: 'active',
      };

      const mockQueryBuilder = createMockQueryBuilder([
        { data: activeSession, error: null },
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Session is not in waiting state');
    });

    it('returns error when not enough players', async () => {
      const mockQueryBuilder = createMockQueryBuilder([
        { data: mockSession, error: null }, // Session check
        { count: 1, error: null }, // Not enough players
      ]);

      (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Need at least 2 players to start');
    });
  });

  describe('updatePlayer', () => {
    const sessionId = 'session-123';
    const userId = 'user-123';
    const updates = {
      display_name: 'New Name',
      color: 'red',
      team: 2,
    };

    const mockUpdatedPlayer = {
      id: 'player-123',
      session_id: sessionId,
      user_id: userId,
      ...updates,
    };

    it('successfully updates player', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock for color check query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: null, count: 0 }),
      });

      // Mock for update query
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedPlayer,
          error: null,
        }),
      });

      const result = await sessionsService.updatePlayer(
        sessionId,
        userId,
        updates
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedPlayer);
    });

    it('validates display name length - too short', async () => {
      const shortName = { display_name: 'AB' };

      const result = await sessionsService.updatePlayer(
        sessionId,
        userId,
        shortName
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Display name must be between 3 and 20 characters'
      );
    });

    it('validates display name length - too long', async () => {
      const longName = { display_name: 'A'.repeat(21) };

      const result = await sessionsService.updatePlayer(
        sessionId,
        userId,
        longName
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Display name must be between 3 and 20 characters'
      );
    });

    it('returns error when color is already taken', async () => {
      const colorUpdate = { color: 'red' };
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock for color check query - color is taken
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: null, count: 1 }),
      };

      mockFrom.mockReturnValueOnce(mockQueryBuilder);

      const result = await sessionsService.updatePlayer(
        sessionId,
        userId,
        colorUpdate
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
      expect(mockQueryBuilder.not).toHaveBeenCalledWith(
        'user_id',
        'eq',
        userId
      );
    });

    it('handles database errors during color check', async () => {
      const colorUpdate = { color: 'red' };
      const dbError = { message: 'Database error', code: 'DB_ERROR' };
      const mockFrom = mockSupabase.from as jest.Mock;

      // Mock for color check query - database error
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: dbError, count: null }),
      });

      const result = await sessionsService.updatePlayer(
        sessionId,
        userId,
        colorUpdate
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkPlayerExists', () => {
    const sessionId = 'session-123';
    const userId = 'user-123';

    it('returns true when player exists', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'player-123' },
          error: null,
        }),
      });

      const result = await sessionsService.checkPlayerExists(sessionId, userId);

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns false when player does not exist (PGRST116)', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      });

      const result = await sessionsService.checkPlayerExists(sessionId, userId);

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('returns error for other database errors', async () => {
      const dbError = { code: 'DB_ERROR', message: 'Database error' };
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await sessionsService.checkPlayerExists(sessionId, userId);

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkColorAvailable', () => {
    const sessionId = 'session-123';
    const color = 'blue';
    const excludeUserId = 'user-456';

    it('returns true when color is available', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      });

      const result = await sessionsService.checkColorAvailable(
        sessionId,
        color
      );

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns false when color is taken', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { color: 'blue' },
          error: null,
        }),
      });

      const result = await sessionsService.checkColorAvailable(
        sessionId,
        color
      );

      expect(result.available).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('excludes specific user when provided', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      await sessionsService.checkColorAvailable(
        sessionId,
        color,
        excludeUserId
      );

      expect(mockQueryBuilder.neq).toHaveBeenCalledWith(
        'user_id',
        excludeUserId
      );
    });

    it('returns error for database errors other than PGRST116', async () => {
      const dbError = { code: 'DB_ERROR', message: 'Database error' };
      const mockFrom = mockSupabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await sessionsService.checkColorAvailable(
        sessionId,
        color
      );

      expect(result.available).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
