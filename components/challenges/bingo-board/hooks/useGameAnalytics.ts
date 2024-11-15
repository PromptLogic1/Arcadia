'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Player } from '../types/types'
import type {
  GameStats,
  GamePatterns,
  PlayerStats,
  GameEvent,
  GameAnalysis,
  GameReport
} from '../types/analytics.types'
import { ANALYTICS_CONSTANTS, EVENT_TYPES, PERFORMANCE_METRICS } from '../types/analytics.constants'

export const useGameAnalytics = () => {
  // Core States
  const [gameStats, setGameStats] = useState<GameStats>({
    moves: 0,
    duration: 0,
    winningPlayer: null,
    startTime: null,
    endTime: null,
    playerStats: {},
    performanceMetrics: {}
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
  }, [])

  // 2.1 Statistik-Erfassung
  const updateStats = useCallback((
    players: Player[],
    markedFields: Record<string, number>,
    completedLines: Record<string, number>
  ) => {
    setGameStats(prev => {
      const now = Date.now()
      const lastMoveTime = moveTimestamps.current[moveTimestamps.current.length - 1] || now
      const moveTime = now - lastMoveTime

      // Limit history length
      if (moveTimestamps.current.length >= ANALYTICS_CONSTANTS.PERFORMANCE.MAX_HISTORY_LENGTH) {
        moveTimestamps.current = moveTimestamps.current.slice(
          -ANALYTICS_CONSTANTS.PERFORMANCE.MAX_HISTORY_LENGTH
        )
      }

      // Update player stats
      const updatedPlayerStats = players.reduce((stats, player) => ({
        ...stats,
        [player.id]: {
          markedFields: markedFields[player.id] || 0,
          completedLines: completedLines[player.id] || 0,
          averageMoveTime: moveTime,
          totalMoves: (prev.playerStats[player.id]?.totalMoves || 0) + 1
        }
      }), {} as Record<string, PlayerStats>)

      moveTimestamps.current.push(now)

      // Track move event
      trackEvent({
        type: EVENT_TYPES.MOVE,
        timestamp: now,
        playerId: players[prev.moves % players.length]?.id,
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
  }, [])

  const recordWinner = useCallback((playerId: string | null) => {
    setGameStats(prev => {
      const endTime = Date.now()
      
      // Record winning strategy if pattern is significant
      if (playerId) {
        const playerTendencies = patterns.current.playerTendencies[playerId] || []
        if (playerTendencies.length >= ANALYTICS_CONSTANTS.ANALYSIS.MIN_MOVES_FOR_PATTERN) {
          patterns.current.winningStrategies.push(playerTendencies.join('>'))
        }
      }

      // Track win event
      trackEvent({
        type: EVENT_TYPES.WIN,
        timestamp: endTime,
        playerId: playerId || undefined, // Convert null to undefined
        data: { duration: prev.startTime ? endTime - prev.startTime : 0 }
      })

      return {
        ...prev,
        winningPlayer: playerId,
        endTime,
        duration: prev.startTime ? endTime - prev.startTime : prev.duration
      }
    })
  }, [trackEvent])

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
    const now = performance.now()
    
    setGameStats(prev => ({
      ...prev,
      performanceMetrics: {
        ...prev.performanceMetrics,
        [PERFORMANCE_METRICS.UPDATE_TIME]: now,
        [PERFORMANCE_METRICS.FRAME_TIME]: performanceMarks.current.frameTime 
          ? (now - performanceMarks.current.frameTime) / gameStats.moves 
          : 0
      }
    }))

    performanceMarks.current.frameTime = now
  }, [gameStats.moves])

  // Cleanup and initialization
  useEffect(() => {
    const startTime = Date.now()
    setGameStats(prev => ({
      ...prev,
      startTime,
      performanceMetrics: {
        [PERFORMANCE_METRICS.PAGE_LOAD]: performance.now(),
        [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: Date.now() - startTime
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
    updateStats,
    trackMove,
    recordWinner,
    measurePerformance,
    calculateStats,
    generateReport,
    resetStats: useCallback(() => {
      setGameStats({
        moves: 0,
        duration: 0,
        winningPlayer: null,
        startTime: Date.now(),
        endTime: null,
        playerStats: {},
        performanceMetrics: {}
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
  }
}
