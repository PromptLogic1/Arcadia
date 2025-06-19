/**
 * @jest-environment node
 */

import { sessionsService } from '../sessions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import {
  hashPassword,
  verifyPassword,
  generateSessionCode,
} from '@/lib/crypto-utils';
import type { SessionStatus, GameCategory } from '../sessions.service';
import { bingoSessionSchema, sessionStatsArraySchema } from '@/lib/validation/schemas/bingo';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/crypto-utils');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoSessionSchema: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data,
    })),
  },
  sessionStatsArraySchema: {
    safeParse: jest.fn().mockImplementation(data => ({
      success: true,
      data: data || [],
    })),
  },
}));
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn().mockImplementation(state => state || []),
  transformSessionSettings: jest.fn().mockImplementation(settings => settings),
}));

const mockSupabase = {
  from: jest.fn(),
};

describe('sessionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock crypto functions
    (generateSessionCode as jest.Mock).mockReturnValue('ABC123');
    (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
    (verifyPassword as jest.Mock).mockResolvedValue(true);
  });

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      const mockSession = {
        id: 'session-123',
        board_id: 'board-456',
        host_id: 'user-789',
        session_code: 'ABC123',
        status: 'waiting' as SessionStatus,
        current_state: [],
        settings: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        started_at: null,
        ended_at: null,
        version: 1,
        winner_id: null,
      };

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'session-123',
        status: 'waiting',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
    });

    it('should handle session not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Session not found', code: 'PGRST116' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidSession = {
        id: 'session-123',
        // Missing required fields
      };

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: invalidSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock validation failure
      (bingoSessionSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getSessionByCode', () => {
    it('should return session when code is found', async () => {
      const mockSession = {
        id: 'session-123',
        session_code: 'ABC123',
        status: 'waiting' as SessionStatus,
        current_state: [],
        settings: null,
        board_id: 'board-456',
        host_id: 'user-789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        started_at: null,
        ended_at: null,
        version: 1,
        winner_id: null,
      };

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionByCode('ABC123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        session_code: 'ABC123',
      });
    });

    it('should handle code not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Session not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionByCode('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle validation failure', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { invalid: 'data' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      (bingoSessionSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.getSessionByCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await sessionsService.getSessionByCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions with pagination', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          status: 'waiting' as SessionStatus,
          board_title: 'Test Board',
          current_player_count: 2,
          max_players: 4,
          has_password: false,
          created_at: '2024-01-01T00:00:00Z',
          board_id: 'board-1',
          host_id: 'user-1',
          session_code: 'ABC123',
          current_state: [],
          settings: null,
          updated_at: null,
          started_at: null,
          ended_at: null,
          version: 1,
          winner_id: null,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockSessions,
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getActiveSessions({}, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toHaveLength(1);
      expect(result.data?.totalCount).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('session_stats');
    });

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                ilike: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    range: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                      count: 0,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await sessionsService.getActiveSessions({
        search: 'test',
        gameCategory: 'General' as GameCategory,
        showPrivate: false,
        status: 'waiting',
      });

      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
                count: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failures gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [{ invalid: 'data' }],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      (sessionStatsArraySchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'Invalid data' }] },
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessions: [], totalCount: 0 });
      expect(log.debug).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
        settings: {
          max_players: 4,
          password: 'secret123',
        },
      };

      // Mock user existence check
      const mockUserQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-456' },
              error: null,
            }),
          }),
        }),
      };

      // Mock session creation
      const createdSession = {
        id: 'session-789',
        board_id: 'board-123',
        host_id: 'user-456',
        session_code: 'ABC123',
        status: 'waiting' as SessionStatus,
        current_state: [],
        settings: {
          max_players: 4,
          password: 'hashed_password',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        started_at: null,
        ended_at: null,
        version: 1,
        winner_id: null,
      };

      const mockSessionQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdSession,
              error: null,
            }),
          }),
        }),
      };

      // First call for user check, second for session creation
      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery)
        .mockReturnValueOnce(mockSessionQuery);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        session_code: 'ABC123',
        status: 'waiting',
      });
      expect(hashPassword).toHaveBeenCalledWith('secret123');
      expect(generateSessionCode).toHaveBeenCalledWith(6);
    });

    it('should reject invalid host_id', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: '',
      };

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Valid host ID is required to create a session'
      );
    });

    it('should reject non-existent host', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'nonexistent-user',
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockUserQuery);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'User not found. Please ensure you are logged in.'
      );
    });

    it('should handle user query returning null without error', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockUserQuery);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'User not found. Please ensure you are logged in.'
      );
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle session creation error', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-456' },
              error: null,
            }),
          }),
        }),
      };

      const mockSessionQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery)
        .mockReturnValueOnce(mockSessionQuery);

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failure after creation', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      const mockUserQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-456' },
              error: null,
            }),
          }),
        }),
      };

      const mockSessionQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { invalid: 'session' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery)
        .mockReturnValueOnce(mockSessionQuery);

      (bingoSessionSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
    });

    it('should handle unexpected errors', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Catastrophic failure');
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Catastrophic failure');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('joinSession', () => {
    it('should join session successfully', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
        team: 1,
      };

      // Mock session status check
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'waiting', settings: {} },
              error: null,
            }),
          }),
        }),
      };

      // Mock existing player check
      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      // Mock color availability check
      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      // Mock player insertion
      const newPlayer = {
        id: 'player-789',
        ...joinData,
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newPlayer,
              error: null,
            }),
          }),
        }),
      };

      // Mock the sequence of calls
      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery) // Session status check
        .mockReturnValueOnce(mockPlayerCheckQuery) // Existing player check
        .mockReturnValueOnce(mockColorCheckQuery) // Color check
        .mockReturnValueOnce(mockInsertQuery); // Player insertion

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      });
    });

    it('should reject joining non-waiting session', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'active', settings: {} },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not accepting new players');
    });

    it('should handle session not found', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should reject if player already exists', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'waiting', settings: {} },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in session');
    });

    it('should reject if color is taken', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'waiting', settings: {} },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockColorCheckQuery);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });

    it('should handle insert error', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'waiting', settings: {} },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockColorCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to join session');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database crashed');
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database crashed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('joinSessionByCode', () => {
    it('should join by code successfully', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session lookup
      const mockSession = {
        id: 'session-123',
        session_code: 'ABC123',
        status: 'waiting' as SessionStatus,
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      // Mock no existing player
      const mockExistingPlayerQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock player count check
      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      };

      // Mock player creation
      const newPlayer = {
        id: 'player-789',
        session_id: 'session-123',
        user_id: userId,
        ...playerData,
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newPlayer,
              error: null,
            }),
          }),
        }),
      };

      // Mock the sequence of calls
      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery) // Session lookup
        .mockReturnValueOnce(mockExistingPlayerQuery) // Existing player check
        .mockReturnValueOnce(mockPlayerCountQuery) // Player count check
        .mockReturnValueOnce(mockInsertQuery); // Player creation

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.session).toEqual(mockSession);
      expect(result.player).toEqual(newPlayer);
      expect(result.sessionId).toBe('session-123');
      expect(result.error).toBeUndefined();
    });

    it('should handle password-protected session', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        password: 'correct_password',
      };

      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: {
          password: 'hashed_password',
        },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);

      // Mock rest of the flow
      const mockExistingPlayerQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'player-789' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockExistingPlayerQuery)
        .mockReturnValueOnce(mockPlayerCountQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(verifyPassword).toHaveBeenCalledWith(
        'correct_password',
        'hashed_password'
      );
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect password', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        password: 'wrong_password',
      };

      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: {
          password: 'hashed_password',
        },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);
      (verifyPassword as jest.Mock).mockResolvedValueOnce(false);

      const result = await sessionsService.joinSessionByCode(
        sessionCode,
        userId,
        playerData
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Incorrect password');
    });

    it('should handle session not found', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSessionByCode(
        'INVALID',
        'user-123',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Session not found');
    });

    it('should handle non-waiting session', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'active' as SessionStatus,
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-123',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Session is no longer accepting players');
    });

    it('should require password when needed', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: { password: 'hashed' },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-123',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Password required');
    });

    it('should return existing player if already in session', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: null,
      };

      const existingPlayer = {
        id: 'player-123',
        session_id: 'session-123',
        user_id: 'user-456',
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const mockExistingPlayerQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingPlayer,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockExistingPlayerQuery);

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toEqual(mockSession);
      expect(result.player).toEqual(existingPlayer);
      expect(result.error).toBeUndefined();
    });

    it('should reject when session is full', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: { max_players: 2 },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const mockExistingPlayerQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockExistingPlayerQuery)
        .mockReturnValueOnce(mockPlayerCountQuery);

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Session is full');
    });

    it('should handle player creation error', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const mockExistingPlayerQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockExistingPlayerQuery)
        .mockReturnValueOnce(mockPlayerCountQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Insert failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await sessionsService.joinSessionByCode(
        'ABC123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Connection lost');
    });
  });

  describe('leaveSession', () => {
    it('should leave session successfully', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.leaveSession(
        'session-123',
        'user-456'
      );

      expect(result.success).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('should handle leave errors', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Delete failed' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.leaveSession(
        'session-123',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.leaveSession(
        'session-123',
        'user-456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update status to active', async () => {
      const updatedSession = {
        id: 'session-123',
        status: 'active' as SessionStatus,
        started_at: expect.any(String),
      };

      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updateSessionStatus(
        'session-123',
        'active'
      );

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          started_at: expect.any(String),
        })
      );
    });

    it('should update status to completed', async () => {
      const updatedSession = {
        id: 'session-123',
        status: 'completed' as SessionStatus,
        ended_at: expect.any(String),
      };

      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updateSessionStatus(
        'session-123',
        'completed'
      );

      expect(result.session).toEqual(updatedSession);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          ended_at: expect.any(String),
        })
      );
    });

    it('should handle update errors', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updateSessionStatus(
        'session-123',
        'active'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Update failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      const result = await sessionsService.updateSessionStatus(
        'session-123',
        'active'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('getSessionPlayers', () => {
    it('should return session players', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          user_id: 'user-1',
          display_name: 'Player 1',
          color: '#ff0000',
        },
        {
          id: 'player-2',
          user_id: 'user-2',
          display_name: 'Player 2',
          color: '#00ff00',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockPlayers,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_players');
    });

    it('should handle empty player list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' },
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('updatePlayerReady', () => {
    it('should update player ready status', async () => {
      const updatedPlayer = {
        id: 'player-123',
        is_ready: true,
      };

      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedPlayer,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updatePlayerReady(
        'session-123',
        'user-456',
        true
      );

      expect(result.player).toEqual(updatedPlayer);
      expect(result.error).toBeUndefined();
    });

    it('should handle update error', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updatePlayerReady(
        'session-123',
        'user-456',
        true
      );

      expect(result.player).toBeNull();
      expect(result.error).toBe('Update failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.updatePlayerReady(
        'session-123',
        'user-456',
        true
      );

      expect(result.player).toBeNull();
      expect(result.error).toBe('Database error');
    });
  });

  describe('updatePlayer', () => {
    it('should update player successfully', async () => {
      const updates = {
        display_name: 'New Name',
        color: '#0000ff',
      };

      const updatedPlayer = {
        id: 'player-123',
        session_id: 'session-456',
        user_id: 'user-789',
        ...updates,
      };

      // Mock color availability check
      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedPlayer,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockColorCheckQuery) // Color check
        .mockReturnValueOnce(mockUpdateQuery); // Player update

      const result = await sessionsService.updatePlayer(
        'session-456',
        'user-789',
        updates
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedPlayer);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(updates);
    });

    it('should reject invalid display name length', async () => {
      const result = await sessionsService.updatePlayer(
        'session-123',
        'user-456',
        {
          display_name: 'ab', // Too short
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Display name must be between 3 and 20 characters'
      );
    });

    it('should reject taken color', async () => {
      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ count: 1, error: null }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockColorCheckQuery);

      const result = await sessionsService.updatePlayer(
        'session-123',
        'user-456',
        { color: '#ff0000' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });

    it('should handle update error', async () => {
      const mockColorCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockColorCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await sessionsService.updatePlayer(
        'session-123',
        'user-456',
        { color: '#0000ff' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database crashed');
      });

      const result = await sessionsService.updatePlayer(
        'session-123',
        'user-456',
        { display_name: 'New Name' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database crashed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getSessionStatus', () => {
    it('should return session status', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'active' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should handle session not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBeNull();
      expect(result.error).toBe('Not found');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBeNull();
      expect(result.error).toBe('Database error');
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.deleteSession('session-123');

      expect(result.success).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.deleteSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.deleteSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      const sessionId = 'session-123';
      const hostId = 'user-456';

      // Mock session check
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                host_id: hostId,
                status: 'waiting',
              },
              error: null,
            }),
          }),
        }),
      };

      // Mock player count check
      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      };

      // Mock session update (via updateSessionStatus)
      const updatedSession = {
        id: sessionId,
        status: 'active' as SessionStatus,
        started_at: expect.any(String),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery) // Session check
        .mockReturnValueOnce(mockPlayerCountQuery) // Player count check
        .mockReturnValueOnce(mockUpdateQuery); // Session update

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-host user', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                host_id: 'other-user',
                status: 'waiting',
              },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.startSession(
        'session-123',
        'user-456'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Only the host can start the session');
    });

    it('should reject non-waiting session', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                host_id: 'user-456',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.startSession(
        'session-123',
        'user-456'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Session is not in waiting state');
    });

    it('should require minimum players', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                host_id: 'user-456',
                status: 'waiting',
              },
              error: null,
            }),
          }),
        }),
      };

      const mockPlayerCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCountQuery);

      const result = await sessionsService.startSession(
        'session-123',
        'user-456'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Need at least 2 players to start');
    });

    it('should handle session not found', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.startSession(
        'session-123',
        'user-456'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Session not found');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.startSession(
        'session-123',
        'user-456'
      );

      expect(result.session).toBeNull();
      expect(result.error).toBe('Database error');
    });
  });

  describe('checkPlayerExists', () => {
    it('should return true when player exists', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'player-123' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkPlayerExists(
        'session-123',
        'user-456'
      );

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return false when player does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkPlayerExists(
        'session-123',
        'user-456'
      );

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should handle non-PGRST116 errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'OTHER_ERROR', message: 'Database error' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkPlayerExists(
        'session-123',
        'user-456'
      );

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      const result = await sessionsService.checkPlayerExists(
        'session-123',
        'user-456'
      );

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Connection error');
    });
  });

  describe('checkColorAvailable', () => {
    it('should return true when color is available', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkColorAvailable(
        'session-123',
        '#ff0000'
      );

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return false when color is taken', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { color: '#ff0000' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkColorAvailable(
        'session-123',
        '#ff0000'
      );

      expect(result.available).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should exclude specific user when checking color availability', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkColorAvailable(
        'session-123',
        '#ff0000',
        'user-123'
      );

      expect(result.available).toBe(true);
    });

    it('should handle database error in checkColorAvailable', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'DB_ERROR', message: 'Database error' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkColorAvailable(
        'session-123',
        '#ff0000'
      );

      expect(result.available).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle unexpected error in checkColorAvailable', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Network error')),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.checkColorAvailable(
        'session-123',
        '#ff0000'
      );

      expect(result.available).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getSessionsByBoardId', () => {
    it('should return sessions for board', async () => {
      const mockSessions = [
        { id: 'session-1', board_id: 'board-123', status: 'waiting' },
        { id: 'session-2', board_id: 'board-123', status: 'active' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockSessions,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessions);
    });

    it('should filter by status when provided', async () => {
      const mockSessions = [
        { id: 'session-1', board_id: 'board-123', status: 'waiting' },
      ];

      // Create mock for the second eq call
      const mockSecondEq = jest.fn().mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      // Create mock for the first eq call that returns an object with another eq method
      const mockFirstEq = jest.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      // Create mock for the select call
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockFirstEq,
      });

      const mockQuery = {
        select: mockSelect,
        eq: mockFirstEq, // Make eq available at top level for assertion
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardId(
        'board-123',
        'waiting'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessions);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockFirstEq).toHaveBeenCalledWith('board_id', 'board-123');
      expect(mockSecondEq).toHaveBeenCalledWith('status', 'waiting');
    });

    it('should handle empty result', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' },
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getSessionsByBoardIdWithPlayers', () => {
    it('should return sessions with players', async () => {
      const mockData = [
        {
          id: 'session-1',
          board_id: 'board-123',
          bingo_session_players: [
            {
              user_id: 'user-1',
              display_name: 'Player 1',
              color: '#ff0000',
              team: null,
            },
          ],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardIdWithPlayers(
        'board-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockQuery.select).toHaveBeenCalledWith(
        expect.stringContaining('bingo_session_players')
      );
    });

    it('should filter by status', async () => {
      // Create mock for the second eq call
      const mockSecondEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      // Create mock for the first eq call that returns an object with another eq method
      const mockFirstEq = jest.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      // Create mock for the select call
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockFirstEq,
      });

      const mockQuery = {
        select: mockSelect,
        eq: mockFirstEq, // Make eq available at top level for assertion
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await sessionsService.getSessionsByBoardIdWithPlayers(
        'board-123',
        'active'
      );

      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('bingo_session_players')
      );
      expect(mockFirstEq).toHaveBeenCalledWith('board_id', 'board-123');
      expect(mockSecondEq).toHaveBeenCalledWith('status', 'active');
    });

    it('should handle null players gracefully', async () => {
      const mockData = [
        {
          id: 'session-1',
          board_id: 'board-123',
          bingo_session_players: null,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardIdWithPlayers(
        'board-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.bingo_session_players).toEqual([]);
    });

    it('should handle database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Join failed' },
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.getSessionsByBoardIdWithPlayers(
        'board-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Join failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.getSessionsByBoardIdWithPlayers(
        'board-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    it('should update session state', async () => {
      const updates = {
        current_state: [{
          cell_id: 'cell-1',
          text: 'Test',
          colors: null,
          completed_by: null,
          blocked: null,
          is_marked: true,
          version: null,
          last_updated: null,
          last_modified_by: null,
        }],
        status: 'active' as SessionStatus,
      };

      const updatedSession = {
        id: 'session-123',
        ...updates,
        updated_at: expect.any(String),
      };

      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updateSession(
        'session-123',
        updates
      );

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      );
    });

    it('should set ended_at for completed status', async () => {
      const updates = {
        status: 'completed' as SessionStatus,
        winner_id: 'user-123',
      };

      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'session-123' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await sessionsService.updateSession('session-123', updates);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          winner_id: 'user-123',
          updated_at: expect.any(String),
          ended_at: expect.any(String),
        })
      );
    });

    it('should handle update error', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await sessionsService.updateSession('session-123', {
        status: 'active',
      });

      expect(result.session).toBeNull();
      expect(result.error).toBe('Update failed');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.updateSession('session-123', {
        status: 'active',
      });

      expect(result.session).toBeNull();
      expect(result.error).toBe('Database error');
    });
  });

  describe('joinSessionById', () => {
    it('should join session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        team: 1,
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: null,
      };

      // Mock session check
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock existing player check
      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      // Mock player creation
      const newPlayer = {
        id: 'player-789',
        session_id: sessionId,
        user_id: userId,
        ...playerData,
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newPlayer,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ session: mockSession, player: newPlayer });
    });

    it('should handle password-protected session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        password: 'correct_password',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: { password: 'hashed_password' },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'player-789' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(true);
      expect(verifyPassword).toHaveBeenCalledWith(
        'correct_password',
        'hashed_password'
      );
    });

    it('should reject incorrect password', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        password: 'wrong_password',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: { password: 'hashed_password' },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);
      (verifyPassword as jest.Mock).mockResolvedValueOnce(false);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Incorrect password');
    });

    it('should require password when session has one', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: { password: 'hashed_password' },
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password required');
    });

    it('should reject if already in session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already in session');
    });

    it('should handle session not found', async () => {
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSessionQuery);

      const result = await sessionsService.joinSessionById(
        'session-123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found or has already started.');
    });

    it('should handle player creation error', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add player to session');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle null player creation', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting',
        settings: null,
      };

      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockPlayerCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockPlayerCheckQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await sessionsService.joinSessionById(
        sessionId,
        userId,
        playerData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create player record');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database crashed');
      });

      const result = await sessionsService.joinSessionById(
        'session-123',
        'user-456',
        { display_name: 'Test', color: '#000000' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database crashed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('updateBoardState', () => {
    it('should update board state with optimistic locking', async () => {
      const sessionId = 'session-123';
      const newBoardState = [{
        cell_id: 'cell-1',
        text: 'Test',
        colors: null,
        completed_by: null,
        blocked: null,
        is_marked: true,
        version: null,
        last_updated: null,
        last_modified_by: null,
      }];
      const currentVersion = 1;

      // Mock version check
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                version: currentVersion,
                current_state: [],
              },
              error: null,
            }),
          }),
        }),
      };

      // Mock update
      const updatedSession = {
        id: sessionId,
        current_state: newBoardState,
        version: currentVersion + 1,
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedSession,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockVersionCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await sessionsService.updateBoardState(
        sessionId,
        newBoardState,
        currentVersion
      );

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(currentVersion + 1);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_state: newBoardState,
          version: currentVersion + 1,
        })
      );
    });

    it('should detect version conflicts', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                version: 3,
                current_state: [],
              },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockVersionCheckQuery);

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Version conflict - session has been updated by another player'
      );
    });

    it('should handle version check error', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Check failed' },
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockVersionCheckQuery);

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Check failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle session not found', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockVersionCheckQuery);

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle update error', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 1, current_state: [] },
              error: null,
            }),
          }),
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockVersionCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle concurrent update (null data)', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 1, current_state: [] },
              error: null,
            }),
          }),
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockVersionCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Version conflict - session has been updated by another player'
      );
    });

    it('should handle validation failure', async () => {
      const mockVersionCheckQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 1, current_state: [] },
              error: null,
            }),
          }),
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invalid: 'data' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockVersionCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      (bingoSessionSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await sessionsService.updateBoardState(
        'session-123',
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });
});