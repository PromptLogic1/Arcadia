import { useState, useCallback } from 'react'
import type { Player } from '../types/types'

interface GameStats {
  moves: number
  duration: number
  winningPlayer: string | null
  playerStats: Record<string, {
    markedFields: number
    completedLines: number
  }>
}

export const useGameAnalytics = () => {
  const [gameStats, setGameStats] = useState<GameStats>({
    moves: 0,
    duration: 0,
    winningPlayer: null,
    playerStats: {}
  })

  const updateStats = useCallback((
    players: Player[],
    markedFields: Record<string, number>,
    completedLines: Record<string, number>
  ) => {
    setGameStats(prev => ({
      ...prev,
      moves: prev.moves + 1,
      playerStats: players.reduce((stats, player) => ({
        ...stats,
        [player.id]: {
          markedFields: markedFields[player.id] || 0,
          completedLines: completedLines[player.id] || 0
        }
      }), {})
    }))
  }, [])

  const setWinner = useCallback((playerId: string | null) => {
    setGameStats(prev => ({
      ...prev,
      winningPlayer: playerId
    }))
  }, [])

  const updateDuration = useCallback((duration: number) => {
    setGameStats(prev => ({
      ...prev,
      duration
    }))
  }, [])

  const resetStats = useCallback(() => {
    setGameStats({
      moves: 0,
      duration: 0,
      winningPlayer: null,
      playerStats: {}
    })
  }, [])

  return {
    gameStats,
    updateStats,
    setWinner,
    updateDuration,
    resetStats
  }
}
