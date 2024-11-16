import type { Player } from './types'
import type { BoardCell } from './types'

export interface SessionEvent {
  id: string
  board_id: string
  type: 'start' | 'pause' | 'resume' | 'end' | 'playerJoin' | 'playerLeave' | 'cellUpdate' | 'stateSync' | 'conflict' | 'reconnect' | 'timeout'
  player_id?: string
  data?: unknown
  timestamp: number
  version?: number
  created_at?: string
  updated_at?: string
}

export interface BaseSessionEvent {
  type: 'start' | 'pause' | 'resume' | 'end' | 'playerJoin' | 'playerLeave' | 'cellUpdate' | 'stateSync' | 'conflict' | 'reconnect' | 'timeout'
  timestamp: number
  playerId?: string
  data?: unknown
  version?: number
}

export interface LocalSessionEvent extends BaseSessionEvent {
  sessionId: string
}

export interface ImportedSessionEvent extends BaseSessionEvent {
  id: string
  board_id: string
  created_at?: string
  updated_at?: string
}

export interface SessionPlayer {
  id: string
  board_id: string
  player_id: string
  joined_at: string
  created_at?: string
  updated_at?: string
}

export interface SessionCell extends BoardCell {
  id: string
  board_id: string
  version: number
  created_at?: string
  updated_at?: string
}

export interface SessionBoard {
  id: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  start_time?: number
  end_time?: number
  version?: number
  created_at?: string
  updated_at?: string
}

export interface UseSession {
  // Core States
  board: BoardCell[] | null
  loading: boolean
  error: Error | null
  
  // Player Management
  players: Player[]
  updateSessionPlayers: (players: Player[]) => Promise<void>
  
  // Session Controls
  startSession: () => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // Game State
  updateCell: (cellId: string, updates: Partial<BoardCell>) => Promise<void>
  
  // Stats & Info
  sessionTime: number
  playerCount: number
  completionRate: number
  
  // Presence
  onlineUsers: Player[]
  stateVersion: number
  reconnect: () => void
  clearError: () => void
} 