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

const mockSupabaseClient = {
  from: jest.fn(),
};

describe('queueService - Coverage Enhancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('critical edge cases', () => {
    it('should properly serialize preferences in joinQueue', async () => {
      const complexPreferences = {
        preferredGameTypes: ['General', 'Movies'],
        preferredDifficulties: ['Easy', 'Medium'],
        maxPlayers: 6,
        allowSpectators: false,
      };

      const joinData: JoinQueueData = {
        user_id: 'user-123',
        preferences: complexPreferences,
      };

      // Mock proper chain for checking existing entry
      const mockSingle1 = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle1 });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock proper chain for insertion
      const mockSingle2 = jest.fn().mockResolvedValue({
        data: {
          id: 'queue-entry-123',
          user_id: 'user-123',
          board_id: null,
          preferences: JSON.stringify(complexPreferences),
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        error: null,
      });
      const mockSelect2 = jest.fn().mockReturnValue({ single: mockSingle2 });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect2 });

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ insert: mockInsert });

      const result = await queueService.joinQueue(joinData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith([
        {
          user_id: 'user-123',
          board_id: null,
          preferences: JSON.stringify(complexPreferences),
          status: 'waiting',
        },
      ]);
    });

    it('should handle PGRST116 error in getQueueStatus correctly', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await queueService.getQueueStatus('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle non-PGRST116 database errors in getQueueStatus', async () => {
      const dbError = { code: 'DB_ERROR', message: 'Connection timeout' };
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await queueService.getQueueStatus('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get queue status');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get queue status',
        dbError,
        { metadata: { userId: 'user-123' } }
      );
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error in getQueueStatus',
        dbError,
        { metadata: { userId: 'user-123' } }
      );
    });

    it('should handle empty user array in markAsMatched', async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockIn = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockUpdate = jest.fn().mockReturnValue({ in: mockIn });

      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      const result = await queueService.markAsMatched([], 'session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ matchedCount: 0 });
    });

    it('should handle successful batch marking in markAsMatched', async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockIn = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockUpdate = jest.fn().mockReturnValue({ in: mockIn });

      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      const userIds = ['user-1', 'user-2', 'user-3'];
      const result = await queueService.markAsMatched(userIds, 'session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ matchedCount: 3 });
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'matched',
        matched_session_id: 'session-123',
        matched_at: expect.any(String),
      });
      expect(mockIn).toHaveBeenCalledWith('user_id', userIds);
    });

    it('should calculate correct expiration timestamp in cleanupExpiredEntries', async () => {
      const mockNow = new Date('2024-01-01T12:00:00Z').getTime();
      const expectedExpiration = new Date(
        mockNow - 10 * 60 * 1000
      ).toISOString();

      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'expired-1' }],
        error: null,
      });
      const mockLt = jest.fn().mockReturnValue({ select: mockSelect });
      const mockEq = jest.fn().mockReturnValue({ lt: mockLt });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(true);
      expect(mockLt).toHaveBeenCalledWith('created_at', expectedExpiration);

      jest.restoreAllMocks();
    });

    it('should handle empty cleanup result in cleanupExpiredEntries', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockLt = jest.fn().mockReturnValue({ select: mockSelect });
      const mockEq = jest.fn().mockReturnValue({ lt: mockLt });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });

      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cleaned: 0 });
      expect(log.info).toHaveBeenCalledWith(
        'Cleaned up expired queue entries',
        {
          metadata: { cleaned: 0 },
        }
      );
    });
  });

  describe('findMatches complex scenarios', () => {
    beforeEach(() => {
      jest.spyOn(queueService, 'getWaitingEntries');
      jest.spyOn(queueService, 'markAsMatched');
    });

    it('should handle processed users deduplication', async () => {
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
          user_id: 'user-1', // Duplicate user
          board_id: 'board-456',
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

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
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

    it('should handle no waiting entries', async () => {
      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(log.info).toHaveBeenCalledWith('Matchmaking completed', {
        metadata: { matchesFound: 0 },
      });
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
  });
});
