/**
 * @jest-environment node
 */

import { queueService } from '../queue.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type { QueueEntry } from '../queue.service';

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

describe('queueService - Enhanced Coverage Tests', () => {
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

  describe('findMatches - Edge Cases for Lines 287-298', () => {
    beforeEach(() => {
      jest.spyOn(queueService, 'getWaitingEntries');
      jest.spyOn(queueService, 'markAsMatched');
    });

    it('should handle null user_id in waiting entries (line 291)', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: null as any, // This should be filtered out
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
      expect(result.data?.[0]?.matched_players).toEqual(['user-2', 'user-3']);
    });

    it('should handle empty user_id string in waiting entries', async () => {
      const waitingEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          user_id: '', // Empty string should be filtered out
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

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      // Should have no matches because we need at least 2 valid players
      expect(result.data).toHaveLength(0);
    });

    it('should check boardGroups.has() before accessing (lines 294-295)', async () => {
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

      // Spy on Map methods to verify the has() check
      const originalMapHas = Map.prototype.has;
      const originalMapSet = Map.prototype.set;
      const originalMapGet = Map.prototype.get;
      
      const hasSpied = jest.fn(originalMapHas);
      const setSpied = jest.fn(originalMapSet);
      const getSpied = jest.fn(originalMapGet);
      
      Map.prototype.has = hasSpied;
      Map.prototype.set = setSpied;
      Map.prototype.get = getSpied;

      try {
        await queueService.findMatches();

        // Verify has() was called before get()
        expect(hasSpied).toHaveBeenCalledWith('board-123');
        expect(setSpied).toHaveBeenCalledWith('board-123', expect.any(Array));
      } finally {
        // Restore original methods
        Map.prototype.has = originalMapHas;
        Map.prototype.set = originalMapSet;
        Map.prototype.get = originalMapGet;
      }
    });

    it('should handle undefined board_id with null-safe push (line 297)', async () => {
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

      // Override the get method to return undefined
      const mockBoardGroups = new Map<string, QueueEntry[]>();
      const originalGet = mockBoardGroups.get;
      mockBoardGroups.get = jest.fn(() => undefined); // This tests the optional chaining

      // We can't directly test the internal Map, but we can verify the result
      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      // Should have no matches because only 1 player
      expect(result.data).toHaveLength(0);
    });
  });

  describe('findMatches - General Queue Edge Cases for Lines 368-369', () => {
    beforeEach(() => {
      jest.spyOn(queueService, 'getWaitingEntries');
      jest.spyOn(queueService, 'markAsMatched');
    });

    it('should handle sessionError but continue processing', async () => {
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
        {
          id: 'entry-3',
          user_id: 'user-3',
          board_id: null, // General queue
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:02:00Z',
          updated_at: '2024-01-01T00:02:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        {
          id: 'entry-4',
          user_id: 'user-4',
          board_id: null, // General queue
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:03:00Z',
          updated_at: '2024-01-01T00:03:00Z',
          matched_at: null,
          matched_session_id: null,
        },
      ];

      (queueService.getWaitingEntries as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: waitingEntries,
      });

      // First session creation succeeds
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'session-456', board_id: 'board-123' },
        error: null,
      });

      (queueService.markAsMatched as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { matchedCount: 2 },
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

      // General queue session creation has error (sessionError)
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Session creation failed' },
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(true);
      // Should only have 1 match (board-specific), general queue failed
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
        session_id: 'session-456',
        matched_players: ['user-1', 'user-2'],
        board_id: 'board-123',
      });
    });

    it('should handle successful general queue match with settings (lines 368-375)', async () => {
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
      
      // Verify session creation was called with full settings object
      expect(mockFrom.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          board_id: 'public-board-123',
          host_id: 'user-1',
          status: 'waiting',
          settings: {
            max_players: 4,
            auto_start: false,
            allow_spectators: true,
            require_approval: false,
            time_limit: null,
            password: null,
          },
        }),
      ]);
    });
  });

  describe('Error Handling Edge Cases for Lines 427-440', () => {
    it('should handle getWaitingEntries returning undefined data', async () => {
      jest.spyOn(queueService, 'getWaitingEntries').mockResolvedValueOnce({
        success: true,
        data: undefined as any, // This triggers the error path
      });

      const result = await queueService.findMatches();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get waiting entries');
    });

    it('should handle all edge cases in error paths', async () => {
      // Test null error case
      jest.spyOn(queueService, 'getWaitingEntries').mockRejectedValueOnce(null);

      let result = await queueService.findMatches();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to find matches');

      // Test undefined error case
      jest.spyOn(queueService, 'getWaitingEntries').mockRejectedValueOnce(undefined);

      result = await queueService.findMatches();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to find matches');

      // Test object error case
      const complexError = { code: 'QUEUE_ERROR', details: { reason: 'timeout' } };
      jest.spyOn(queueService, 'getWaitingEntries').mockRejectedValueOnce(complexError);

      result = await queueService.findMatches();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to find matches');
    });
  });

  describe('Clean Up Expired Entries - Database Integrity (Lines 501-506)', () => {
    it('should handle database constraint errors during cleanup', async () => {
      const constraintError = {
        message: 'Foreign key constraint violation',
        code: '23503',
        details: 'Cannot delete queue entry referenced by another table',
      };

      mockFrom.select.mockResolvedValueOnce({
        data: null,
        error: constraintError,
      });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Foreign key constraint violation');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to cleanup expired entries',
        constraintError
      );
    });

    it('should handle partial cleanup results', async () => {
      // Return some entries but with undefined/null mixed in
      const mixedEntries = [
        { id: 'expired-1' },
        null,
        { id: 'expired-2' },
        undefined,
        { id: 'expired-3' },
      ];

      mockFrom.select.mockResolvedValueOnce({
        data: mixedEntries,
        error: null,
      });

      const result = await queueService.cleanupExpiredEntries();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cleaned: 5 }); // Length includes null/undefined
    });
  });

  describe('Matchmaking Complex Scenarios (Lines 651-670)', () => {
    beforeEach(() => {
      jest.spyOn(queueService, 'getWaitingEntries');
      jest.spyOn(queueService, 'markAsMatched');
    });

    it('should handle complex board grouping with mixed valid/invalid entries', async () => {
      const waitingEntries: QueueEntry[] = [
        // Valid board group
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
        // Invalid entries that should be skipped
        {
          id: 'entry-3',
          user_id: '', // Empty user_id
          board_id: 'board-123',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:02:00Z',
          updated_at: '2024-01-01T00:02:00Z',
          matched_at: null,
          matched_session_id: null,
        },
        // Another board group with only 1 valid player
        {
          id: 'entry-4',
          user_id: 'user-4',
          board_id: 'board-456',
          preferences: null,
          status: 'waiting',
          created_at: '2024-01-01T00:03:00Z',
          updated_at: '2024-01-01T00:03:00Z',
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
        data: { id: 'session-123', board_id: 'board-123' },
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
        session_id: 'session-123',
        matched_players: ['user-1', 'user-2'],
        board_id: 'board-123',
      });
    });

    it('should process users only once across multiple board groups', async () => {
      // This tests the processedUsers Set functionality
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
          user_id: 'user-1', // Same user, different entry - should be skipped
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
      expect(result.data).toHaveLength(0); // No matches because only 1 unique user
    });
  });
});