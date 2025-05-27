'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BingoSessionPlayer } from '@/types'

// Type alias for compatibility
type Player = BingoSessionPlayer
import type {
  GameStats,
  GamePatterns,
  PlayerStats,
  GameEvent,
  GameAnalysis,
  GameReport
} from '../types/analytics.types'
import { ANALYTICS_CONSTANTS, EVENT_TYPES, PERFORMANCE_METRICS } from '../types/analytics.constants'

const DEFAULT_PERFORMANCE_METRICS = {
  [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
  [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0,
  [PERFORMANCE_METRICS.FRAME_TIME]: 0,
  [PERFORMANCE_METRICS.UPDATE_TIME]: 0
}

interface UseGameAnalyticsReturn {
  gameStats: GameStats
  _gameStats: GameStats
  updateStats: (players: Player[], markedFields: Record<string, number>, completedLines: Record<string, number>) => void
  trackMove: (playerId: string, moveType: string, position: number) => void
  recordWinner: (playerId: string | null) => void
  measurePerformance: () => void
  calculateStats: () => GameAnalysis
  generateReport: () => GameReport
  resetStats: () => void
}

export const useGameAnalytics = (): UseGameAnalyticsReturn => {
  // Core States
  const [gameStats, setGameStats] = useState<GameStats>({
    moves: 0,
    duration: 0,
    winningPlayer: null,
    startTime: Date.now(),
    endTime: null,
    playerStats: {},
    performanceMetrics: { ...DEFAULT_PERFORMANCE_METRICS }
  })

  // Performance tracking refs
  const moveTimestamps = useRef<Array<number>>([])
  const performanceMarks = useRef<Record<string, number>>({})
  const eventQueue = useRef<GameEvent[]>([])
  const patterns = useRef<GamePatterns>({
    commonMoves: [],
    winningStrategies: [],
    playerTendencies: {}
  })

  // Event tracking
  const trackEvent = useCallback((event: GameEvent) => {
    if (eventQueue.current.length >= ANALYTICS_CONSTANTS.EVENTS.MAX_QUEUE_SIZE) {
      eventQueue.current = eventQueue.current.slice(-ANALYTICS_CONSTANTS.EVENTS.BATCH_SIZE)
    }
    eventQueue.current.push(event)

    // Emit event
    const customEvent = new CustomEvent(event.type, {
      detail: {
        ...event,
        timestamp: Date.now()
      }
    })
    window.dispatchEvent(customEvent)
  }, [])

  // Stats update
  const updateStats = useCallback((
    players: Player[],
    markedFields: Record<string, number>,
    completedLines: Record<string, number>
  ) => {
    setGameStats(prev => {
      const now = Date.now()
      const lastMoveTime = moveTimestamps.current[moveTimestamps.current.length - 1] || now
      const moveTime = now - lastMoveTime

      const updatedPlayerStats = players.reduce((stats, player) => ({
        ...stats,
        [player.user_id]: {
          playerId: player.user_id,
          playerName: player.player_name,
          joinTime: new Date(player.joined_at || player.created_at || Date.now()).getTime(),
          totalMoves: (prev.playerStats[player.user_id]?.totalMoves || 0) + 1,
          linesCompleted: completedLines[player.user_id] || 0,
          averageTimePerMove: moveTime,
          isWinner: false
        } as PlayerStats
      }), {} as Record<string, PlayerStats>)

      moveTimestamps.current.push(now)

      trackEvent({
        id: crypto.randomUUID(),
        type: EVENT_TYPES.MOVE,
        timestamp: now,
        sessionId: players[prev.moves % players.length]?.session_id || 'unknown',
        playerId: players[prev.moves % players.length]?.user_id,
        data: { moveTime }
      })

      return {
        ...prev,
        moves: prev.moves + 1,
        playerStats: updatedPlayerStats,
        duration: prev.startTime ? now - prev.startTime : 0
      }
    })
  }, [trackEvent])

  const trackMove = useCallback((
    playerId: string,
    moveType: string,
    position: number
  ) => {
    // Initialize tendencies array if it doesn't exist
    if (!patterns.current.playerTendencies[playerId]) {
      patterns.current.playerTendencies[playerId] = []
    }

    const playerTendencies = patterns.current.playerTendencies[playerId]
    if (playerTendencies.length >= ANALYTICS_CONSTANTS.PATTERNS.MAX_PATTERN_LENGTH) {
      patterns.current.playerTendencies[playerId] = playerTendencies.slice(
        -ANALYTICS_CONSTANTS.PATTERNS.MAX_PATTERN_LENGTH
      )
    }

    // Track move patterns
    patterns.current.playerTendencies[playerId] = [
      ...patterns.current.playerTendencies[playerId],
      `${moveType}:${position}`
    ]

    // Update common moves if pattern is significant
    const movePattern = `${moveType}:${position}`
    if (patterns.current.commonMoves.length < ANALYTICS_CONSTANTS.PATTERNS.MAX_PATTERN_LENGTH &&
        !patterns.current.commonMoves.includes(movePattern)) {
      patterns.current.commonMoves.push(movePattern)
    }

    trackEvent({
      id: crypto.randomUUID(),
      type: EVENT_TYPES.MOVE,
      timestamp: Date.now(),
      sessionId: 'current-session', // TODO: Get actual session ID
      playerId,
      data: { moveType, position }
    })
  }, [trackEvent])

  const recordWinner = useCallback((playerId: string | null) => {
    const now = Date.now()
    setGameStats(prev => ({
      ...prev,
      winningPlayer: playerId,
      endTime: now
    }))

    if (playerId !== null) {
      trackEvent({
        id: crypto.randomUUID(),
        type: EVENT_TYPES.WIN,
        timestamp: now,
        sessionId: 'current-session', // TODO: Get actual session ID
        playerId,
        data: { duration: now - (gameStats.startTime || now) }
      })
    }
  }, [gameStats.startTime, trackEvent])

  // 2.2 Analyse
  const calculateStats = useCallback((): GameAnalysis => {
    const stats: GameAnalysis = {
      averageMoveTime: 0,
      movePatterns: patterns.current.commonMoves,
      winningStrategies: patterns.current.winningStrategies,
      playerTendencies: patterns.current.playerTendencies,
      performanceMetrics: gameStats.performanceMetrics
    }

    if (moveTimestamps.current.length > 1) {
      const timestamps = [...moveTimestamps.current]
      const moveTimes = timestamps.slice(1).map((time, i) => {
        const currentTime = timestamps[i]
        const nextTime = timestamps[i + 1]
        
        // Add null checks and provide default values
        if (!nextTime || !currentTime) {
          return 0
        }
        
        return nextTime - currentTime
      }).filter(time => time > 0)
      
      stats.averageMoveTime = moveTimes.length > 0 
        ? moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length 
        : 0
    }

    return stats
  }, [gameStats.performanceMetrics])

  const generateReport = useCallback((): GameReport => {
    const analysis = calculateStats()
    return {
      gameStats,
      analysis,
      recommendations: [],
      performanceIssues: analysis.averageMoveTime > ANALYTICS_CONSTANTS.PERFORMANCE.MAX_MOVE_LATENCY 
        ? ['High move latency detected'] 
        : []
    }
  }, [gameStats, calculateStats])

  // Performance monitoring
  const measurePerformance = useCallback(() => {
    const now = Date.now()
    const frameTime = performanceMarks.current.frameTime 
      ? (now - performanceMarks.current.frameTime) / Math.max(1, gameStats.moves)
      : 0
    
    setGameStats(prev => ({
      ...prev,
      performanceMetrics: {
        ...prev.performanceMetrics,
        [PERFORMANCE_METRICS.UPDATE_TIME]: now,
        [PERFORMANCE_METRICS.FRAME_TIME]: frameTime
      }
    }))

    performanceMarks.current.frameTime = now
  }, [gameStats.moves])

  // Reset functionality
  const resetStats = useCallback(() => {
    setGameStats({
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: Date.now(),
      endTime: null,
      playerStats: {},
      performanceMetrics: { ...DEFAULT_PERFORMANCE_METRICS }
    })
    moveTimestamps.current = []
    performanceMarks.current = {}
    eventQueue.current = []
    patterns.current = {
      commonMoves: [],
      winningStrategies: [],
      playerTendencies: {}
    }
  }, [])

  // Cleanup and initialization
  useEffect(() => {
    const startTime = Date.now()
    setGameStats(prev => ({
      ...prev,
      startTime,
      performanceMetrics: {
        ...DEFAULT_PERFORMANCE_METRICS,
        [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
        [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0
      }
    }))

    // Periodic performance checks
    const performanceInterval = setInterval(() => {
      if (gameStats.moves > 0) {
        measurePerformance()
      }
    }, ANALYTICS_CONSTANTS.PERFORMANCE.PERFORMANCE_CHECK_INTERVAL)

    return () => {
      clearInterval(performanceInterval)
      moveTimestamps.current = []
      performanceMarks.current = {}
      eventQueue.current = []
      patterns.current = {
        commonMoves: [],
        winningStrategies: [],
        playerTendencies: {}
      }
    }
  }, [gameStats.moves, measurePerformance])

  return {
    gameStats,
    _gameStats: gameStats,
    updateStats,
    trackMove,
    recordWinner,
    measurePerformance,
    calculateStats,
    generateReport,
    resetStats
  }
}
