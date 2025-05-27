import type { BingoSessionPlayer } from '@/types'

// Type aliases for compatibility
type Player = BingoSessionPlayer

// Analytics Event Types
export interface AnalyticsEvent {
  id: string
  type: EventType
  timestamp: number
  sessionId: string
  playerId?: string
  data: Record<string, any>
}

export type EventType = 
  | 'game_started' 
  | 'game_ended'
  | 'move_made'
  | 'line_completed'
  | 'player_joined'
  | 'player_left'
  | 'board_generated'
  | 'error_occurred'

// Missing types that useGameAnalytics expects
export interface GameStats {
  moves: number
  duration: number
  winningPlayer: string | null
  startTime: number
  endTime: number | null
  playerStats: Record<string, PlayerStats>
  performanceMetrics: Record<string, number>
}

export interface GamePatterns {
  commonMoves: string[]
  winningStrategies: string[]
  playerTendencies: Record<string, string[]>
}

export interface GameAnalysis {
  averageMoveTime: number
  movePatterns: string[]
  winningStrategies: string[]
  playerTendencies: Record<string, string[]>
  performanceMetrics: Record<string, number>
}

export interface GameReport {
  gameStats: GameStats
  analysis: GameAnalysis
  recommendations: string[]
  performanceIssues: string[]
}

// Aliases for compatibility
export type GameEvent = AnalyticsEvent

// Performance Metrics
export interface PerformanceData {
  renderTime: number
  updateTime: number
  memoryUsage: number
  fps: number
  timestamp: number
}

// Game Statistics
export interface GameAnalytics {
  sessionId: string
  startTime: number
  endTime?: number
  duration?: number
  totalMoves: number
  uniquePlayers: number
  completedLines: number
  winner?: string | null
  gamePhase: string
  playerStats: PlayerStats[]
  performance: PerformanceData[]
  events: AnalyticsEvent[]
}

// Player Statistics
export interface PlayerStats {
  playerId: string
  playerName: string
  joinTime: number
  leaveTime?: number
  totalMoves: number
  linesCompleted: number
  averageTimePerMove: number
  isWinner: boolean
}

// Move Analytics
export interface MoveAnalytics {
  playerId: string
  position: number
  timestamp: number
  timeFromPrevious: number
  cellContent: string
  resulted_in_line: boolean
}

// Session Analytics Summary
export interface SessionAnalytics {
  sessionId: string
  boardId: string
  totalDuration: number
  playerCount: number
  moveCount: number
  completionRate: number
  averageTimePerMove: number
  mostActivePlayer: string
  quickestCompletion?: number
  performanceScore: number
}

// Real-time Analytics State
export interface AnalyticsState {
  currentSession: GameAnalytics | null
  isTracking: boolean
  events: AnalyticsEvent[]
  performance: PerformanceData[]
  sessionHistory: SessionAnalytics[]
  error: string | null
} 