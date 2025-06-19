/**
 * @jest-environment jsdom
 */

import { sessionsService } from '../sessions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { 
  hashPassword, 
  verifyPassword, 
  generateSessionCode 
} from '@/lib/crypto-utils';
import {
  bingoSessionSchema,
  sessionStatsArraySchema,
} from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformSessionSettings,
} from '@/lib/validation/transforms';

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

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  neq: jest.fn(() => mockSupabase),
  not: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockLog = log as jest.Mocked<typeof log>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockGenerateSessionCode = generateSessionCode as jest.MockedFunction<typeof generateSessionCode>;
const mockBingoSessionSchema = bingoSessionSchema as jest.Mocked<typeof bingoSessionSchema>;
const mockSessionStatsArraySchema = sessionStatsArraySchema as jest.Mocked<typeof sessionStatsArraySchema>;
const mockTransformBoardState = transformBoardState as jest.MockedFunction<typeof transformBoardState>;
const mockTransformSessionSettings = transformSessionSettings as jest.MockedFunction<typeof transformSessionSettings>;

describe('Sessions Service Main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase as never);
    mockTransformBoardState.mockImplementation(state => state as never);
    mockTransformSessionSettings.mockImplementation(settings => settings as never);
  });

  describe('getSessionById', () => {
    const sessionId = 'session-123';
    const mockSession = {
      id: sessionId,
      board_id: 'board-123',
      host_id: 'user-123',
      status: 'waiting',
      current_state: [{ row: 0, col: 0, marked: false }],
      settings: { max_players: 4 },
    };

    it('returns transformed session when validation passes', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockSession,
      });

      const result = await sessionsService.getSessionById(sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockBingoSessionSchema.safeParse).toHaveBeenCalledWith(mockSession);
      expect(mockTransformBoardState).toHaveBeenCalledWith(mockSession.current_state);
      expect(mockTransformSessionSettings).toHaveBeenCalledWith(mockSession.settings);
    });

    it('returns error when validation fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: false,
        error: new Error('Validation failed'),
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

      mockSupabase.single.mockResolvedValue({
        data: sessionWithNulls,
        error: null,
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
      current_state: [],
      settings: null,
    };

    it('returns session when found by code', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockSession,
      });

      const result = await sessionsService.getSessionByCode(sessionCode);

      expect(result.success).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('session_code', sessionCode);
    });

    it('returns error when session not found', async () => {
      const error = { message: 'Session not found', code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
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
        status: 'waiting',
        current_state: [],
        settings: null,
      },
    ];

    it('returns active sessions with default filters', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toEqual(mockSessionStats);
      expect(result.data?.totalCount).toBe(1);
      expect(mockSupabase.in).toHaveBeenCalledWith('status', ['waiting', 'active']);
    });

    it('filters by specific status when not "all"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ status: 'active' });

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('includes all sessions when status is "all"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ status: 'all' });

      expect(mockSupabase.in).not.toHaveBeenCalledWith('status', ['waiting', 'active']);
    });

    it('filters out private sessions when showPrivate is false', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ showPrivate: false });

      expect(mockSupabase.eq).toHaveBeenCalledWith('has_password', false);
    });

    it('includes private sessions when showPrivate is true', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ showPrivate: true });

      expect(mockSupabase.eq).not.toHaveBeenCalledWith('has_password', false);
    });

    it('filters by game category when not "All Games"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ gameCategory: 'Bingo' as never });

      expect(mockSupabase.eq).toHaveBeenCalledWith('board_game_type', 'Bingo');
    });

    it('skips game category filter when "All Games"', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ gameCategory: 'All Games' as never });

      expect(mockSupabase.eq).not.toHaveBeenCalledWith('board_game_type', 'All Games');
    });

    it('applies search filter', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: true,
        data: mockSessionStats,
      });

      await sessionsService.getActiveSessions({ search: 'test' });

      expect(mockSupabase.ilike).toHaveBeenCalledWith('board_title', '%test%');
    });

    it('applies pagination correctly', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
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
      expect(mockSupabase.range).toHaveBeenCalledWith(start, end);
    });

    it('returns empty data when validation fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSessionStats,
        error: null,
        count: 1,
      });

      mockSessionStatsArraySchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Invalid' }] },
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
      status: 'waiting',
    };

    beforeEach(() => {
      mockGenerateSessionCode.mockReturnValue('ABC123');
      mockHashPassword.mockResolvedValue('hashed_secret123');
    });

    it('creates session with password hashing', async () => {
      // Mock user exists check
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockUser,
          error: null,
        })
        // Mock session creation
        .mockResolvedValueOnce({
          data: mockCreatedSession,
          error: null,
        });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockCreatedSession,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(true);
      expect(mockHashPassword).toHaveBeenCalledWith('secret123');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
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

      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockCreatedSession,
          error: null,
        });

      mockBingoSessionSchema.safeParse.mockReturnValue({
        success: true,
        data: mockCreatedSession,
      });

      await sessionsService.createSession(sessionDataNoPassword);

      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockSupabase.insert).toHaveBeenCalledWith(
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

      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockUser,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockCreatedSession,
          error: null,
        });

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
      expect(result.error).toBe('Valid host ID is required to create a session');
    });

    it('returns error when user does not exist', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found. Please ensure you are logged in.');
    });

    it('handles user lookup error', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found. Please ensure you are logged in.');
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
      mockSupabase.single
        // Session check
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
        })
        // Player insertion
        .mockResolvedValueOnce({
          data: mockPlayer,
          error: null,
        });

      // Mock count queries
      mockSupabase.select
        .mockReturnValueOnce({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ count: 0, error: null }),
        })
        .mockReturnValueOnce({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ count: 0, error: null }),
        });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayer);
    });

    it('returns error when session not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('returns error when session is not waiting', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      mockSupabase.single.mockResolvedValue({
        data: activeSession,
        error: null,
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not accepting new players');
    });

    it('returns error when player already exists', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      // Mock existing player count > 0
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in session');
    });

    it('returns error when color is taken', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      // Mock player check returns 0, color check returns 1
      mockSupabase.select
        .mockReturnValueOnce({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ count: 0, error: null }),
        })
        .mockReturnValueOnce({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ count: 1, error: null }),
        });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });

    it('handles database errors during checks', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const dbError = { message: 'Database error', code: 'DB_ERROR' };
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: null, error: dbError }),
      });

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
      mockSupabase.single
        // Session lookup
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
        })
        // Existing player check
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        // New player insertion
        .mockResolvedValueOnce({
          data: { id: 'player-123', ...playerData },
          error: null,
        });

      // Mock player count
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 2, error: null }),
      });

      mockVerifyPassword.mockResolvedValue(true);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.session).toEqual(mockSession);
      expect(result.player).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(mockVerifyPassword).toHaveBeenCalledWith('secret123', 'hashed_secret123');
    });

    it('returns error when session not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Session not found');
    });

    it('returns error when session is not waiting', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      mockSupabase.single.mockResolvedValue({
        data: activeSession,
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.error).toBe('Session is no longer accepting players');
    });

    it('returns error when password is required but not provided', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const playerDataNoPassword = { ...playerData, password: undefined };

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerDataNoPassword
      );

      expect(result.error).toBe('Password required');
    });

    it('returns error when password is incorrect', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

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
      
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
        })
        .mockResolvedValueOnce({
          data: existingPlayer,
          error: null,
        });

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
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Mock full session (4 players, max 4)
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 4, error: null }),
      });

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

      mockSupabase.single
        .mockResolvedValueOnce({
          data: sessionNoPassword,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'player-123', ...playerData },
          error: null,
        });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 2, error: null }),
      });

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
    const boardState = [{ row: 0, col: 0, marked: true }];
    const currentVersion = 1;

    const mockCurrentSession = {
      version: currentVersion,
      current_state: [],
    };

    const mockUpdatedSession = {
      id: sessionId,
      version: currentVersion + 1,
      current_state: boardState,
    };

    it('successfully updates board state with optimistic locking', async () => {
      mockSupabase.single
        // Version check
        .mockResolvedValueOnce({
          data: mockCurrentSession,
          error: null,
        })
        // Update operation
        .mockResolvedValueOnce({
          data: mockUpdatedSession,
          error: null,
        });

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
      expect(mockSupabase.update).toHaveBeenCalledWith({
        current_state: boardState,
        version: currentVersion + 1,
        updated_at: expect.any(String),
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('version', currentVersion);
    });

    it('returns error on version conflict during check', async () => {
      const conflictedSession = {
        ...mockCurrentSession,
        version: currentVersion + 1, // Different version
      };

      mockSupabase.single.mockResolvedValue({
        data: conflictedSession,
        error: null,
      });

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
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await sessionsService.updateBoardState(
        sessionId,
        boardState,
        currentVersion
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('returns error when atomic update fails (version conflict)', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: mockCurrentSession,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null, // No data returned means version conflict
          error: null,
        });

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
      mockSupabase.single.mockResolvedValue({
        data: null,
        error,
      });

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
      mockSupabase.single
        // Session check
        .mockResolvedValueOnce({
          data: mockSession,
          error: null,
        });

      // Mock player count
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 3, error: null }),
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.session).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(sessionsService.updateSessionStatus).toHaveBeenCalledWith(sessionId, 'active');
    });

    it('returns error when session not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Session not found');
    });

    it('returns error when user is not the host', async () => {
      const sessionDifferentHost = {
        ...mockSession,
        host_id: 'different-user',
      };

      mockSupabase.single.mockResolvedValue({
        data: sessionDifferentHost,
        error: null,
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Only the host can start the session');
    });

    it('returns error when session is not in waiting state', async () => {
      const activeSession = {
        ...mockSession,
        status: 'active',
      };

      mockSupabase.single.mockResolvedValue({
        data: activeSession,
        error: null,
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.error).toBe('Session is not in waiting state');
    });

    it('returns error when not enough players', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      // Mock insufficient player count
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

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
      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedPlayer,
        error: null,
      });

      // Mock color availability check
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const result = await sessionsService.updatePlayer(sessionId, userId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedPlayer);
    });

    it('validates display name length - too short', async () => {
      const shortName = { display_name: 'AB' };

      const result = await sessionsService.updatePlayer(sessionId, userId, shortName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Display name must be between 3 and 20 characters');
    });

    it('validates display name length - too long', async () => {
      const longName = { display_name: 'A'.repeat(21) };

      const result = await sessionsService.updatePlayer(sessionId, userId, longName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Display name must be between 3 and 20 characters');
    });

    it('returns error when color is already taken', async () => {
      const colorUpdate = { color: 'red' };

      // Mock color taken
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

      const result = await sessionsService.updatePlayer(sessionId, userId, colorUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
      expect(mockSupabase.not).toHaveBeenCalledWith('user_id', 'eq', userId);
    });

    it('handles database errors during color check', async () => {
      const colorUpdate = { color: 'red' };
      const dbError = { message: 'Database error', code: 'DB_ERROR' };

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: null, error: dbError }),
      });

      const result = await sessionsService.updatePlayer(sessionId, userId, colorUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkPlayerExists', () => {
    const sessionId = 'session-123';
    const userId = 'user-123';

    it('returns true when player exists', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'player-123' },
        error: null,
      });

      const result = await sessionsService.checkPlayerExists(sessionId, userId);

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns false when player does not exist (PGRST116)', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await sessionsService.checkPlayerExists(sessionId, userId);

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('returns error for other database errors', async () => {
      const dbError = { code: 'DB_ERROR', message: 'Database error' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
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
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await sessionsService.checkColorAvailable(sessionId, color);

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns false when color is taken', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { color: 'blue' },
        error: null,
      });

      const result = await sessionsService.checkColorAvailable(sessionId, color);

      expect(result.available).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('excludes specific user when provided', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      await sessionsService.checkColorAvailable(sessionId, color, excludeUserId);

      expect(mockSupabase.neq).toHaveBeenCalledWith('user_id', excludeUserId);
    });

    it('returns error for database errors other than PGRST116', async () => {
      const dbError = { code: 'DB_ERROR', message: 'Database error' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      const result = await sessionsService.checkColorAvailable(sessionId, color);

      expect(result.available).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});