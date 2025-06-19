/**
 * @jest-environment node
 */

import { sessionsService } from '../sessions.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { hashPassword, verifyPassword, generateSessionCode } from '@/lib/crypto-utils';
import type { SessionStatus } from '../sessions.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/crypto-utils');
jest.mock('@/lib/validation/schemas/bingo', () => ({
  bingoSessionSchema: {
    safeParse: jest.fn().mockImplementation((data) => ({
      success: true,
      data: data,
    })),
  },
  sessionStatsArraySchema: {
    safeParse: jest.fn().mockImplementation((data) => ({
      success: true,
      data: data || [],
    })),
  },
}));
jest.mock('@/lib/validation/transforms', () => ({
  transformBoardState: jest.fn().mockImplementation((state) => state || []),
  transformSessionSettings: jest.fn().mockImplementation((settings) => settings),
}));

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  not: jest.fn(),
  in: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  ilike: jest.fn(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  limit: jest.fn(),
};

const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockGenerateSessionCode = generateSessionCode as jest.MockedFunction<typeof generateSessionCode>;

describe('sessionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.delete.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.neq.mockReturnValue(mockFrom);
    mockFrom.not.mockReturnValue(mockFrom);
    mockFrom.in.mockReturnValue(mockFrom);
    mockFrom.gte.mockReturnValue(mockFrom);
    mockFrom.lte.mockReturnValue(mockFrom);
    mockFrom.ilike.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.maybeSingle.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.range.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);

    // Mock crypto functions
    mockGenerateSessionCode.mockReturnValue('ABC123');
    mockHashPassword.mockResolvedValue('hashed_password');
    mockVerifyPassword.mockResolvedValue(true);
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

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'session-123',
        status: 'waiting',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should handle session not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found', code: 'PGRST116' },
      });

      const result = await sessionsService.getSessionById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

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

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await sessionsService.getSessionByCode('ABC123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        session_code: 'ABC123',
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('session_code', 'ABC123');
    });

    it('should handle code not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const result = await sessionsService.getSessionByCode('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
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

      mockFrom.range.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
        count: 1,
      });

      const result = await sessionsService.getActiveSessions({}, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toHaveLength(1);
      expect(result.data?.totalCount).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('session_stats');
      expect(mockFrom.in).toHaveBeenCalledWith('status', ['waiting', 'active']);
    });

    it('should apply filters correctly', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await sessionsService.getActiveSessions({
        search: 'test',
        gameCategory: 'General',
        showPrivate: false,
        status: 'waiting',
      });

      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
      expect(mockFrom.eq).toHaveBeenCalledWith('has_password', false);
      expect(mockFrom.eq).toHaveBeenCalledWith('board_game_type', 'General');
      expect(mockFrom.ilike).toHaveBeenCalledWith('board_title', '%test%');
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
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'user-456' },
        error: null,
      });

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

      mockFrom.single.mockResolvedValueOnce({
        data: createdSession,
        error: null,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        session_code: 'ABC123',
        status: 'waiting',
      });
      expect(mockHashPassword).toHaveBeenCalledWith('secret123');
      expect(mockGenerateSessionCode).toHaveBeenCalledWith(6);
    });

    it('should reject invalid host_id', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: '',
      };

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid host ID is required to create a session');
    });

    it('should reject non-existent host', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'nonexistent-user',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found. Please ensure you are logged in.');
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
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'waiting', settings: {} },
        error: null,
      });

      // Mock existing player check - return the mock from object directly
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock color availability check - return the mock from object directly  
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock player insertion
      const newPlayer = {
        id: 'player-789',
        ...joinData,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: newPlayer,
        error: null,
      });

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

      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'active', settings: {} },
        error: null,
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is not accepting new players');
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

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock no existing player
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock player count check - need to return count properly
      mockFrom.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ count: 2, error: null })
      });

      // Mock player creation
      const newPlayer = {
        id: 'player-789',
        session_id: 'session-123',
        user_id: userId,
        ...playerData,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: newPlayer,
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

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

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockVerifyPassword.mockResolvedValueOnce(true);

      // Mock rest of the flow
      mockFrom.single.mockResolvedValueOnce({ data: null, error: null });
      mockFrom.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ count: 1, error: null })
      });
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'player-789' },
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(mockVerifyPassword).toHaveBeenCalledWith('correct_password', 'hashed_password');
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

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockVerifyPassword.mockResolvedValueOnce(false);

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Incorrect password');
    });
  });

  describe('leaveSession', () => {
    it('should leave session successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await sessionsService.leaveSession('session-123', 'user-456');

      expect(result.success).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('session_id', 'session-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-456');
    });

    it('should handle leave errors', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      const result = await sessionsService.leaveSession('session-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update status to active', async () => {
      const updatedSession = {
        id: 'session-123',
        status: 'active' as SessionStatus,
        started_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSession,
        error: null,
      });

      const result = await sessionsService.updateSessionStatus('session-123', 'active');

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          started_at: expect.any(String),
        })
      );
    });

    it('should handle update errors', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await sessionsService.updateSessionStatus('session-123', 'active');

      expect(result.session).toBeNull();
      expect(result.error).toBe('Update failed');
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

      mockFrom.eq.mockResolvedValueOnce({
        data: mockPlayers,
        error: null,
      });

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlayers);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_players');
      expect(mockFrom.eq).toHaveBeenCalledWith('session_id', 'session-123');
    });

    it('should handle empty player list', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await sessionsService.getSessionPlayers('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
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

      // Mock color availability check - return count directly
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      mockFrom.single.mockResolvedValueOnce({
        data: updatedPlayer,
        error: null,
      });

      const result = await sessionsService.updatePlayer('session-456', 'user-789', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedPlayer);
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
    });

    it('should reject invalid display name length', async () => {
      const result = await sessionsService.updatePlayer('session-123', 'user-456', {
        display_name: 'ab', // Too short
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Display name must be between 3 and 20 characters');
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({ error: null });

      const result = await sessionsService.deleteSession('session-123');

      expect(result.success).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should handle deletion errors', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      const result = await sessionsService.deleteSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      const sessionId = 'session-123';
      const hostId = 'user-456';

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: {
          host_id: hostId,
          status: 'waiting',
        },
        error: null,
      });

      // Mock player count check - return count directly
      mockFrom.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ count: 3, error: null })
      });

      // Mock session update
      const updatedSession = {
        id: sessionId,
        status: 'active' as SessionStatus,
        started_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSession,
        error: null,
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-host user', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: {
          host_id: 'other-user',
          status: 'waiting',
        },
        error: null,
      });

      const result = await sessionsService.startSession('session-123', 'user-456');

      expect(result.session).toBeNull();
      expect(result.error).toBe('Only the host can start the session');
    });
  });

  describe('checkPlayerExists', () => {
    it('should return true when player exists', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'player-123' },
        error: null,
      });

      const result = await sessionsService.checkPlayerExists('session-123', 'user-456');

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return false when player does not exist', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await sessionsService.checkPlayerExists('session-123', 'user-456');

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('checkColorAvailable', () => {
    it('should return true when color is available', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await sessionsService.checkColorAvailable('session-123', '#ff0000');

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return false when color is taken', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { color: '#ff0000' },
        error: null,
      });

      const result = await sessionsService.checkColorAvailable('session-123', '#ff0000');

      expect(result.available).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should exclude specific user when checking color availability', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await sessionsService.checkColorAvailable('session-123', '#ff0000', 'user-123');

      expect(result.available).toBe(true);
      expect(mockFrom.neq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should handle database error in checkColorAvailable', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await sessionsService.checkColorAvailable('session-123', '#ff0000');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle unexpected error in checkColorAvailable', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsService.checkColorAvailable('session-123', '#ff0000');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  // Additional edge case tests
  describe('getSessionById - additional edge cases', () => {
    it('should handle validation failure', async () => {
      const mockSession = {
        id: 'session-123',
        board_id: 'board-456',
        // Missing required fields to trigger validation failure
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock validation failure
      const { bingoSessionSchema } = require('@/lib/validation/schemas/bingo');
      bingoSessionSchema.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.getSessionById('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getSessionByCode - additional edge cases', () => {
    it('should handle validation failure', async () => {
      const mockSession = {
        id: 'session-123',
        session_code: 'ABC123',
        // Missing required fields
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock validation failure
      const { bingoSessionSchema } = require('@/lib/validation/schemas/bingo');
      bingoSessionSchema.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.getSessionByCode('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getActiveSessions - additional edge cases', () => {
    it('should handle validation failure gracefully', async () => {
      const mockSessions = [{ id: 'session-1', status: 'waiting' }];

      mockFrom.range.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
        count: 1,
      });

      // Mock validation failure
      const { sessionStatsArraySchema } = require('@/lib/validation/schemas/bingo');
      sessionStatsArraySchema.safeParse.mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'Validation failed' }] },
      });

      const result = await sessionsService.getActiveSessions({}, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.sessions).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
      expect(log.debug).toHaveBeenCalled();
    });

    it('should apply all filters correctly', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await sessionsService.getActiveSessions({
        search: 'test',
        gameCategory: 'General',
        difficulty: 'easy',
        showPrivate: true,
        status: 'all',
      });

      expect(mockFrom.in).toHaveBeenCalledWith('status', ['waiting', 'active']);
      expect(mockFrom.eq).toHaveBeenCalledWith('board_game_type', 'General');
      expect(mockFrom.ilike).toHaveBeenCalledWith('board_title', '%test%');
      expect(mockFrom.eq).not.toHaveBeenCalledWith('has_password', false);
    });

    it('should handle database error in getActiveSessions', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      const result = await sessionsService.getActiveSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('createSession - additional edge cases', () => {
    it('should handle session creation without password', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
        settings: {
          max_players: 4,
          allow_spectators: true,
        },
      };

      // Mock user existence check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'user-456' },
        error: null,
      });

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
          allow_spectators: true,
          auto_start: false,
          time_limit: null,
          require_approval: false,
          password: null,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        started_at: null,
        ended_at: null,
        version: 1,
        winner_id: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdSession,
        error: null,
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(true);
      expect(mockHashPassword).not.toHaveBeenCalled();
    });

    it('should handle empty password string', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
        settings: {
          password: '   ', // Whitespace only
        },
      };

      // Mock user existence check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'user-456' },
        error: null,
      });

      // Mock session creation
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-789', session_code: 'ABC123' },
        error: null,
      });

      await sessionsService.createSession(sessionData);

      expect(mockHashPassword).not.toHaveBeenCalled();
    });

    it('should handle validation failure after creation', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      // Mock user existence check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'user-456' },
        error: null,
      });

      // Mock session creation
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-789' },
        error: null,
      });

      // Mock validation failure
      const { bingoSessionSchema } = require('@/lib/validation/schemas/bingo');
      bingoSessionSchema.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
    });

    it('should handle database error during creation', async () => {
      const sessionData = {
        board_id: 'board-123',
        host_id: 'user-456',
      };

      // Mock user existence check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'user-456' },
        error: null,
      });

      // Mock session creation failure
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await sessionsService.createSession(sessionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('joinSession - additional edge cases', () => {
    it('should handle session not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle player count check error', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session status check
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'waiting', settings: {} },
        error: null,
      });

      // Mock existing player check with error
      mockFrom.single.mockResolvedValueOnce({
        count: null,
        error: { message: 'Count error' },
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count error');
    });

    it('should handle color check error', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session status check
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'waiting', settings: {} },
        error: null,
      });

      // Mock existing player check
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock color availability check with error
      mockFrom.single.mockResolvedValueOnce({
        count: null,
        error: { message: 'Color check error' },
      });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color check error');
    });

    it('should handle existing player found', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session status check
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'waiting', settings: {} },
        error: null,
      });

      // Mock existing player found
      mockFrom.single.mockResolvedValueOnce({ count: 1, error: null });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in session');
    });

    it('should handle color already taken', async () => {
      const joinData = {
        session_id: 'session-123',
        user_id: 'user-456',
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session status check
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'waiting', settings: {} },
        error: null,
      });

      // Mock existing player check
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock color taken
      mockFrom.single.mockResolvedValueOnce({ count: 1, error: null });

      const result = await sessionsService.joinSession(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });
  });

  describe('joinSessionByCode - additional edge cases', () => {
    it('should handle session not in waiting state', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: 'session-123',
        status: 'active' as SessionStatus,
        settings: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Session is no longer accepting players');
    });

    it('should handle missing password for protected session', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        // No password provided
      };

      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: {
          password: 'hashed_password',
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Password required');
    });

    it('should handle session at maximum capacity', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: {
          max_players: 2,
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock no existing player
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock player count at max
      mockFrom.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ count: 2, error: null })
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(result.session).toBeNull();
      expect(result.player).toBeNull();
      expect(result.error).toBe('Session is full');
    });

    it('should handle existing player in session', async () => {
      const sessionCode = 'ABC123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: 'session-123',
        status: 'waiting' as SessionStatus,
        settings: null,
      };

      const existingPlayer = {
        id: 'player-123',
        session_id: 'session-123',
        user_id: userId,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: existingPlayer,
        error: null,
      });

      const result = await sessionsService.joinSessionByCode(sessionCode, userId, playerData);

      expect(result.session).toEqual(mockSession);
      expect(result.player).toEqual(existingPlayer);
      expect(result.sessionId).toBe('session-123');
      expect(result.error).toBeUndefined();
    });
  });

  describe('updatePlayerReady', () => {
    it('should update player ready status successfully', async () => {
      const updatedPlayer = {
        id: 'player-123',
        session_id: 'session-456',
        user_id: 'user-789',
        is_ready: true,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedPlayer,
        error: null,
      });

      const result = await sessionsService.updatePlayerReady('session-456', 'user-789', true);

      expect(result.player).toEqual(updatedPlayer);
      expect(result.error).toBeUndefined();
      expect(mockFrom.update).toHaveBeenCalledWith({ is_ready: true });
    });

    it('should handle update error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await sessionsService.updatePlayerReady('session-456', 'user-789', true);

      expect(result.player).toBeNull();
      expect(result.error).toBe('Update failed');
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsService.updatePlayerReady('session-456', 'user-789', true);

      expect(result.player).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('updatePlayer - additional edge cases', () => {
    it('should handle color taken by another player', async () => {
      const updates = {
        color: '#0000ff',
      };

      // Mock color taken by another player
      mockFrom.single.mockResolvedValueOnce({ count: 1, error: null });

      const result = await sessionsService.updatePlayer('session-456', 'user-789', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color already taken');
    });

    it('should handle color check error', async () => {
      const updates = {
        color: '#0000ff',
      };

      // Mock color check error
      mockFrom.single.mockResolvedValueOnce({
        count: null,
        error: { message: 'Color check failed' },
      });

      const result = await sessionsService.updatePlayer('session-456', 'user-789', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Color check failed');
    });

    it('should handle update without color change', async () => {
      const updates = {
        display_name: 'New Name',
      };

      const updatedPlayer = {
        id: 'player-123',
        session_id: 'session-456',
        user_id: 'user-789',
        display_name: 'New Name',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedPlayer,
        error: null,
      });

      const result = await sessionsService.updatePlayer('session-456', 'user-789', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedPlayer);
      // Should not check color availability when not updating color
      expect(mockFrom.single).toHaveBeenCalledTimes(1); // Only the update call
    });
  });

  describe('getSessionStatus', () => {
    it('should return session status successfully', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      });

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should handle session not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBeNull();
      expect(result.error).toBe('Session not found');
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsService.getSessionStatus('session-123');

      expect(result.status).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('checkPlayerExists - additional edge cases', () => {
    it('should handle database error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      const result = await sessionsService.checkPlayerExists('session-123', 'user-456');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsService.checkPlayerExists('session-123', 'user-456');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getSessionsByBoardId', () => {
    it('should return sessions for board successfully', async () => {
      const mockSessions = [
        { id: 'session-1', board_id: 'board-123', status: 'waiting' },
        { id: 'session-2', board_id: 'board-123', status: 'active' },
      ];

      mockFrom.eq.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      });

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessions);
      expect(mockFrom.eq).toHaveBeenCalledWith('board_id', 'board-123');
    });

    it('should filter by status when provided', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await sessionsService.getSessionsByBoardId('board-123', 'active');

      expect(mockFrom.eq).toHaveBeenCalledWith('board_id', 'board-123');
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should handle database error', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await sessionsService.getSessionsByBoardId('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getSessionsByBoardIdWithPlayers', () => {
    it('should return sessions with players successfully', async () => {
      const mockSessionsWithPlayers = [
        {
          id: 'session-1',
          board_id: 'board-123',
          bingo_session_players: [
            { user_id: 'user-1', display_name: 'Player 1', color: '#ff0000', team: null },
          ],
        },
      ];

      mockFrom.eq.mockResolvedValueOnce({
        data: mockSessionsWithPlayers,
        error: null,
      });

      const result = await sessionsService.getSessionsByBoardIdWithPlayers('board-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessionsWithPlayers);
      expect(mockFrom.select).toHaveBeenCalledWith(expect.stringContaining('bingo_session_players'));
    });

    it('should handle sessions with no players', async () => {
      const mockSessionsWithNoPlayers = [
        {
          id: 'session-1',
          board_id: 'board-123',
          bingo_session_players: null,
        },
      ];

      mockFrom.eq.mockResolvedValueOnce({
        data: mockSessionsWithNoPlayers,
        error: null,
      });

      const result = await sessionsService.getSessionsByBoardIdWithPlayers('board-123');

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.bingo_session_players).toEqual([]);
    });

    it('should handle database error', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Join error' },
      });

      const result = await sessionsService.getSessionsByBoardIdWithPlayers('board-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Join error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('startSession - additional edge cases', () => {
    it('should reject starting session with insufficient players', async () => {
      const sessionId = 'session-123';
      const hostId = 'user-456';

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: {
          host_id: hostId,
          status: 'waiting',
        },
        error: null,
      });

      // Mock insufficient players
      mockFrom.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ count: 1, error: null })
      });

      const result = await sessionsService.startSession(sessionId, hostId);

      expect(result.session).toBeNull();
      expect(result.error).toBe('Need at least 2 players to start');
    });

    it('should reject starting non-waiting session', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: {
          host_id: 'user-456',
          status: 'active',
        },
        error: null,
      });

      const result = await sessionsService.startSession('session-123', 'user-456');

      expect(result.session).toBeNull();
      expect(result.error).toBe('Session is not in waiting state');
    });

    it('should handle session not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session not found' },
      });

      const result = await sessionsService.startSession('session-123', 'user-456');

      expect(result.session).toBeNull();
      expect(result.error).toBe('Session not found');
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      const updates = {
        current_state: [{ row: 0, col: 0, marked: true }],
        status: 'active' as SessionStatus,
      };

      const updatedSession = {
        id: 'session-123',
        ...updates,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSession,
        error: null,
      });

      const result = await sessionsService.updateSession('session-123', updates);

      expect(result.session).toEqual(updatedSession);
      expect(result.error).toBeUndefined();
      expect(mockFrom.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updates,
        updated_at: expect.any(String),
      }));
    });

    it('should set ended_at when status is completed', async () => {
      const updates = {
        status: 'completed' as SessionStatus,
        winner_id: 'user-123',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-123', ...updates },
        error: null,
      });

      await sessionsService.updateSession('session-123', updates);

      expect(mockFrom.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        winner_id: 'user-123',
        ended_at: expect.any(String),
        updated_at: expect.any(String),
      }));
    });

    it('should handle update error', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await sessionsService.updateSession('session-123', { status: 'active' });

      expect(result.session).toBeNull();
      expect(result.error).toBe('Update failed');
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await sessionsService.updateSession('session-123', { status: 'active' });

      expect(result.session).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('joinSessionById', () => {
    it('should join session by ID successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting' as SessionStatus,
        settings: null,
      };

      const mockPlayer = {
        id: 'player-123',
        session_id: sessionId,
        user_id: userId,
        ...playerData,
      };

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      // Mock player existence check
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock player creation
      mockFrom.single.mockResolvedValueOnce({
        data: mockPlayer,
        error: null,
      });

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(result.success).toBe(true);
      expect(result.data?.session).toEqual(mockSession);
      expect(result.data?.player).toEqual(mockPlayer);
    });

    it('should handle password verification', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
        password: 'correct_password',
      };

      const mockSession = {
        id: sessionId,
        status: 'waiting' as SessionStatus,
        settings: {
          password: 'hashed_password',
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockVerifyPassword.mockResolvedValueOnce(true);

      // Mock rest of flow
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'player-123' },
        error: null,
      });

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(mockVerifyPassword).toHaveBeenCalledWith('correct_password', 'hashed_password');
      expect(result.success).toBe(true);
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
        status: 'waiting' as SessionStatus,
        settings: {
          password: 'hashed_password',
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockSession,
        error: null,
      });

      mockVerifyPassword.mockResolvedValueOnce(false);

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Incorrect password');
    });

    it('should handle player creation failure', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: sessionId, status: 'waiting', settings: null },
        error: null,
      });

      // Mock player existence check
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock player creation failure
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add player to session');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle null player creation result', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: sessionId, status: 'waiting', settings: null },
        error: null,
      });

      // Mock player existence check
      mockFrom.single.mockResolvedValueOnce({ count: 0, error: null });

      // Mock player creation returning null
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create player record');
    });

    it('should handle already in session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const playerData = {
        display_name: 'TestUser',
        color: '#ff0000',
      };

      // Mock session check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: sessionId, status: 'waiting', settings: null },
        error: null,
      });

      // Mock player already exists
      mockFrom.single.mockResolvedValueOnce({ count: 1, error: null });

      const result = await sessionsService.joinSessionById(sessionId, userId, playerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already in session');
    });
  });

  describe('updateBoardState', () => {
    it('should update board state successfully', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock version check
      mockFrom.single.mockResolvedValueOnce({
        data: { version: 1, current_state: [] },
        error: null,
      });

      // Mock successful update
      const updatedSession = {
        id: sessionId,
        current_state: boardState,
        version: 2,
        updated_at: expect.any(String),
      };

      mockFrom.single.mockResolvedValueOnce({
        data: updatedSession,
        error: null,
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        current_state: boardState,
        version: 2,
      });
      expect(mockFrom.update).toHaveBeenCalledWith({
        current_state: boardState,
        version: 2,
        updated_at: expect.any(String),
      });
    });

    it('should handle version conflict', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock version conflict
      mockFrom.single.mockResolvedValueOnce({
        data: { version: 2, current_state: [] }, // Version mismatch
        error: null,
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Version conflict - session has been updated by another player');
    });

    it('should handle session not found during version check', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock session not found
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle atomic update failure', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock version check success
      mockFrom.single.mockResolvedValueOnce({
        data: { version: 1, current_state: [] },
        error: null,
      });

      // Mock atomic update returning null (version conflict)
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Version conflict - session has been updated by another player');
    });

    it('should handle update database error', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock version check success
      mockFrom.single.mockResolvedValueOnce({
        data: { version: 1, current_state: [] },
        error: null,
      });

      // Mock update error
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle validation failure after update', async () => {
      const sessionId = 'session-123';
      const boardState = [{ row: 0, col: 0, marked: true }];
      const currentVersion = 1;

      // Mock version check success
      mockFrom.single.mockResolvedValueOnce({
        data: { version: 1, current_state: [] },
        error: null,
      });

      // Mock successful update
      mockFrom.single.mockResolvedValueOnce({
        data: { id: sessionId, version: 2 },
        error: null,
      });

      // Mock validation failure
      const { bingoSessionSchema } = require('@/lib/validation/schemas/bingo');
      bingoSessionSchema.safeParse.mockReturnValueOnce({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await sessionsService.updateBoardState(sessionId, boardState, currentVersion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data format');
    });
  });
});