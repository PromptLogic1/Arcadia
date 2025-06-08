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
} from '../../../services/presence.service';

// Add missing constants for backward compatibility
const STATUS = {
  ONLINE: 'online' as const,
  AWAY: 'away' as const,
  OFFLINE: 'offline' as const,
};
import type { ServiceResponse } from '@/lib/service-types';
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
type UpdatePresenceFunc = (
  status: PresenceState['status']
) => Promise<ServiceResponse<void>>;

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
  const [updatePresenceFunc, setUpdatePresenceFunc] =
    useState<UpdatePresenceFunc | null>(null);

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
    let hasCleanedUp = false;

    const setupPresence = async () => {
      // Skip if already cleaned up (React Strict Mode protection)
      if (hasCleanedUp) {
        return;
      }

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
              log.debug('Presence error', {
                metadata: {
                  boardId,
                  error: error instanceof Error ? error.message : String(error),
                },
              });
              setError(error);
              setIsConnected(false);
            },
          }
        );

        // Store update function and cleanup
        if (isMountedRef.current && isSubscriptionActive && subscription) {
          const { updatePresence, cleanup: cleanupFunc } = subscription;
          setUpdatePresenceFunc(() => updatePresence);
          cleanup = cleanupFunc;
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
        log.debug('Presence setup failed', {
          metadata: {
            boardId,
            error: err.message,
          },
        });
        setError(err);
        setIsConnected(false);
      }
    };

    setupPresence();

    // Cleanup function
    return () => {
      isSubscriptionActive = false;
      hasCleanedUp = true;

      // Prevent duplicate cleanup in React Strict Mode
      const cleanupOnce = cleanup;
      cleanup = null;

      if (cleanupOnce) {
        log.debug('Cleaning up presence subscription', {
          metadata: { boardId },
        });
        cleanupOnce().then(result => {
          if (!result.success) {
            log.debug('Presence cleanup failed', {
              metadata: {
                boardId,
                error: result.error || 'Cleanup failed',
              },
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
          p => (p.userId || p.user_id) === authUser.id
        );

        if (currentPresence) {
          const channelName = `presence:bingo:${boardId}`;
          const result = await presenceService.updatePresence(
            channelName,
            authUser.id,
            currentPresence.status,
            activity
          );

          if (!result.success) {
            throw new Error(result.error || 'Failed to update activity');
          }
        }
      } catch (error) {
        log.debug('Failed to update activity', {
          metadata: {
            boardId,
            activity,
            error: error instanceof Error ? error.message : String(error),
          },
        });
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
        log.debug('Failed to update presence status', {
          metadata: {
            boardId,
            status,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    },
    [boardId, isConnected, updatePresenceFunc]
  );

  // Get online user count
  const getOnlineUserCount = useCallback(() => {
    return Object.values(presenceState).filter(p => p.status === STATUS.ONLINE)
      .length;
  }, [presenceState]);

  // Check if specific user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return Object.values(presenceState).some(
        p => (p.userId || p.user_id) === userId && p.status === STATUS.ONLINE
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
