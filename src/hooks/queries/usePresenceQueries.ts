import { useEffect, useState, useCallback } from 'react';
import {
  presenceService,
  type PresenceData,
  type PresenceState,
} from '@/src/services/presence.service';
import { useCurrentUserQuery } from './useAuthQueries';

// Hook for tracking and subscribing to presence
export const usePresence = (sessionId: string) => {
  const { data } = useCurrentUserQuery();
  const user = data?.user;
  const [presenceData, setPresenceData] = useState<PresenceData>({
    presence: [],
    onlineCount: 0,
  });
  const [isTracking, setIsTracking] = useState(false);

  const channelName = `presence:session:${sessionId}`;

  // Track user presence
  useEffect(() => {
    if (!user || !sessionId || isTracking) return;

    let cleanup: (() => void) | null = null;

    const startTracking = async () => {
      setIsTracking(true);
      cleanup = await presenceService.trackPresence(channelName, user.id, {
        display_name: user.username || 'Anonymous',
        avatar_url: user.avatar_url,
      });
    };

    startTracking();

    return () => {
      if (cleanup) {
        cleanup();
      }
      setIsTracking(false);
    };
  }, [user, sessionId, channelName, isTracking]);

  // Subscribe to presence updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = presenceService.subscribeToPresence(
      channelName,
      (data: PresenceData) => {
        setPresenceData(data);
      }
    );

    return unsubscribe;
  }, [sessionId, channelName]);

  // Update presence metadata
  const updateMetadata = useCallback(
    async (metadata: PresenceState['metadata']) => {
      if (!user) return;

      await presenceService.updatePresenceMetadata(
        channelName,
        user.id,
        metadata
      );
    },
    [channelName, user]
  );

  // Get specific user's presence
  const getUserPresence = useCallback(
    (userId: string): PresenceState | undefined => {
      return presenceData.presence.find(
        (p: PresenceState) => p.userId === userId
      );
    },
    [presenceData.presence]
  );

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      const presence = getUserPresence(userId);
      return presence?.status === 'online' || false;
    },
    [getUserPresence]
  );

  return {
    presence: presenceData.presence,
    onlineCount: presenceData.onlineCount,
    updateMetadata,
    getUserPresence,
    isUserOnline,
    isTracking,
  };
};

// Hook for cursor/hover tracking in collaborative environments
export const usePresenceCursor = (sessionId: string) => {
  const { updateMetadata } = usePresence(sessionId);
  const [cursors, setCursors] = useState<
    Map<string, { x: number; y: number; color: string }>
  >(new Map());

  // Update cursor position
  const updateCursorPosition = useCallback(
    (x: number, y: number) => {
      updateMetadata({
        currentCell: Math.floor(y * 5 + x).toString(), // Assuming 5x5 grid
      });
    },
    [updateMetadata]
  );

  // Subscribe to cursor updates from other users
  useEffect(() => {
    if (!sessionId) return;

    const channelName = `presence:session:${sessionId}`;
    const unsubscribe = presenceService.subscribeToPresence(
      channelName,
      (data: PresenceData) => {
        const newCursors = new Map<
          string,
          { x: number; y: number; color: string }
        >();

        data.presence.forEach((p: PresenceState) => {
          if (p.metadata?.currentCell !== undefined && p.metadata?.color) {
            const cell = parseInt(p.metadata.currentCell, 10);
            const x = cell % 5;
            const y = Math.floor(cell / 5);
            newCursors.set(p.userId, { x, y, color: p.metadata.color });
          }
        });

        setCursors(newCursors);
      }
    );

    return unsubscribe;
  }, [sessionId]);

  return {
    cursors,
    updateCursorPosition,
  };
};
