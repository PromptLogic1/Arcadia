/**
 * @jest-environment node
 */

import { queueService } from '../queue.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { QueueEntry, JoinQueueData } from '../queue.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  from: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  lt: jest.fn(),
  single: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
};

describe('queueService', () => {
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
    mockFrom.in.mockReturnValue(mockFrom);
    mockFrom.lt.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.limit.mockReturnValue(mockFrom);

    // Default success responses
    mockFrom.eq.mockResolvedValue({ error: null });
    mockFrom.single.mockResolvedValue({ data: null, error: null });
    mockFrom.order.mockResolvedValue({ data: [], error: null });
  });

  describe('joinQueue', () => {
    const joinData: JoinQueueData = {
      user_id: 'user-123',
      board_id: 'board-456',
      preferences: {
        preferredGameTypes: ['General'],
        preferredDifficulties: ['Easy'],
        maxPlayers: 4,
        allowSpectators: true,
      },
    };

    it('should join queue successfully', async () => {
      // Mock existing entry check - no existing entry
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      // Mock successful insertion
      const newEntry: QueueEntry = {
        id: 'queue-entry-123',
        user_id: 'user-123',
        board_id: 'board-456',
        preferences: JSON.stringify(joinData.preferences),
        status: 'waiting',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        matched_at: null,
        matched_session_id: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: newEntry,
        error: null,
      });

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newEntry);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.insert).toHaveBeenCalledWith([
        {
          user_id: 'user-123',
          board_id: 'board-456',
          preferences: JSON.stringify(joinData.preferences),
          status: 'waiting',
        },
      ]);
    });

    it('should join queue without preferences', async () => {
      const basicJoinData: JoinQueueData = {
        user_id: 'user-123',
      };

      // Mock no existing entry
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const newEntry: QueueEntry = {
        id: 'queue-entry-123',
        user_id: 'user-123',
        board_id: null,
        preferences: null,
        status: 'waiting',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        matched_at: null,
        matched_session_id: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: newEntry,
        error: null,
      });

      const result = await queueService.joinQueue(basicJoinData);

      expect(result.success).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalledWith([
        {
          user_id: 'user-123',
          board_id: null,
          preferences: null,
          status: 'waiting',
        },
      ]);
    });

    it('should reject user already in queue', async () => {
      const existingEntry: QueueEntry = {
        id: 'existing-entry',
        user_id: 'user-123',
        board_id: null,
        preferences: null,
        status: 'waiting',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        matched_at: null,
        matched_session_id: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: existingEntry,
        error: null,
      });

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already in queue');
      expect(log.warn).toHaveBeenCalledWith('User already in queue', {
        metadata: { userId: joinData.user_id },
      });
    });

    it('should handle database error during insertion', async () => {
      // Mock no existing entry
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock insertion error
      const insertError = { message: 'Insertion failed', code: 'DB_ERROR' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: insertError,
      });

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insertion failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to join queue',
        insertError,
        { metadata: { userId: joinData.user_id, boardId: joinData.board_id } }
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in joinQueue',
        expect.any(Error),
        { metadata: { data: joinData } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockFrom.single.mockRejectedValueOnce('String error');

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to join queue');
    });
  });

  describe('leaveQueue', () => {
    const userId = 'user-123';

    it('should leave queue successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null,
      });

      const result = await queueService.leaveQueue(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Successfully left the queue' });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
    });

    it('should handle database error during leave', async () => {
      const error = { message: 'Update failed' };
      mockFrom.eq.mockResolvedValueOnce({
        error,
      });

      const result = await queueService.leaveQueue(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith('Failed to leave queue', error, {
        metadata: { userId },
      });
    });

    it('should handle unexpected error', async () => {
      // Create a custom mock chain that throws an error at the end
      const mockUpdateChain = {
        eq: jest.fn(),
      };

      // First eq() returns self, second eq() rejects
      mockUpdateChain.eq
        .mockReturnValueOnce(mockUpdateChain) // First .eq('user_id', userId)
        .mockRejectedValueOnce(new Error('Network error')); // Second .eq('status', 'waiting')

      mockFrom.update.mockReturnValueOnce(mockUpdateChain);

      const result = await queueService.leaveQueue(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in leaveQueue',
        expect.any(Error),
        { metadata: { userId } }
      );
    });

    it('should handle non-Error objects', async () => {
      // Mock the chain to return the update function, then mock it to reject
      const mockUpdateChain = {
        eq: jest.fn(),
      };

      // First eq() returns self, second eq() rejects with string
      mockUpdateChain.eq
        .mockReturnValueOnce(mockUpdateChain) // First .eq('user_id', userId)
        .mockRejectedValueOnce('String error'); // Second .eq('status', 'waiting')

      mockFrom.update.mockReturnValueOnce(mockUpdateChain);

      const result = await queueService.leaveQueue(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to leave queue');
    });
  });

  describe('getQueueStatus', () => {
    const userId = 'user-123';

    it('should return queue status when user is in queue', async () => {
      const queueEntry: QueueEntry = {
        id: 'queue-entry-123',
        user_id: userId,
        board_id: 'board-456',
        preferences: null,
        status: 'waiting',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        matched_at: null,
        matched_session_id: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: queueEntry,
        error: null,
      });

      const result = await queueService.getQueueStatus(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(queueEntry);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
    });

    it('should return null when user is not in queue', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await queueService.getQueueStatus(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database error', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await queueService.getQueueStatus(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get queue status',
        error,
        { metadata: { userId } }
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.single.mockRejectedValueOnce(new Error('Network error'));

      const result = await queueService.getQueueStatus(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getQueueStatus',
        expect.any(Error),
        { metadata: { userId } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockFrom.single.mockRejectedValueOnce('String error');

      const result = await queueService.getQueueStatus(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get queue status');
    });
  });

  describe('getWaitingEntries', () => {
    it('should return waiting entries', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: 'board-1',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: 'user-2',
          board_id: null,
          preferences: '{"maxPlayers": 4}',
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: waitingEntries,
        error: null,
      });

      const result = await queueService.getWaitingEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(waitingEntries);
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: true,
      });
    });

    it('should return empty array when no entries', async () => {
      mockFrom.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await queueService.getWaitingEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database error', async () => {
      const error = { message: 'Database error' };
      mockFrom.order.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await queueService.getWaitingEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get waiting entries',
        error
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.order.mockRejectedValueOnce(new Error('Network error'));

      const result = await queueService.getWaitingEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getWaitingEntries',
        expect.any(Error)
      );
    });

    it('should handle non-Error objects', async () => {
      mockFrom.order.mockRejectedValueOnce('String error');

      const result = await queueService.getWaitingEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get waiting entries');
    });
  });

  describe('markAsMatched', () => {
    const userIds = ['user-1', 'user-2', 'user-3'];
    const sessionId = 'session-123';

    it('should mark entries as matched successfully', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null,
      });

      const result = await queueService.markAsMatched(userIds, sessionId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ matchedCount: 3 });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'matched',
        matched_session_id: sessionId,
        matched_at: expect.any(String),
      });
      expect(mockFrom.in).toHaveBeenCalledWith('user_id', userIds);
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
    });

    it('should handle database error during marking', async () => {
      const error = { message: 'Update failed' };
      mockFrom.eq.mockResolvedValueOnce({
        error,
      });

      const result = await queueService.markAsMatched(userIds, sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to mark queue entries as matched',
        error,
        { metadata: { userIds, sessionId } }
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.eq.mockRejectedValueOnce(new Error('Network error'));

      const result = await queueService.markAsMatched(userIds, sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in markAsMatched',
        expect.any(Error),
        { metadata: { userIds, sessionId } }
      );
    });

    it('should handle non-Error objects', async () => {
      mockFrom.eq.mockRejectedValueOnce('String error');

      const result = await queueService.markAsMatched(userIds, sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to mark as matched');
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should cleanup expired entries successfully', async () => {
      const expiredEntries = [{ id: 'expired-1' }, { id: 'expired-2' }];

      mockFrom.select.mockResolvedValueOnce({
        data: expiredEntries,
        error: null,
      });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cleaned: 2 });
      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_queue_entries');
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'waiting');
      expect(mockFrom.lt).toHaveBeenCalledWith(
        'created_at',
        expect.any(String)
      );
      expect(log.info).toHaveBeenCalledWith(
        'Cleaned up expired queue entries',
        { metadata: { cleaned: 2 } }
      );
    });

    it('should handle no expired entries', async () => {
      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cleaned: 0 });
    });

    it('should handle database error during cleanup', async () => {
      const error = { message: 'Delete failed' };
      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error,
      });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to cleanup expired entries',
        error
      );
    });

    it('should handle unexpected error', async () => {
      mockFrom.select.mockRejectedValueOnce(new Error('Network error'));

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in cleanupExpiredEntries',
        expect.any(Error)
      );
    });

    it('should handle non-Error objects', async () => {
      mockFrom.select.mockRejectedValueOnce('String error');

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to cleanup expired entries');
    });
  });

  describe('findMatches', () => {
    beforeEach(() => {
      // Mock getWaitingEntries method
      jest.spyOn(queueService, 'getWaitingEntries');
      jest.spyOn(queueService, 'markAsMatched');
    });

    it('should find matches for board-specific queues', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: 'user-2',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // Mock session creation
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-456', board_id: 'board-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { matchedCount: 2 },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
        session_id: 'session-456',
        matched_players: ['user-1', 'user-2'],
        board_id: 'board-123',
      });
      expect(log.info).toHaveBeenCalledWith('Matchmaking completed', {
        metadata: { matchesFound: 1 },
      });
    });

    it('should find matches for general queue with public boards', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: null, // General queue
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: 'user-2',
          board_id: null, // General queue
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // Mock public board lookup
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: 'public-board-123' }],
              error: null,
            }),
          }),
        }),
      });

      // Mock session creation
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-789', board_id: 'public-board-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { matchedCount: 2 },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
        session_id: 'session-789',
        matched_players: ['user-1', 'user-2'],
        board_id: 'public-board-123',
      });
    });

    it('should limit matches to specified maximum', async () => {
      const waitingEntries: QueueEntry[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `entry-${i}`,
          user_id: `user-${i}`,
          board_id: `board-${Math.floor(i / 4)}`,
          preferences: null,
          status: 'waiting' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        })
      );

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // Mock session creation for multiple groups
      mockFrom.single.mockResolvedValue({
        data: { id: 'session-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValue({
        success: true,
        data: { matchedCount: 4 },
      });

      const result = await queueService.findMatches(2); // Limit to 2 matches

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle getWaitingEntries failure', async () => {
      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in findMatches',
        expect.any(Error),
        { metadata: { maxMatches: 5 } }
      );
    });

    it('should handle session creation failure gracefully', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: 'user-2',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // Mock session creation failure
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session creation failed' },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0); // No matches due to session creation failure
    });

    it('should handle no waiting entries', async () => {
      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle insufficient players for board-specific queue', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0); // No matches with only 1 player
    });

    it('should handle no public boards available for general queue', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: null,
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: 'user-2',
          board_id: null,
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // Mock no public boards available
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle unexpected error during matching', async () => {
      (queueService.getWaitingEntries as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await queueService.findMatches();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in findMatches',
        expect.any(Error),
        { metadata: { maxMatches: 5 } }
      );
    });

    it('should handle non-Error objects during matching', async () => {
      (queueService.getWaitingEntries as jest.Mock).mockRejectedValueOnce(
        'String error'
      );

      const result = await queueService.findMatches();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to find matches');
    });

    it('should limit players per match to 4', async () => {
      const waitingEntries: QueueEntry[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `entry-${i}`,
          user_id: `user-${i}`,
          board_id: 'board-123',
          preferences: null,
          status: 'waiting' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        })
      );

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-123', board_id: 'board-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { matchedCount: 4 },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.matched_players).toHaveLength(4); // Should only match 4 players
    });

    it('should filter out null user_ids', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-2',
          user_id: null as any, // Invalid user_id
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:01:00Z',
          updated_at: '2024-01-01T00:01:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-3',
          user_id: 'user-3',
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:02:00Z',
          updated_at: '2024-01-01T00:02:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-123', board_id: 'board-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { matchedCount: 2 },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.matched_players).toEqual(['user-1', 'user-3']); // Should filter out null user_id
    });
  });
});
