import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useGameAnalytics } from '@/components/challenges/bingo-board/hooks/useGameAnalytics'
import type { Player } from '@/components/challenges/bingo-board/types/types'

describe('useGameAnalytics', () => {
  const mockPlayers: Player[] = [
    { 
      id: 'player1', 
      name: 'Player 1',
      team: 1,
      color: '#FF0000',
      hoverColor: '#FF3333'
    },
    { 
      id: 'player2', 
      name: 'Player 2',
      team: 2,
      color: '#00FF00',
      hoverColor: '#33FF33'
    }
  ]

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useGameAnalytics())
      
      expect(result.current.gameStats).toBeDefined()
      expect(result.current.gameStats.moves).toBe(0)
      expect(result.current.gameStats.winningPlayer).toBeNull()
      expect(result.current.gameStats.startTime).toBeNull()
      expect(result.current.gameStats.playerStats).toEqual({})
    })
  })

  describe('Game Statistics', () => {
    it('should update stats correctly', () => {
      const { result } = renderHook(() => useGameAnalytics())

      act(() => {
        result.current.updateStats(
          mockPlayers,
          { player1: 3, player2: 2 },
          { player1: 1, player2: 0 }
        )
      })

      expect(result.current.gameStats.moves).toBe(1)
      
      const player1Stats = result.current.gameStats.playerStats['player1']
      expect(player1Stats).toBeDefined()
      if (player1Stats) {
        expect(player1Stats.markedFields).toBe(3)
        expect(player1Stats.completedLines).toBe(1)
      }
    })

    it('should track multiple moves correctly', () => {
      const { result } = renderHook(() => useGameAnalytics())

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.updateStats(
            mockPlayers,
            { player1: i + 1, player2: i },
            { player1: 0, player2: 0 }
          )
        })
      }

      expect(result.current.gameStats.moves).toBe(3)
    })
  })

  describe('Game Events', () => {
    it('should record winner correctly', () => {
      const { result } = renderHook(() => useGameAnalytics())

      act(() => {
        result.current.recordWinner('player1')
      })

      expect(result.current.gameStats.winningPlayer).toBe('player1')
      expect(result.current.gameStats.endTime).toBeDefined()
    })

    it('should track move patterns', () => {
      const { result } = renderHook(() => useGameAnalytics())

      act(() => {
        result.current.trackMove('player1', 'diagonal', 4)
        result.current.trackMove('player2', 'vertical', 2)
      })

      const report = result.current.generateReport()
      expect(report.analysis.movePatterns).toBeDefined()
    })
  })

  describe('Analytics Reports', () => {
    it('should generate complete game report', () => {
      const { result } = renderHook(() => useGameAnalytics())

      act(() => {
        result.current.updateStats(mockPlayers, { player1: 1 }, { player1: 0 })
        result.current.trackMove('player1', 'horizontal', 0)
        result.current.recordWinner('player1')
      })

      const report = result.current.generateReport()
      expect(report.gameStats).toBeDefined()
      expect(report.analysis).toBeDefined()
      expect(report.recommendations).toBeDefined()
    })

    it('should calculate correct statistics', () => {
      const { result } = renderHook(() => useGameAnalytics())

      act(() => {
        result.current.updateStats(mockPlayers, { player1: 1 }, { player1: 0 })
      })

      const stats = result.current.calculateStats()
      expect(stats.averageMoveTime).toBeDefined()
      expect(stats.movePatterns).toBeDefined()
      expect(stats.performanceMetrics).toBeDefined()
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all stats correctly', () => {
      const { result } = renderHook(() => useGameAnalytics())

      // Add some data first
      act(() => {
        result.current.updateStats(mockPlayers, { player1: 1 }, { player1: 0 })
        result.current.trackMove('player1', 'horizontal', 0)
      })

      // Reset
      act(() => {
        result.current.resetStats()
      })

      expect(result.current.gameStats.moves).toBe(0)
      expect(result.current.gameStats.playerStats).toEqual({})
      expect(result.current.gameStats.winningPlayer).toBeNull()
    })
  })
})

