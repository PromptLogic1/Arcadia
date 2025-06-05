'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  presenceService,
  PRESENCE_CONSTANTS,
  type PresenceState,
} from '../../../services/presence-modern.service';
import { logger } from '@/lib/logger';

export interface UsePresenceProps {
  boardId: string;
  userId?: string;
}

export interface UsePresenceReturn {
  presenceState: Record<string, PresenceState>;
  error: Error | null;
  getOnlineUsers: () => PresenceState[];
  updatePresence: (status: PresenceState['status']) => Promise<void>;
  isConnected: boolean;
}

export const usePresence = ({
  boardId,
  userId: _userId,
}: UsePresenceProps): UsePresenceReturn => {
  // State for presence data
  const [presenceState, setPresenceState] = useState<
    Record<string, PresenceState>
  >({});
  const [error, setError] = useState<Error | null>(null);
  const [updatePresenceFunc, setUpdatePresenceFunc] = useState<
    ((status: PresenceState['status']) => Promise<void>) | null
  >(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track mounted state to prevent updates after unmount
  const isMountedRef = useRef(true);

  // Helper function to get online users
  const getOnlineUsers = useCallback(
    () =>
      Object.values(presenceState).filter(
        p => p.status === PRESENCE_CONSTANTS.STATUS.ONLINE
      ),
    [presenceState]
  );

  // Update presence status
  const updatePresence = useCallback(
    async (status: PresenceState['status']) => {
      if (!updatePresenceFunc) {
        logger.warn('Presence not initialized', { metadata: { boardId } });
        return;
      }

      try {
        await updatePresenceFunc(status);
      } catch (error) {
        logger.error('Failed to update presence', error as Error, {
          metadata: { boardId, status },
        });
        setError(error as Error);
      }
    },
    [updatePresenceFunc, boardId]
  );

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set up presence subscription
  useEffect(() => {
    if (!boardId) return;

    logger.debug('Setting up presence subscription', { metadata: { boardId } });

    let cleanup: (() => void) | null = null;
    let isSubscriptionActive = true;

    const setupPresence = async () => {
      try {
        if (!isMountedRef.current) return;

        setError(null);
        setIsConnected(false);

        const subscription = await presenceService.subscribeToPresence(
          boardId,
          {
            onPresenceUpdate: (
              newPresenceState: Record<string, PresenceState>
            ) => {
              if (!isMountedRef.current || !isSubscriptionActive) return;

              logger.debug('Presence state updated', {
                metadata: {
                  boardId,
                  userCount: Object.keys(newPresenceState).length,
                },
              });
              setPresenceState(newPresenceState);
            },

            onUserJoin: (key: string, presence: PresenceState) => {
              if (!isMountedRef.current || !isSubscriptionActive) return;

              logger.debug('User joined presence', {
                metadata: { boardId, userId: presence.user_id },
              });
              setPresenceState(prev => ({
                ...prev,
                [key]: presence,
              }));
            },

            onUserLeave: (key: string) => {
              if (!isMountedRef.current || !isSubscriptionActive) return;

              logger.debug('User left presence', {
                metadata: { boardId, key },
              });
              setPresenceState(prev => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
              });
            },

            onError: (error: Error) => {
              if (!isMountedRef.current || !isSubscriptionActive) return;

              logger.error('Presence error', error, { metadata: { boardId } });
              setError(error);
              setIsConnected(false);
            },
          }
        );

        // Store update function and cleanup
        if (isMountedRef.current && isSubscriptionActive) {
          setUpdatePresenceFunc(() => subscription.updatePresence);
          cleanup = subscription.cleanup;
          setIsConnected(true);

          logger.debug('Presence subscription established', {
            metadata: { boardId },
          });
        }
      } catch (error) {
        if (!isMountedRef.current || !isSubscriptionActive) return;

        const err =
          error instanceof Error
            ? error
            : new Error('Failed to setup presence');
        logger.error('Presence setup failed', err, { metadata: { boardId } });
        setError(err);
        setIsConnected(false);
      }
    };

    setupPresence();

    // Cleanup function
    return () => {
      isSubscriptionActive = false;

      if (cleanup) {
        logger.debug('Cleaning up presence subscription', {
          metadata: { boardId },
        });
        cleanup();
      }

      if (isMountedRef.current) {
        setUpdatePresenceFunc(null);
        setIsConnected(false);
        setPresenceState({});
      }
    };
  }, [boardId]);

  return {
    presenceState,
    error,
    getOnlineUsers,
    updatePresence,
    isConnected,
  };
};
