/**
 * Real-time Board Service
 *
 * Handles Supabase real-time subscriptions for bingo boards.
 * Provides clean integration with TanStack Query for automatic cache updates.
 */

import { createClient } from '@/lib/supabase';
import type { QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import type { Tables } from '@/types/database-generated';

type BingoBoardRow = Tables<'bingo_boards'>;
type PostgresChangesPayload<T> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T | null;
};

interface RealtimeBoardSubscription {
  boardId: string;
  channel: ReturnType<ReturnType<typeof createClient>['channel']>;
  cleanup: () => void;
}

class RealtimeBoardService {
  private subscriptions = new Map<string, RealtimeBoardSubscription>();
  private supabase = createClient();

  /**
   * Subscribe to real-time updates for a specific board
   */
  subscribeToBoardUpdates(
    boardId: string,
    queryClient: QueryClient,
    options: {
      onUpdate?: (board: BingoBoardRow) => void;
      onError?: (error: Error) => void;
      maxReconnectAttempts?: number;
      reconnectDelay?: number;
    } = {}
  ): () => void {
    // Don't create duplicate subscriptions
    if (this.subscriptions.has(boardId)) {
      logger.warn('Board subscription already exists', {
        metadata: { boardId },
      });
      const subscription = this.subscriptions.get(boardId);
      return subscription ? subscription.cleanup : () => {};
    }

    const {
      onUpdate,
      onError,
      maxReconnectAttempts = 3,
      reconnectDelay = 2000,
    } = options;

    let reconnectAttempts = 0;

    const setupSubscription = () => {
      const channel = this.supabase.channel(`board_${boardId}`);

      channel
        .on<PostgresChangesPayload<BingoBoardRow>>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bingo_boards',
            filter: `id=eq.${boardId}`,
          },
          payload => {
            try {
              if (payload.eventType === 'UPDATE' && payload.new) {
                const updatedBoard = payload.new as unknown as BingoBoardRow;

                // Update TanStack Query cache
                queryClient.setQueryData(
                  ['bingoBoards', 'byId', boardId],
                  updatedBoard
                );
                queryClient.setQueryData(
                  ['bingoBoards', 'withCreator', boardId],
                  updatedBoard
                );

                // Call custom update handler
                onUpdate?.(updatedBoard);

                logger.debug('Board updated via real-time', {
                  metadata: { boardId, version: updatedBoard.version },
                });
              } else if (payload.eventType === 'DELETE') {
                // Remove from cache if board is deleted
                queryClient.removeQueries({
                  queryKey: ['bingoBoards', 'byId', boardId],
                });
                queryClient.removeQueries({
                  queryKey: ['bingoBoards', 'withCreator', boardId],
                });

                logger.debug('Board deleted via real-time', {
                  metadata: { boardId },
                });
              }
            } catch (error) {
              const err =
                error instanceof Error
                  ? error
                  : new Error('Unknown real-time error');
              logger.error('Real-time board update error', err, {
                metadata: { boardId },
              });
              onError?.(err);
            }
          }
        )
        .on('system', 'disconnect', () => {
          logger.warn('Board real-time disconnected', {
            metadata: { boardId },
          });

          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
              logger.info('Attempting board real-time reconnection', {
                metadata: { boardId, attempt: reconnectAttempts },
              });
              setupSubscription();
            }, reconnectDelay * reconnectAttempts);
          } else {
            logger.error(
              'Max reconnection attempts reached for board',
              undefined,
              { metadata: { boardId } }
            );
            onError?.(new Error('Real-time connection failed'));
          }
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0; // Reset on successful connection
            logger.debug('Board real-time subscribed', {
              metadata: { boardId },
            });
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Board real-time channel error', undefined, {
              metadata: { boardId },
            });
            onError?.(new Error('Real-time channel error'));
          }
        });

      return channel;
    };

    const channel = setupSubscription();

    const cleanup = () => {
      this.supabase.removeChannel(channel);
      this.subscriptions.delete(boardId);
      logger.debug('Board real-time subscription cleaned up', {
        metadata: { boardId },
      });
    };

    // Store subscription for cleanup
    this.subscriptions.set(boardId, {
      boardId,
      channel,
      cleanup,
    });

    return cleanup;
  }

  /**
   * Unsubscribe from all board updates
   */
  unsubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.cleanup();
    }
    this.subscriptions.clear();
    logger.debug('All board real-time subscriptions cleaned up');
  }

  /**
   * Unsubscribe from a specific board
   */
  unsubscribeFromBoard(boardId: string): void {
    const subscription = this.subscriptions.get(boardId);
    if (subscription) {
      subscription.cleanup();
      logger.debug('Board real-time subscription removed', {
        metadata: { boardId },
      });
    }
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(
    boardId: string
  ): 'subscribed' | 'not_subscribed' | 'error' {
    const subscription = this.subscriptions.get(boardId);
    if (!subscription) return 'not_subscribed';

    // Note: Supabase doesn't expose channel status directly
    // This is a simplified status check
    return 'subscribed';
  }

  /**
   * Force refresh a board from the server and update cache
   */
  async refreshBoard(boardId: string, queryClient: QueryClient): Promise<void> {
    try {
      logger.debug('Force refreshing board', { metadata: { boardId } });

      // Invalidate queries to trigger fresh fetch
      await queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'byId', boardId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'withCreator', boardId],
      });
    } catch (error) {
      logger.error('Failed to refresh board', error as Error, {
        metadata: { boardId },
      });
      throw error;
    }
  }
}

// Export singleton instance
export const realtimeBoardService = new RealtimeBoardService();
