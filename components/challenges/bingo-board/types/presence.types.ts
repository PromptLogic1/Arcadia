export interface PresenceState {
  user_id: string
  online_at: number
  last_seen_at: number
  status: 'online' | 'away' | 'offline'
} 