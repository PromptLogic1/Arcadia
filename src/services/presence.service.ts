import { presenceService as modernPresenceService } from './presence-modern.service';
import { logger } from '@/lib/logger';

export interface PresenceState {
  userId: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  metadata?: {
    sessionId?: string;
    boardId?: string;
    role?: string;
    isHost?: boolean;
    currentCell?: string;
    color?: string;
  };
}

export interface PresenceData {
  presence: PresenceState[];
  onlineCount: number;
}

interface UserInfo {
  display_name?: string;
  avatar_url?: string | null;
}

export const presenceService = {
  // Track presence for a session
  async trackPresence(
    channelName: string,
    userId: string,
    _userInfo: UserInfo,
    _metadata?: PresenceState['metadata']
  ): Promise<() => void> {
    try {
      // Extract board ID from channel name (format: "presence:bingo:{boardId}")
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const { cleanup } = await modernPresenceService.subscribeToPresence(
        boardId,
        {
          onError: error => {
            logger.error('Presence tracking error', error, {
              metadata: { channelName, userId },
            });
          },
        }
      );

      return cleanup;
    } catch (error) {
      logger.error(
        'Failed to track presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId },
        }
      );
      return () => {}; // Return no-op cleanup function on error
    }
  },

  // Subscribe to presence updates
  subscribeToPresence(
    channelName: string,
    onPresenceChange: (data: PresenceData) => void
  ): () => void {
    try {
      // Extract board ID from channel name
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      // Subscribe using modern presence service
      modernPresenceService
        .subscribeToPresence(boardId, {
          onPresenceUpdate: presenceState => {
            // Convert modern presence state to legacy format
            const presence: PresenceState[] = Object.entries(presenceState).map(
              ([key, state]) => ({
                userId: state.user_id,
                displayName: key.split('-')[0] || 'Anonymous',
                avatar: undefined,
                status: state.status as 'online' | 'away' | 'offline',
                lastSeen: new Date(state.last_seen_at).toISOString(),
                metadata: {
                  sessionId: boardId,
                  boardId: boardId,
                  role: 'player',
                  isHost: false,
                  currentCell: undefined,
                  color: undefined,
                },
              })
            );

            onPresenceChange({
              presence,
              onlineCount: presence.filter(p => p.status === 'online').length,
            });
          },
          onError: error => {
            logger.error('Presence subscription error', error, {
              metadata: { channelName },
            });
          },
        })
        .then(({ cleanup }) => cleanup)
        .catch(error => {
          logger.error(
            'Failed to subscribe to presence',
            error instanceof Error ? error : new Error('Unknown error'),
            {
              metadata: { channelName },
            }
          );
        });

      // Return cleanup function
      return () => {
        const boardId = channelName.split(':').pop();
        if (boardId) {
          modernPresenceService.cleanup(boardId).catch(error => {
            logger.error(
              'Presence cleanup error',
              error instanceof Error ? error : new Error('Unknown error'),
              {
                metadata: { channelName },
              }
            );
          });
        }
      };
    } catch (error) {
      logger.error(
        'Failed to subscribe to presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName },
        }
      );
      return () => {}; // Return no-op cleanup function on error
    }
  },

  // Update user status
  async updatePresence(
    channelName: string,
    userId: string,
    updates: Partial<Pick<PresenceState, 'status' | 'metadata'>>
  ): Promise<void> {
    try {
      // Extract board ID from channel name
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      // Map legacy status to modern status
      let modernStatus: 'online' | 'away' | 'busy' = 'online';
      if (updates.status === 'offline') {
        modernStatus = 'away';
      } else if (updates.status === 'away') {
        modernStatus = 'away';
      } else if (updates.status === 'online') {
        modernStatus = 'online';
      }

      // Call the modern service update method
      await modernPresenceService.updatePresence(
        boardId,
        userId,
        modernStatus,
        updates.metadata?.currentCell ? 'playing' : 'viewing'
      );

      logger.debug('Presence updated successfully', {
        metadata: { channelName, userId, updates },
      });
    } catch (error) {
      logger.error(
        'Failed to update presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId, updates },
        }
      );
      throw error;
    }
  },

  // Get current presence state (non-realtime)
  async getPresenceSnapshot(channelName: string): Promise<PresenceData> {
    try {
      // Extract board ID from channel name
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const currentState =
        modernPresenceService.getCurrentPresenceState(boardId);
      if (!currentState) {
        return {
          presence: [],
          onlineCount: 0,
        };
      }

      // Convert modern presence state to legacy format
      const presence: PresenceState[] = Object.entries(currentState).map(
        ([key, state]) => ({
          userId: state.user_id,
          displayName: key.split('-')[0] || 'Anonymous',
          avatar: undefined,
          status: state.status as 'online' | 'away' | 'offline',
          lastSeen: new Date(state.last_seen_at).toISOString(),
          metadata: {
            sessionId: boardId,
            boardId: boardId,
            role: 'player',
            isHost: false,
            currentCell: undefined,
            color: undefined,
          },
        })
      );

      return {
        presence,
        onlineCount: presence.filter(p => p.status === 'online').length,
      };
    } catch (error) {
      logger.error(
        'Failed to get presence snapshot',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName },
        }
      );
      return {
        presence: [],
        onlineCount: 0,
      };
    }
  },

  // Update presence metadata
  async updatePresenceMetadata(
    channelName: string,
    userId: string,
    metadata: PresenceState['metadata']
  ): Promise<void> {
    try {
      // Extract board ID from channel name
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      // Update presence with activity based on metadata
      const activity: 'viewing' | 'playing' | 'editing' = metadata?.currentCell
        ? 'playing'
        : 'viewing';

      await modernPresenceService.updatePresence(
        boardId,
        userId,
        'online',
        activity
      );

      logger.debug('Presence metadata updated', {
        metadata: { channelName, userId, metadata },
      });
    } catch (error) {
      logger.error(
        'Failed to update presence metadata',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId, metadata },
        }
      );
      throw error;
    }
  },
};
