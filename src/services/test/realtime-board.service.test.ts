/**
 * @jest-environment node
 */

import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { QueryClient } from '@tanstack/react-query';
import type { Tables } from '@/types/database.types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

type BingoBoardRow = Tables<'bingo_boards'>;

const mockQueryClient = {
  setQueryData: jest.fn(),
  removeQueries: jest.fn(),
  invalidateQueries: jest.fn(),
} as unknown as QueryClient;

const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
  channel: jest.fn(),
  removeChannel: jest.fn(),
};

// Handler storage for proper mocking
let postgresHandler: ((payload: any) => void) | undefined;
let systemHandler: (() => void) | undefined;
let statusHandler: ((status: string) => void) | undefined;

// Import service after mocks are set up
import { realtimeBoardService } from '../realtime-board.service';

describe('realtimeBoardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear handlers
    postgresHandler = undefined;
    systemHandler = undefined;
    statusHandler = undefined;
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.channel.mockReturnValue(mockChannel);

    // Setup proper handler capture
    mockChannel.on.mockImplementation((type: string, config: any, handler?: any) => {
      if (type === 'postgres_changes' && handler) {
        postgresHandler = handler;
      } else if (type === 'system' && config === 'disconnect' && handler) {
        systemHandler = handler;
      }
      return mockChannel;
    });

    mockChannel.subscribe.mockImplementation((handler: (status: string) => void) => {
      statusHandler = handler;
      return mockChannel;
    });

    // Override the private supabase client 
    (realtimeBoardService as any).supabase = mockSupabase;
  });

  afterEach(() => {
    // Clean up all subscriptions after each test
    try {
      realtimeBoardService.unsubscribeAll();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('subscribeToBoardUpdates', () => {
    it('should create subscription successfully', () => {
      const boardId = 'board-123';
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
      };

      const cleanup = realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      expect(mockSupabase.channel).toHaveBeenCalledWith(`board_${boardId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_boards',
          filter: `id=eq.${boardId}`,
        },
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'system',
        'disconnect',
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    it('should handle board UPDATE events', () => {
      const boardId = 'board-123';

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);

      const mockUpdatedBoard: BingoBoardRow = {
        id: boardId,
        title: 'Updated Board',
        description: 'Updated description',
        creator_id: 'user-123',
        game_type: 'All Games',
        difficulty: 'medium',
        size: 5,
        board_state: [],
        settings: {},
        is_public: true,
        version: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        bookmarked_count: null,
        cloned_from: null,
        status: 'active',
        votes: null,
      };

      const payload = {
        eventType: 'UPDATE' as const,
        new: mockUpdatedBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T01:00:00Z',
      };

      // Use captured handler
      expect(postgresHandler).toBeDefined();
      postgresHandler!(payload);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'byId', boardId],
        mockUpdatedBoard
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'withCreator', boardId],
        mockUpdatedBoard
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Board updated via real-time',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle board DELETE events', () => {
      const boardId = 'board-123';

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);

      const payload = {
        eventType: 'DELETE' as const,
        new: null,
        old: { id: boardId },
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T01:00:00Z',
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(payload);

      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ['bingoBoards', 'byId', boardId],
      });
      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        queryKey: ['bingoBoards', 'withCreator', boardId],
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Board deleted via real-time',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle invalid payload data gracefully', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Invalid payload - missing 'id' property
      const invalidPayload = {
        eventType: 'UPDATE' as const,
        new: { title: 'Board without ID' },
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T01:00:00Z',
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(invalidPayload);

      // Should not update cache with invalid data
      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    it('should handle errors in update handler', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Mock error in setQueryData
      mockQueryClient.setQueryData = jest.fn().mockImplementation(() => {
        throw new Error('Cache update failed');
      });

      const mockBoard: BingoBoardRow = {
        id: boardId,
        title: 'Test Board',
        description: null,
        creator_id: 'user-123',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
        is_public: true,
        version: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        bookmarked_count: null,
        cloned_from: null,
        status: 'active',
        votes: null,
      };

      const payload = {
        eventType: 'UPDATE' as const,
        new: mockBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(payload);

      expect(logger.error).toHaveBeenCalledWith(
        'Real-time board update error',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
      expect(options.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle subscription status changes', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient, options);

      // Test SUBSCRIBED status
      expect(statusHandler).toBeDefined();
      statusHandler!('SUBSCRIBED');
      expect(logger.debug).toHaveBeenCalledWith(
        'Board real-time subscribed',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Test CHANNEL_ERROR status
      statusHandler!('CHANNEL_ERROR');
      expect(logger.error).toHaveBeenCalledWith(
        'Board real-time channel error',
        undefined,
        expect.objectContaining({
          metadata: { boardId },
        })
      );
      expect(options.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle disconnect and reconnection', done => {
      const boardId = 'board-123';
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 2,
        reconnectDelay: 10, // Short delay for testing
      };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Simulate disconnect
      expect(systemHandler).toBeDefined();
      systemHandler!();

      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time disconnected',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Wait for reconnection attempt
      setTimeout(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'Attempting board real-time reconnection',
          expect.objectContaining({
            metadata: { boardId, attempt: 1 },
          })
        );
        done();
      }, 15);
    });

    it('should stop reconnecting after max attempts', done => {
      const boardId = 'board-123';
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 1,
        reconnectDelay: 10,
      };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Use jest fake timers for better control
      jest.useFakeTimers();

      // Simulate multiple disconnects
      expect(systemHandler).toBeDefined();
      systemHandler!(); // First disconnect
      
      // Fast forward past first reconnection attempt
      jest.advanceTimersByTime(10);
      
      systemHandler!(); // Second disconnect - should exceed max attempts

      // Fast forward past second attempt
      jest.advanceTimersByTime(20);

      expect(logger.error).toHaveBeenCalledWith(
        'Max reconnection attempts reached for board',
        undefined,
        expect.objectContaining({
          metadata: { boardId },
        })
      );
      expect(options.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Real-time connection failed',
        })
      );
      
      jest.useRealTimers();
      done();
    });

    it('should not create duplicate subscriptions', () => {
      const boardId = 'board-123';

      // Create first subscription
      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

      // Try to create second subscription for same board
      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1); // Should not create another

      expect(logger.warn).toHaveBeenCalledWith(
        'Board subscription already exists',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });
  });

  describe('unsubscribeAll', () => {
    it('should cleanup all subscriptions', () => {
      const boardId1 = 'board-123';
      const boardId2 = 'board-456';

      // Create multiple subscriptions
      realtimeBoardService.subscribeToBoardUpdates(boardId1, mockQueryClient);
      realtimeBoardService.subscribeToBoardUpdates(boardId2, mockQueryClient);

      realtimeBoardService.unsubscribeAll();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        'All board real-time subscriptions cleaned up'
      );
    });

    it('should handle cleanup with no subscriptions', () => {
      realtimeBoardService.unsubscribeAll();

      expect(mockSupabase.removeChannel).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'All board real-time subscriptions cleaned up'
      );
    });
  });

  describe('unsubscribeFromBoard', () => {
    it('should cleanup specific board subscription', () => {
      const boardId = 'board-123';

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      realtimeBoardService.unsubscribeFromBoard(boardId);

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Board real-time subscription removed',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle unsubscribe from non-existent subscription', () => {
      realtimeBoardService.unsubscribeFromBoard('nonexistent-board');

      expect(mockSupabase.removeChannel).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalledWith(
        'Board real-time subscription removed',
        expect.any(Object)
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscribed for active subscription', () => {
      const boardId = 'board-123';

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      const status = realtimeBoardService.getSubscriptionStatus(boardId);

      expect(status).toBe('subscribed');
    });

    it('should return not_subscribed for non-existent subscription', () => {
      const status =
        realtimeBoardService.getSubscriptionStatus('nonexistent-board');

      expect(status).toBe('not_subscribed');
    });
  });

  describe('refreshBoard', () => {
    it('should invalidate board queries', async () => {
      const boardId = 'board-123';

      await realtimeBoardService.refreshBoard(boardId, mockQueryClient);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['bingoBoards', 'byId', boardId],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['bingoBoards', 'withCreator', boardId],
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Force refreshing board',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle refresh errors', async () => {
      const boardId = 'board-123';
      const error = new Error('Invalidation failed');

      mockQueryClient.invalidateQueries = jest
        .fn()
        .mockRejectedValueOnce(error);

      await expect(
        realtimeBoardService.refreshBoard(boardId, mockQueryClient)
      ).rejects.toThrow('Invalidation failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh board',
        error,
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      const boardId = 'board-123';
      const nonErrorObject = 'string error';

      // Create a fresh mock query client for this test
      const invalidateQueriesMock = jest.fn().mockRejectedValueOnce(nonErrorObject);
      const testQueryClient = {
        ...mockQueryClient,
        invalidateQueries: invalidateQueriesMock,
      } as unknown as QueryClient;

      try {
        await realtimeBoardService.refreshBoard(boardId, testQueryClient);
        // If it doesn't throw, verify the mock was called
        expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
        throw new Error('Function should have thrown but did not');
      } catch (error) {
        // Verify the mock was called
        expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
        expect(error).toEqual(nonErrorObject);
      }
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh board',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });
  });

  describe('cleanup functionality', () => {
    it('should properly cleanup subscription when cleanup function is called', () => {
      const boardId = 'board-123';

      const cleanup = realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient
      );

      cleanup();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Board real-time subscription cleaned up',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Verify subscription is removed
      const status = realtimeBoardService.getSubscriptionStatus(boardId);
      expect(status).toBe('not_subscribed');
    });
  });

  describe('additional coverage for uncovered lines', () => {
    it('should handle subscription creation edge cases', () => {
      const boardId = 'board-123';

      // Test subscription with all options
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 3,
        reconnectDelay: 500,
      };

      const cleanup = realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Test TIMED_OUT status
      statusHandler!('TIMED_OUT');
      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time connection timed out',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Test CLOSED status
      statusHandler!('CLOSED');
      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time connection closed',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Test unknown status
      statusHandler!('UNKNOWN_STATUS');
      // Should not log anything for unknown status

      cleanup();
    });

    it('should handle INSERT events for boards', () => {
      const boardId = 'board-insert-test';
      
      // Create a fresh mock specifically for this test to avoid state pollution
      const insertTestQueryClient = {
        setQueryData: jest.fn(),
        removeQueries: jest.fn(),
        invalidateQueries: jest.fn(),
      } as unknown as QueryClient;

      realtimeBoardService.subscribeToBoardUpdates(boardId, insertTestQueryClient);

      const newBoard: BingoBoardRow = {
        id: boardId,
        title: 'New Board',
        description: 'New board description',
        creator_id: 'user-123',
        game_type: 'All Games',
        difficulty: 'easy',
        size: 5,
        board_state: [],
        settings: {},
        is_public: true,
        version: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        bookmarked_count: null,
        cloned_from: null,
        status: 'active',
        votes: null,
      };

      const payload = {
        eventType: 'INSERT' as const,
        new: newBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(payload);

      // Check that both calls were made - the service makes both calls
      expect(insertTestQueryClient.setQueryData).toHaveBeenCalledTimes(2);
      expect(insertTestQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'byId', boardId],
        newBoard
      );
      expect(insertTestQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'withCreator', boardId],
        newBoard
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Board created via real-time',
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle subscription errors during event processing', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Mock setQueryData to throw an error
      (mockQueryClient.setQueryData as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Cache update failed');
      });

      const validPayload = {
        eventType: 'UPDATE' as const,
        new: { id: boardId, title: 'Test Board' },
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(validPayload);

      // Should handle the error gracefully
      expect(logger.error).toHaveBeenCalledWith(
        'Real-time board update error',
        expect.any(Error),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
      expect(options.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle reconnection attempts and failure scenarios', done => {
      const boardId = 'board-123';
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 2,
        reconnectDelay: 10,
      };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Use fake timers for more reliable testing
      jest.useFakeTimers();

      // Simulate disconnect
      expect(systemHandler).toBeDefined();
      systemHandler!();

      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time disconnected',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Fast forward to trigger first reconnection
      jest.advanceTimersByTime(10);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Attempting board real-time reconnection',
        expect.objectContaining({
          metadata: { boardId, attempt: 1 },
        })
      );

      // Trigger another disconnect (second attempt)
      systemHandler!();
      jest.advanceTimersByTime(20);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Attempting board real-time reconnection',
        expect.objectContaining({
          metadata: { boardId, attempt: 2 },
        })
      );

      // Trigger final disconnect (should exceed max attempts)
      systemHandler!();
      jest.advanceTimersByTime(30);

      expect(logger.error).toHaveBeenCalledWith(
        'Max reconnection attempts reached for board',
        undefined,
        expect.objectContaining({
          metadata: { boardId },
        })
      );
      expect(options.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Real-time connection failed',
        })
      );
      
      jest.useRealTimers();
      done();
    });

    it('should handle edge cases in subscription management', () => {
      const boardId = 'board-123';

      // Test subscribing to a board that's already subscribed
      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

      // Try to subscribe again - should not create new subscription
      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Board subscription already exists',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Test getting status of existing subscription
      const status = realtimeBoardService.getSubscriptionStatus(boardId);
      expect(status).toBe('subscribed');

      // Test unsubscribing
      realtimeBoardService.unsubscribeFromBoard(boardId);
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);

      // Test getting status after unsubscribe
      const statusAfterUnsub =
        realtimeBoardService.getSubscriptionStatus(boardId);
      expect(statusAfterUnsub).toBe('not_subscribed');

      // Test unsubscribing from non-existent subscription
      realtimeBoardService.unsubscribeFromBoard('nonexistent');
      // Should not call removeChannel again
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
    });

    it('should handle query client invalidation errors', async () => {
      const boardId = 'board-123';
      const invalidationError = new Error('Query invalidation failed');

      // Mock invalidateQueries to fail
      mockQueryClient.invalidateQueries = jest
        .fn()
        .mockRejectedValueOnce(invalidationError);

      await expect(
        realtimeBoardService.refreshBoard(boardId, mockQueryClient)
      ).rejects.toThrow('Query invalidation failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh board',
        invalidationError,
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle non-Error objects in refresh failures', async () => {
      const boardId = 'board-123';
      const stringError = 'String error message';

      // Create a fresh mock query client for this test
      const invalidateQueriesMock = jest.fn().mockRejectedValueOnce(stringError);
      const testQueryClient = {
        ...mockQueryClient,
        invalidateQueries: invalidateQueriesMock,
      } as unknown as QueryClient;

      try {
        await realtimeBoardService.refreshBoard(boardId, testQueryClient);
        throw new Error('Function should have thrown but did not');
      } catch (error) {
        expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
        expect(error).toEqual(stringError);
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh board',
        expect.objectContaining({
          message: stringError,
        }),
        expect.objectContaining({
          metadata: { boardId },
        })
      );
    });

    it('should handle subscription cleanup edge cases', () => {
      // Test cleanup when no subscriptions exist
      realtimeBoardService.unsubscribeAll();
      expect(mockSupabase.removeChannel).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'All board real-time subscriptions cleaned up'
      );

      // Create multiple subscriptions
      realtimeBoardService.subscribeToBoardUpdates('board-1', mockQueryClient);
      realtimeBoardService.subscribeToBoardUpdates('board-2', mockQueryClient);
      realtimeBoardService.subscribeToBoardUpdates('board-3', mockQueryClient);

      // Clean up all
      realtimeBoardService.unsubscribeAll();
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(3);
      expect(logger.debug).toHaveBeenCalledWith(
        'All board real-time subscriptions cleaned up'
      );
    });

    it('should handle malformed payload data gracefully', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Test with completely malformed payload
      const malformedPayload = {
        randomField: 'value',
        // Missing all required fields
      };

      expect(postgresHandler).toBeDefined();
      postgresHandler!(malformedPayload as any);

      // Should handle gracefully without crashing
      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    it('should handle subscription status edge cases', () => {
      const boardId = 'board-123';

      const options = { onError: jest.fn() };
      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Test various status types
      const statuses = [
        'SUBSCRIBED',
        'CHANNEL_ERROR',
        'TIMED_OUT',
        'CLOSED',
        'CONNECTING',
        'UNKNOWN',
      ];

      expect(statusHandler).toBeDefined();
      statuses.forEach(status => {
        statusHandler!(status);
      });

      // Verify appropriate logging occurred
      expect(logger.debug).toHaveBeenCalledWith(
        'Board real-time subscribed',
        expect.objectContaining({ metadata: { boardId } })
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Board real-time channel error',
        undefined,
        expect.objectContaining({ metadata: { boardId } })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time connection timed out',
        expect.objectContaining({ metadata: { boardId } })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time connection closed',
        expect.objectContaining({ metadata: { boardId } })
      );
    });
  });
});
