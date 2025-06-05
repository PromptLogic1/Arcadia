'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { PresenceState } from '../types/presence.types';
import { PRESENCE_CONSTANTS } from '../types/presence.constants';
import type { RealtimePresenceState } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface PresenceStateWithRef extends PresenceState {
  presence_ref: string;
}

// Helper function to convert presence state
const convertPresence = (presence: PresenceStateWithRef): PresenceState => ({
  user_id: presence.user_id,
  online_at: presence.online_at,
  last_seen_at: presence.last_seen_at,
  status: presence.status,
  activity: 'viewing', // Default activity when online
});

export const usePresence = (boardId: string, userId?: string) => {
  const [presenceState, setPresenceState] = useState<
    Record<string, PresenceState>
  >({});
  const [error, setError] = useState<Error | null>(null);
  
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const boardIdRef = useRef(boardId);
  const userIdRef = useRef(userId);
  
  // Update refs when props change
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);
  
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const updatePresence = useCallback(
    async (status: PresenceState['status']) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !channelRef.current) return;

        await channelRef.current.track({
          user_id: user.id,
          online_at: Date.now(),
          last_seen_at: Date.now(),
          status,
        });
      } catch (err) {
        logger.error('Error updating presence', err as Error, {
          metadata: { 
            hook: 'usePresence', 
            boardId: boardIdRef.current, 
            userId: userIdRef.current 
          },
        });
      }
    },
    [supabase] // Only depend on stable supabase client
  );

  const handleVisibilityChange = useCallback(() => {
    const status = document.hidden
      ? PRESENCE_CONSTANTS.STATUS.AWAY
      : PRESENCE_CONSTANTS.STATUS.ONLINE;
    void updatePresence(status);
  }, [updatePresence]);

  const setupPresence = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Clean up existing channel if any
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Clean up existing heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      const channel = supabase.channel(`presence:bingo:${boardIdRef.current}`);
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceStateWithRef>();
          const typedState = Object.entries(
            state as RealtimePresenceState<PresenceStateWithRef>
          ).reduce(
            (acc, [key, value]) => {
              if (Array.isArray(value) && value[0]) {
                acc[key] = convertPresence(value[0]);
              }
              return acc;
            },
            {} as Record<string, PresenceState>
          );
          setPresenceState(typedState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences?.[0]) {
            const presence = newPresences[0] as PresenceStateWithRef;
            setPresenceState(prev => ({
              ...prev,
              [key]: convertPresence(presence),
            }));
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setPresenceState(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
          });
        });

      await channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await updatePresence(PRESENCE_CONSTANTS.STATUS.ONLINE);
        }
      });

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Store interval ref to avoid stale closure
      heartbeatIntervalRef.current = setInterval(() => {
        // Use the current updatePresence function from closure
        updatePresence(
          document.hidden
            ? PRESENCE_CONSTANTS.STATUS.AWAY
            : PRESENCE_CONSTANTS.STATUS.ONLINE
        );
      }, PRESENCE_CONSTANTS.TIMING.HEARTBEAT_INTERVAL);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to track presence')
      );
      return undefined;
    }
  }, [supabase, updatePresence, handleVisibilityChange]); // Remove boardId dependency

  useEffect(() => {
    const cleanup = setupPresence();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [setupPresence]);

  return {
    presenceState,
    error,
    getOnlineUsers: useCallback(
      () =>
        Object.values(presenceState).filter(
          p => p.status === PRESENCE_CONSTANTS.STATUS.ONLINE
        ),
      [presenceState]
    ),
  };
};
