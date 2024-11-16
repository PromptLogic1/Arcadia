import type { GameAnalysis, GameStats } from '@/components/challenges/bingo-board/types/analytics.types'
import type { UseSession } from '@/components/challenges/bingo-board/types/session.types'
import type { BoardCell, Player } from '@/components/challenges/bingo-board/types/types'

// Mock the hooks
jest.mock('@/components/challenges/bingo-board/hooks/useGameAnalytics', () => ({
  useGameAnalytics: jest.fn().mockReturnValue({
    gameStats: {
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: null,
      endTime: null,
      playerStats: {},
      performanceMetrics: {}
    } as GameStats,
    updateStats: jest.fn(),
    trackMove: jest.fn(),
    recordWinner: jest.fn(),
    measurePerformance: jest.fn(),
    calculateStats: jest.fn().mockReturnValue({
      averageMoveTime: 0,
      movePatterns: [],
      winningStrategies: [],
      playerTendencies: {},
      performanceMetrics: {}
    } as GameAnalysis),
    generateReport: jest.fn(),
    resetStats: jest.fn()
  })
}))

jest.mock('@/components/challenges/bingo-board/hooks/useSession', () => ({
  useSession: jest.fn().mockReturnValue({
    // State
    board: [] as BoardCell[],
    loading: false,
    error: null,
    
    // Session state
    stateVersion: 0,
    sessionTime: 0,
    playerCount: 0,
    completionRate: 0,
    
    // Player management
    players: [] as Player[],
    currentPlayer: null,
    onlineUsers: [] as Player[],

    // Methods
    startSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    endSession: jest.fn(),
    updateCell: jest.fn(),
    reconnect: jest.fn(),
    clearError: jest.fn()
  } as UseSession)
})) 