/**
 * @jest-environment node
 */

import { realtimeBoardService } from '../realtime-board.service';
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

describe('realtimeBoardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.channel.mockReturnValue(mockChannel);

    // Setup default chaining behavior for channel
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    // Clean up all subscriptions after each test
    realtimeBoardService.unsubscribeAll();
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
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

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
      };

      const payload = {
        eventType: 'UPDATE' as const,
        new: mockUpdatedBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T01:00:00Z',
      };

      updateHandler!(payload);

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
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);

      const payload = {
        eventType: 'DELETE' as const,
        new: null,
        old: { id: boardId },
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T01:00:00Z',
      };

      updateHandler!(payload);

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
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

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

      updateHandler!(invalidPayload);

      // Should not update cache with invalid data
      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    it('should handle errors in update handler', () => {
      const boardId = 'board-123';
      const options = { onError: jest.fn() };
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

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
      };

      const payload = {
        eventType: 'UPDATE' as const,
        new: mockBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      updateHandler!(payload);

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
      let statusHandler: (status: string) => void;

      mockChannel.subscribe.mockImplementation(handler => {
        statusHandler = handler;
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);

      // Test SUBSCRIBED status
      statusHandler!('SUBSCRIBED');
      expect(logger.debug).toHaveBeenCalledWith(
        'Board real-time subscribed',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Test CHANNEL_ERROR status
      const options = { onError: jest.fn() };
      realtimeBoardService.subscribeToBoardUpdates(
        `${boardId}-error`,
        mockQueryClient,
        options
      );
      statusHandler!('CHANNEL_ERROR');
      expect(logger.error).toHaveBeenCalledWith(
        'Board real-time channel error',
        undefined,
        expect.objectContaining({
          metadata: { boardId: `${boardId}-error` },
        })
      );
    });

    it('should handle disconnect and reconnection', done => {
      const boardId = 'board-123';
      const options = {
        onError: jest.fn(),
        maxReconnectAttempts: 2,
        reconnectDelay: 10, // Short delay for testing
      };
      let disconnectHandler: () => void;

      mockChannel.on.mockImplementation((type, event, handler) => {
        if (type === 'system' && event === 'disconnect') {
          disconnectHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Simulate disconnect
      disconnectHandler!();

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
      let disconnectHandler: () => void;

      mockChannel.on.mockImplementation((type, event, handler) => {
        if (type === 'system' && event === 'disconnect') {
          disconnectHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Simulate multiple disconnects
      disconnectHandler!(); // First disconnect

      setTimeout(() => {
        disconnectHandler!(); // Second disconnect - should exceed max attempts

        setTimeout(() => {
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
          done();
        }, 15);
      }, 15);
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

      mockQueryClient.invalidateQueries = jest
        .fn()
        .mockRejectedValueOnce(nonErrorObject);

      await expect(
        realtimeBoardService.refreshBoard(boardId, mockQueryClient)
      ).rejects.toThrow('string error');

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
      let systemHandler: () => void;
      let statusHandler: (status: string) => void;

      // Mock channel methods to capture handlers
      mockChannel.on.mockImplementation((type, event, handler) => {
        if (type === 'system' && event === 'disconnect') {
          systemHandler = handler;
        }
        return mockChannel;
      });

      mockChannel.subscribe.mockImplementation(handler => {
        statusHandler = handler;
        return mockChannel;
      });

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
      const boardId = 'board-123';
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(boardId, mockQueryClient);

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
      };

      const payload = {
        eventType: 'INSERT' as const,
        new: newBoard,
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      updateHandler!(payload);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'byId', boardId],
        newBoard
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
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
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Mock a payload that will cause an error due to missing board data
      const invalidPayload = {
        eventType: 'UPDATE' as const,
        new: null, // This should cause an error
        old: null,
        schema: 'public',
        table: 'bingo_boards',
        commit_timestamp: '2024-01-01T00:00:00Z',
      };

      updateHandler!(invalidPayload);

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
      let disconnectHandler: () => void;

      mockChannel.on.mockImplementation((type, event, handler) => {
        if (type === 'system' && event === 'disconnect') {
          disconnectHandler = handler;
        }
        return mockChannel;
      });

      realtimeBoardService.subscribeToBoardUpdates(
        boardId,
        mockQueryClient,
        options
      );

      // Simulate disconnect
      disconnectHandler!();

      expect(logger.warn).toHaveBeenCalledWith(
        'Board real-time disconnected',
        expect.objectContaining({
          metadata: { boardId },
        })
      );

      // Wait for first reconnection attempt
      setTimeout(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'Attempting board real-time reconnection',
          expect.objectContaining({
            metadata: { boardId, attempt: 1 },
          })
        );

        // Trigger another disconnect (second attempt)
        disconnectHandler!();

        setTimeout(() => {
          expect(logger.info).toHaveBeenCalledWith(
            'Attempting board real-time reconnection',
            expect.objectContaining({
              metadata: { boardId, attempt: 2 },
            })
          );

          // Trigger final disconnect (should exceed max attempts)
          disconnectHandler!();

          setTimeout(() => {
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
            done();
          }, 15);
        }, 15);
      }, 15);
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

      mockQueryClient.invalidateQueries = jest
        .fn()
        .mockRejectedValueOnce(stringError);

      await expect(
        realtimeBoardService.refreshBoard(boardId, mockQueryClient)
      ).rejects.toThrow('String error message');

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
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((type, config, handler) => {
        if (type === 'postgres_changes') {
          updateHandler = handler;
        }
        return mockChannel;
      });

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

      updateHandler!(malformedPayload as any);

      // Should handle gracefully without crashing
      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    it('should handle subscription status edge cases', () => {
      const boardId = 'board-123';
      let statusHandler: (status: string) => void;

      mockChannel.subscribe.mockImplementation(handler => {
        statusHandler = handler;
        return mockChannel;
      });

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
