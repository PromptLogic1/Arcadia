import type { BoardCell } from './types'

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

export interface BaseSessionEvent {
  type: SessionEventType
  timestamp: number
  sessionId: string
  version?: number
}

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

export type SessionEvent = 
  | PlayerEvent 
  | CellUpdateEvent 
  | StateEvent 
  | ConnectionEvent 
  | BaseSessionEvent 