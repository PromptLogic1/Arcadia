/**
 * Presence Hook
 *
 * Manages real-time presence for bingo boards.
 * Handles connection state, presence updates, and online user tracking.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  presenceService,
  type PresenceState,
  PRESENCE_CONSTANTS,
  type ServiceResponse,
} from '../../../services/presence-modern.service';
import { useAuth } from '@/lib/stores/auth-store';
import { log } from '@/lib/logger';

export interface UsePresenceOptions {
  enabled?: boolean;
}

export interface UsePresenceReturn {
  presenceState: Record<string, PresenceState>;
  isConnected: boolean;
  error: Error | null;
  updateActivity: (activity: PresenceState['activity']) => Promise<void>;
  updateStatus: (status: PresenceState['status']) => Promise<void>;
  getOnlineUserCount: () => number;
  isUserOnline: (userId: string) => boolean;
}

// Type helper for the update function
type UpdatePresenceFunc = (status: PresenceState['status']) => Promise<ServiceResponse<void>>;

export function usePresence(
  boardId: string,
  options: UsePresenceOptions = {}
): UsePresenceReturn {
  const { enabled = true } = options;
  const { authUser } = useAuth();
  const isMountedRef = useRef(true);

  const [presenceState, setPresenceState] = useState<
    Record<string, PresenceState>
  >({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [updatePresenceFunc, setUpdatePresenceFunc] = useState<UpdatePresenceFunc | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Setup presence subscription
  useEffect(() => {
    if (!enabled || !boardId || !authUser) {
      return;
    }

    let cleanup: (() => Promise<ServiceResponse<void>>) | null = null;
    let isSubscriptionActive = true;

    const setupPresence = async () => {
      try {
        const subscription = await presenceService.subscribeToPresence(
          boardId,
          {
            onPresenceUpdate: state => {
              if (!isSubscriptionActive || !isMountedRef.current) return;
              setPresenceState(state);
            },
            onUserJoin: (key, presence) => {
              if (!isSubscriptionActive || !isMountedRef.current) return;

              setPresenceState(prev => ({
                ...prev,
                [key]: presence,
              }));

              log.debug('User joined board', {
                metadata: { boardId, userId: presence.user_id },
              });
            },
            onUserLeave: key => {
              if (!isSubscriptionActive || !isMountedRef.current) return;

              setPresenceState(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
              });

              log.debug('User left board', {
                metadata: { boardId, key },
              });
            },
            onError: error => {
              if (!isSubscriptionActive || !isMountedRef.current) return;
              log.error('Presence error', error, { metadata: { boardId } });
              setError(error);
              setIsConnected(false);
            },
          }
        );

        // Check if subscription was successful
        if (!subscription.success || !subscription.data) {
          throw new Error(subscription.error || 'Failed to subscribe to presence');
        }

        // Store update function and cleanup
        if (isMountedRef.current && isSubscriptionActive) {
          setUpdatePresenceFunc(() => subscription.data!.updatePresence);
          cleanup = subscription.data!.cleanup;
          setIsConnected(true);

          log.debug('Presence subscription established', {
            metadata: { boardId },
          });
        }
      } catch (error) {
        if (!isSubscriptionActive) return;

        const err =
          error instanceof Error
            ? error
            : new Error('Failed to setup presence');
        log.error('Presence setup failed', err, { metadata: { boardId } });
        setError(err);
        setIsConnected(false);
      }
    };

    setupPresence();

    // Cleanup function
    return () => {
      isSubscriptionActive = false;

      if (cleanup) {
        log.debug('Cleaning up presence subscription', {
          metadata: { boardId },
        });
        cleanup().then(result => {
          if (!result.success) {
            log.error('Presence cleanup failed', new Error(result.error || 'Cleanup failed'), {
              metadata: { boardId },
            });
          }
        });
      }

      if (isMountedRef.current) {
        setUpdatePresenceFunc(null);
        setIsConnected(false);
        setPresenceState({});
      }
    };
  }, [boardId, enabled, authUser]);

  // Update activity
  const updateActivity = useCallback(
    async (activity: PresenceState['activity']) => {
      if (!isConnected || !authUser) {
        return;
      }

      try {
        const currentPresence = Object.values(presenceState).find(
          p => p.user_id === authUser.id
        );

        if (currentPresence) {
          const result = await presenceService.updatePresence(
            boardId,
            authUser.id,
            currentPresence.status,
            activity
          );

          if (!result.success) {
            throw new Error(result.error || 'Failed to update activity');
          }
        }
      } catch (error) {
        log.error(
          'Failed to update activity',
          error instanceof Error ? error : new Error('Unknown error'),
          { metadata: { boardId, activity } }
        );
      }
    },
    [boardId, authUser, isConnected, presenceState]
  );

  // Update status
  const updateStatus = useCallback(
    async (status: PresenceState['status']) => {
      if (!isConnected || !updatePresenceFunc) {
        return;
      }

      try {
        const result = await updatePresenceFunc(status);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update status');
        }
      } catch (error) {
        log.error(
          'Failed to update presence status',
          error instanceof Error ? error : new Error('Unknown error'),
          { metadata: { boardId, status } }
        );
      }
    },
    [boardId, isConnected, updatePresenceFunc]
  );

  // Get online user count
  const getOnlineUserCount = useCallback(() => {
    return Object.values(presenceState).filter(
      p => p.status === PRESENCE_CONSTANTS.STATUS.ONLINE
    ).length;
  }, [presenceState]);

  // Check if specific user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return Object.values(presenceState).some(
        p => p.user_id === userId && p.status === PRESENCE_CONSTANTS.STATUS.ONLINE
      );
    },
    [presenceState]
  );

  return {
    presenceState,
    isConnected,
    error,
    updateActivity,
    updateStatus,
    getOnlineUserCount,
    isUserOnline,
  };
}