import type { Player } from './types'
import type { BoardCell } from './types'
import type { Game } from './types'

export interface UseSessionProps {
  boardId: string
  _game: Game
  initialPlayers?: Player[]
  onSessionEnd?: () => void
}

// Base event type
export interface BaseSessionEvent {
  type: SessionEventType
  timestamp: number
  playerId?: string
  data?: unknown
  version?: number
  sessionId: string // Add sessionId to base event
}

// Event type union
export type SessionEventType = 
  | 'start' 
  | 'pause' 
  | 'resume' 
  | 'end' 
  | 'playerJoin' 
  | 'playerLeave' 
  | 'cellUpdate' 
  | 'stateSync' 
  | 'conflict' 
  | 'reconnect' 
  | 'timeout'

// Specific event types
export interface PlayerEvent extends BaseSessionEvent {
  type: 'playerJoin' | 'playerLeave'
  playerId: string
  playerData: {
    name: string
    color: string
    team?: number
  }
}

export interface CellUpdateEvent extends BaseSessionEvent {
  type: 'cellUpdate'
  cellId: string
  playerId: string
  updates: Partial<BoardCell>
  previousState?: Partial<BoardCell>
}

export interface StateEvent extends BaseSessionEvent {
  type: 'stateSync' | 'conflict'
  state: BoardCell[]
  source: 'server' | 'client'
  conflictResolution?: {
    winner: 'server' | 'client'
    reason: string
  }
}

export interface ConnectionEvent extends BaseSessionEvent {
  type: 'reconnect' | 'timeout'
  attempt?: number
  success?: boolean
  error?: string
}

export interface SessionEvent {
  id: string
  board_id: string
  type: SessionEventType
  player_id?: string
  data?: unknown
  timestamp: number
  version?: number
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

export interface UseSessionReturn {
  // Session States
  isActive: boolean
  isPaused: boolean
  isFinished: boolean
  
  // Player Management
  players: Player[]
  currentPlayer: Player | null
  
  // Session Controls
  startSession: () => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // Game State
  board: BoardCell[]
  updateCell: (cellId: string, updates: Partial<BoardCell>) => Promise<void>
  
  // Stats & Info
  sessionTime: number
  playerCount: number
  completionRate: number
  
  // Presence
  onlineUsers: Player[]
  stateVersion: number
  reconnect: () => Promise<void>
  error: Error | null
  clearError: () => void
} 