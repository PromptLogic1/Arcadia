/**
 * @jest-environment jsdom
 */

import { RealtimeBoardService } from '../realtime-board.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import { QueryClient } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

describe('RealtimeBoardService - Enhanced Coverage', () => {
  const mockSupabase = {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  };

  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };

  const mockQueryClient = {
    setQueryData: jest.fn(),
    removeQueries: jest.fn(),
    invalidateQueries: jest.fn(),
  } as unknown as QueryClient;

  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockLog = log as jest.Mocked<typeof log>;

  let service: RealtimeBoardService;
  const boardId = 'board-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    mockCreateClient.mockReturnValue(mockSupabase as any);
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    service = new RealtimeBoardService();
  });

  describe('Enhanced coverage for uncovered lines', () => {
    // Test for lines 77-162 (subscription status handling)
    it('should handle TIMED_OUT subscription status', async () => {
      const onError = jest.fn();
      let subscribeCallback: (status: string) => void = () => {};

      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger TIMED_OUT status
      subscribeCallback('TIMED_OUT');

      expect(mockLog.error).toHaveBeenCalledWith(
        'Board real-time subscription timeout',
        undefined,
        { metadata: { boardId } }
      );
      expect(onError).toHaveBeenCalledWith(new Error('Real-time subscription timeout'));
    });

    it('should handle CLOSED subscription status', async () => {
      const onError = jest.fn();
      let subscribeCallback: (status: string) => void = () => {};

      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger CLOSED status
      subscribeCallback('CLOSED');

      expect(mockLog.error).toHaveBeenCalledWith(
        'Board real-time subscription closed',
        undefined,
        { metadata: { boardId } }
      );
      expect(onError).toHaveBeenCalledWith(new Error('Real-time subscription closed'));
    });

    it('should handle unknown subscription status', async () => {
      let subscribeCallback: (status: string) => void = () => {};

      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient);

      // Trigger unknown status
      subscribeCallback('UNKNOWN_STATUS');

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Unknown real-time subscription status',
        { metadata: { boardId, status: 'UNKNOWN_STATUS' } }
      );
    });

    // Test for lines 173-174 (INSERT event handling)
    it('should handle INSERT event for new board', async () => {
      const onUpdate = jest.fn();
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onUpdate });

      // Trigger INSERT event
      const newBoard = { id: boardId, title: 'New Board' };
      eventCallback({
        eventType: 'INSERT',
        new: newBoard,
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'byId', boardId],
        newBoard
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['bingoBoards', 'withCreator', boardId],
        newBoard
      );
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Board created via real-time',
        { metadata: { boardId } }
      );
    });

    // Test for lines 196-197, 207 (error handling in event processing)
    it('should handle error in event processing', async () => {
      const onError = jest.fn();
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      // Mock setQueryData to throw
      mockQueryClient.setQueryData.mockImplementation(() => {
        throw new Error('Cache update failed');
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger UPDATE event
      eventCallback({
        eventType: 'UPDATE',
        new: { id: boardId, title: 'Updated' },
      });

      expect(mockLog.error).toHaveBeenCalledWith(
        'Real-time board update error',
        expect.any(Error),
        { metadata: { boardId } }
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle non-Error objects in event processing', async () => {
      const onError = jest.fn();
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      // Mock setQueryData to throw non-Error
      mockQueryClient.setQueryData.mockImplementation(() => {
        throw 'String error';
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger UPDATE event
      eventCallback({
        eventType: 'UPDATE',
        new: { id: boardId },
      });

      expect(onError).toHaveBeenCalledWith(new Error('Unknown real-time error'));
    });

    it('should handle malformed payload gracefully', async () => {
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient);

      // Trigger UPDATE with invalid payload
      eventCallback({
        eventType: 'UPDATE',
        new: null, // Invalid payload
      });

      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    it('should handle payload without id', async () => {
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient);

      // Trigger UPDATE with payload missing id
      eventCallback({
        eventType: 'UPDATE',
        new: { title: 'No ID' }, // Missing id field
      });

      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });

    // Test for reconnection logic
    it('should handle reconnection after disconnect', async () => {
      jest.useFakeTimers();
      let disconnectCallback: () => void = () => {};

      mockChannel.on.mockImplementation((event, eventType, callback) => {
        if (event === 'system' && eventType === 'disconnect') {
          disconnectCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient);

      // Trigger disconnect
      disconnectCallback();

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Board real-time disconnected',
        { metadata: { boardId } }
      );

      // Fast-forward to trigger reconnection
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockLog.info).toHaveBeenCalledWith(
        'Attempting board real-time reconnection',
        { metadata: { boardId, attempt: 1 } }
      );

      jest.useRealTimers();
    });

    it('should handle max reconnection attempts', async () => {
      jest.useFakeTimers();
      const onError = jest.fn();
      let disconnectCallback: () => void = () => {};

      mockChannel.on.mockImplementation((event, eventType, callback) => {
        if (event === 'system' && eventType === 'disconnect') {
          disconnectCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger multiple disconnects to reach max attempts
      for (let i = 0; i < 4; i++) {
        disconnectCallback();
        await jest.advanceTimersByTimeAsync((i + 1) * 1000);
      }

      expect(mockLog.error).toHaveBeenCalledWith(
        'Max reconnection attempts reached for board',
        undefined,
        { metadata: { boardId } }
      );
      expect(onError).toHaveBeenCalledWith(new Error('Real-time connection failed'));

      jest.useRealTimers();
    });

    // Test for subscription management
    it('should handle duplicate subscription attempts', () => {
      const cleanup1 = service.subscribeToBoard(boardId, mockQueryClient);
      
      // Check that subscription exists
      expect(service['subscriptions'].has(boardId)).toBe(true);
      
      // Try to subscribe again
      const cleanup2 = service.subscribeToBoard(boardId, mockQueryClient);
      
      // Should return early warning
      expect(mockLog.warn).toHaveBeenCalledWith(
        'Board already has active subscription',
        { metadata: { boardId } }
      );
      
      // Cleanup should be a no-op function
      expect(typeof cleanup2).toBe('function');
      
      cleanup1();
    });

    it('should handle query client invalidation errors', async () => {
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      // Mock removeQueries to throw
      mockQueryClient.removeQueries.mockImplementation(() => {
        throw new Error('Query invalidation failed');
      });

      const onError = jest.fn();
      service.subscribeToBoard(boardId, mockQueryClient, { onError });

      // Trigger DELETE event
      eventCallback({
        eventType: 'DELETE',
      });

      expect(mockLog.error).toHaveBeenCalledWith(
        'Real-time board update error',
        expect.any(Error),
        { metadata: { boardId } }
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Additional edge cases', () => {
    it('should handle subscription cleanup properly', () => {
      const cleanup = service.subscribeToBoard(boardId, mockQueryClient);
      
      expect(service['subscriptions'].has(boardId)).toBe(true);
      
      cleanup();
      
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      expect(service['subscriptions'].has(boardId)).toBe(false);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Board real-time subscription cleaned up',
        { metadata: { boardId } }
      );
    });

    it('should handle cleanup of all subscriptions', () => {
      // Subscribe to multiple boards
      const cleanup1 = service.subscribeToBoard('board-1', mockQueryClient);
      const cleanup2 = service.subscribeToBoard('board-2', mockQueryClient);
      const cleanup3 = service.subscribeToBoard('board-3', mockQueryClient);
      
      expect(service['subscriptions'].size).toBe(3);
      
      // Cleanup all
      service.cleanup();
      
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(3);
      expect(service['subscriptions'].size).toBe(0);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cleaned up all real-time subscriptions',
        { metadata: { count: 3 } }
      );
    });

    it('should handle event with missing eventType', async () => {
      let eventCallback: (payload: any) => void = () => {};

      mockChannel.on.mockImplementation((event, filter, callback) => {
        if (event === 'postgres_changes') {
          eventCallback = callback;
        }
        return mockChannel;
      });

      service.subscribeToBoard(boardId, mockQueryClient);

      // Trigger event without eventType
      eventCallback({
        new: { id: boardId },
      });

      // Should not process the event
      expect(mockQueryClient.setQueryData).not.toHaveBeenCalled();
    });
  });
});