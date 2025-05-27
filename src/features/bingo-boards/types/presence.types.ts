// User Presence Status
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

// User Activity Types
export type ActivityType = 'viewing' | 'editing' | 'playing' | 'idle'

// Presence State Interface
export interface PresenceState {
  user_id: string
  status: PresenceStatus
  activity: ActivityType
  last_seen_at: string
  online_at: string
  metadata?: {
    boardId?: string
    sessionId?: string
    location?: string
    deviceType?: 'desktop' | 'tablet' | 'mobile'
  }
}

// Extended Presence State with Ref for internal use
export interface PresenceStateWithRef extends PresenceState {
  ref?: any
}

// Presence Event Types
export interface PresenceEvent {
  type: 'join' | 'leave' | 'update'
  user_id: string
  presence: PresenceState
  timestamp: number
}

// Presence Subscription Options
export interface PresenceSubscriptionOptions {
  boardId?: string
  sessionId?: string
  includeMetadata?: boolean
  throttleMs?: number
}

// Presence Hook Return Type
export interface UsePresenceReturn {
  presenceState: PresenceState | null
  onlineUsers: PresenceState[]
  isOnline: boolean
  updatePresence: (updates: Partial<PresenceState>) => Promise<void>
  setStatus: (status: PresenceStatus) => Promise<void>
  setActivity: (activity: ActivityType) => Promise<void>
  subscribe: (options?: PresenceSubscriptionOptions) => void
  unsubscribe: () => void
  error: string | null
}

// Presence Manager Interface
export interface PresenceManager {
  currentPresence: PresenceState | null
  allPresences: Record<string, PresenceState>
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  
  // Core methods
  initialize: (userId: string) => Promise<void>
  cleanup: () => Promise<void>
  updateUserPresence: (updates: Partial<PresenceState>) => Promise<void>
  
  // Event handlers
  onPresenceChange: (callback: (event: PresenceEvent) => void) => void
  offPresenceChange: (callback: (event: PresenceEvent) => void) => void
  
  // Utility methods
  getUserPresence: (userId: string) => PresenceState | null
  getOnlineUsers: () => PresenceState[]
  getUserCount: () => number
}

// Presence Configuration
export interface PresenceConfig {
  heartbeatInterval: number
  timeoutThreshold: number
  awayThreshold: number
  reconnectAttempts: number
  reconnectDelay: number
} 