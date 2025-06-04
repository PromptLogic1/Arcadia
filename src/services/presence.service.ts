import { realtimeManager } from '@/lib/realtime-manager';
// Removed unused User import

export interface PresenceState {
  userId: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  metadata?: {
    currentCell?: number;
    color?: string;
  };
}

// Supabase presence state interface (what comes from the realtime channel)
interface SupabasePresenceRef {
  presence_ref: string;
  userId: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  metadata?: {
    currentCell?: number;
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
    userInfo: UserInfo,
    metadata?: PresenceState['metadata']
  ): Promise<() => void> {
    const presence: PresenceState = {
      userId,
      displayName: userInfo.display_name || 'Anonymous',
      avatar: userInfo.avatar_url || undefined,
      status: 'online',
      lastSeen: new Date().toISOString(),
      metadata,
    };

    // Subscribe to presence channel
    const channel = realtimeManager.getChannel(channelName);
    
    // Track user presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Supabase expects the presence data to be passed directly
        await channel.track({
          userId,
          displayName: presence.displayName,
          avatar: presence.avatar,
          status: presence.status,
          lastSeen: presence.lastSeen,
          metadata: presence.metadata,
        });
      }
    });

    // Return cleanup function
    return () => {
      channel.untrack();
      realtimeManager.removeChannelPublic(channelName);
    };
  },

  // Subscribe to presence updates
  subscribeToPresence(
    channelName: string,
    onPresenceChange: (data: PresenceData) => void
  ): () => void {
    const channel = realtimeManager.getChannel(channelName);

    // Listen for presence updates
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const presence: PresenceState[] = [];

      // Transform presence state
      Object.entries(state).forEach(([_key, presences]) => {
        if (Array.isArray(presences)) {
          presences.forEach((p: unknown) => {
            const presenceRef = p as SupabasePresenceRef;
            if (presenceRef && typeof presenceRef === 'object' && 'userId' in presenceRef) {
              presence.push({
                userId: presenceRef.userId,
                displayName: presenceRef.displayName || 'Anonymous',
                avatar: presenceRef.avatar,
                status: presenceRef.status || 'online',
                lastSeen: presenceRef.lastSeen || new Date().toISOString(),
                metadata: presenceRef.metadata,
              });
            }
          });
        }
      });

      onPresenceChange({
        presence,
        onlineCount: presence.filter(p => p.status === 'online').length,
      });
    });

    // Initial sync
    channel.subscribe();

    // Return cleanup function
    return () => {
      channel.unsubscribe();
      realtimeManager.removeChannelPublic(channelName);
    };
  },

  // Update user presence metadata
  async updatePresenceMetadata(
    channelName: string,
    userId: string,
    metadata: PresenceState['metadata']
  ): Promise<void> {
    const channel = realtimeManager.getChannel(channelName);
    const state = channel.presenceState();

    // Find user's current presence
    let currentPresence: PresenceState | null = null;
    Object.entries(state).forEach(([_key, presences]) => {
      if (Array.isArray(presences)) {
        presences.forEach((p: unknown) => {
          const presenceRef = p as SupabasePresenceRef;
          if (presenceRef && typeof presenceRef === 'object' && 'userId' in presenceRef && presenceRef.userId === userId) {
            currentPresence = {
              userId: presenceRef.userId,
              displayName: presenceRef.displayName || 'Anonymous',
              avatar: presenceRef.avatar,
              status: presenceRef.status || 'online',
              lastSeen: presenceRef.lastSeen || new Date().toISOString(),
              metadata: presenceRef.metadata,
            };
          }
        });
      }
    });

    if (currentPresence) {
      // Update presence with new metadata
      const presenceUpdate = {
        userId: (currentPresence as PresenceState).userId,
        displayName: (currentPresence as PresenceState).displayName,
        avatar: (currentPresence as PresenceState).avatar,
        status: (currentPresence as PresenceState).status,
        lastSeen: new Date().toISOString(),
        metadata: { ...((currentPresence as PresenceState).metadata || {}), ...(metadata || {}) },
      };
      await channel.track(presenceUpdate);
    }
  },

  // Get current presence state
  getPresenceState(channelName: string): PresenceData {
    const channel = realtimeManager.getChannel(channelName);
    const state = channel.presenceState();
    const presence: PresenceState[] = [];

    Object.entries(state).forEach(([_key, presences]) => {
      if (Array.isArray(presences)) {
        presences.forEach((p: unknown) => {
          const presenceRef = p as SupabasePresenceRef;
          if (presenceRef && typeof presenceRef === 'object' && 'userId' in presenceRef) {
            presence.push({
              userId: presenceRef.userId,
              displayName: presenceRef.displayName || 'Anonymous',
              avatar: presenceRef.avatar,
              status: presenceRef.status || 'online',
              lastSeen: presenceRef.lastSeen || new Date().toISOString(),
              metadata: presenceRef.metadata,
            });
          }
        });
      }
    });

    return {
      presence,
      onlineCount: presence.filter(p => p.status === 'online').length,
    };
  },
};