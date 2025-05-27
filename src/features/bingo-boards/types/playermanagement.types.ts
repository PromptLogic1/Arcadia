export interface Player {
  id: string
  user_id: string
  session_id: string
  player_name: string
  color: string
  team?: number | null
  joined_at: string | null
  is_host: boolean
  is_online: boolean
  last_seen?: Date
}

export interface PlayerEvent {
  type: 'joined' | 'left' | 'marked_cell' | 'completed_line' | 'won' | 'disconnected'
  player_id: string
  timestamp: Date
  data?: Record<string, unknown>
}

export interface PlayerStats {
  cells_marked: number
  lines_completed: number
  total_play_time: number
  win_rate: number
  games_played: number
  games_won: number
}

export interface TeamAssignment {
  team_id: number
  team_name: string
  team_color: string
  members: Player[]
  max_size: number
}

export interface PlayerManagementState {
  players: Player[]
  teams: TeamAssignment[]
  queue: Player[]
  maxPlayers: number
  allowSpectators: boolean
  enableTeams: boolean
}

export interface PlayerAction {
  type: 'join' | 'leave' | 'kick' | 'promote' | 'assign_team' | 'change_color'
  player_id: string
  data?: Record<string, unknown>
}

export interface PlayerPermissions {
  can_mark_cells: boolean
  can_chat: boolean
  can_invite: boolean
  can_kick: boolean
  can_change_settings: boolean
  is_moderator: boolean
}

export interface PlayerSession {
  session_id: string
  player: Player
  permissions: PlayerPermissions
  stats: PlayerStats
  connection_status: 'connected' | 'disconnected' | 'reconnecting'
} 