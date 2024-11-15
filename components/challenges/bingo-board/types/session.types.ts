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