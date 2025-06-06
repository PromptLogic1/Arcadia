import { presenceService as modernPresenceService } from './presence-modern.service';
import { log } from '@/lib/logger';

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

      const result = await modernPresenceService.subscribeToPresence(
        boardId,
        {
          onError: error => {
            log.error('Presence tracking error', error, {
              metadata: { channelName, userId },
            });
          },
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to subscribe to presence');
      }

      // Return cleanup function
      const { cleanup } = result.data;
      return async () => {
        const cleanupResult = await cleanup();
        if (!cleanupResult.success) {
          log.error('Presence cleanup failed', new Error(cleanupResult.error || 'Cleanup failed'), {
            metadata: { channelName, userId },
          });
        }
      };
    } catch (error) {
      log.error(
        'Failed to track presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId },
        }
      );
      // Return no-op cleanup function
      return () => {};
    }
  },

  // Update presence status
  async updatePresence(
    channelName: string,
    userId: string,
    status: 'online' | 'away' | 'offline'
  ): Promise<void> {
    try {
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const mappedStatus =
        status === 'offline'
          ? 'away'
          : (status as 'online' | 'away' | 'busy');

      const result = await modernPresenceService.updatePresence(
        boardId,
        userId,
        mappedStatus
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update presence');
      }
    } catch (error) {
      log.error(
        'Failed to update presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName, userId, status },
        }
      );
    }
  },

  // Get current presence state
  async getPresence(channelName: string): Promise<PresenceData | null> {
    try {
      const boardId = channelName.split(':').pop();
      if (!boardId) {
        throw new Error('Invalid channel name format');
      }

      const result = modernPresenceService.getCurrentPresenceState(boardId);
      
      if (!result.success || !result.data) {
        return null;
      }

      const presenceList: PresenceState[] = Object.entries(result.data).map(
        ([key, value]) => ({
          userId: value.user_id,
          displayName: key,
          status: value.status === 'busy' ? 'away' : value.status,
          lastSeen: new Date(value.last_seen_at).toISOString(),
          metadata: {
            boardId,
          },
        })
      );

      return {
        presence: presenceList,
        onlineCount: presenceList.filter(p => p.status === 'online').length,
      };
    } catch (error) {
      log.error(
        'Failed to get presence',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          metadata: { channelName },
        }
      );
      return null;
    }
  },
};