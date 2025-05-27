// Player-specific statistics
export interface PlayerStats {
  markedFields: number
  completedLines: number
  averageMoveTime: number
  totalMoves: number
  winRate?: number
  preferredPatterns?: string[]
}

// Core game statistics
export interface GameStats {
  moves: number
  duration: number
  winningPlayer: string | null
  startTime: number | null
  endTime: number | null
  playerStats: Record<string, PlayerStats>
  performanceMetrics: GamePerformanceMetrics
}

// Performance metrics
export interface GamePerformanceMetrics {
  pageLoadTime?: number
  timeToInteractive?: number
  averageFrameTime?: number
  lastUpdateTime?: number
  moveLatency?: number
  renderTime?: number
}

// Pattern tracking
export interface GamePatterns {
  commonMoves: string[]
  winningStrategies: string[]
  playerTendencies: Record<string, string[]>
}

// Event tracking
export interface GameEvent {
  type: GameEventType
  playerId?: string
  timestamp: number
  data?: unknown
}

// Event types
export type GameEventType = 
  | 'move'
  | 'win'
  | 'line_complete'
  | 'pattern_detected'
  | 'performance_mark'
  | 'error'

// Analysis results
export interface GameAnalysis {
  averageMoveTime: number
  movePatterns: string[]
  winningStrategies: string[]
  playerTendencies: Record<string, string[]>
  performanceMetrics: GamePerformanceMetrics
}

// Report generation
export interface GameReport {
  gameStats: GameStats
  analysis: GameAnalysis
  recommendations?: string[]
  performanceIssues?: string[]
} 