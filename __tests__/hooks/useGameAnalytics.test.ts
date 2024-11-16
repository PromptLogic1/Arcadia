import { renderHook, act } from '@testing-library/react'
import { useGameAnalytics } from '@/components/challenges/bingo-board/hooks/useGameAnalytics'
import { generateMockPlayer } from '@/__tests__/utils/test-utils'
import { ANALYTICS_CONSTANTS } from '@/components/challenges/bingo-board/types/analytics.constants'
import type { Player } from '@/components/challenges/bingo-board/types/types'

describe('useGameAnalytics', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with default stats', () => {
    const { result } = renderHook(() => useGameAnalytics())
    
    expect(result.current.gameStats).toEqual({
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: null,
      endTime: null,
      playerStats: {},
      performanceMetrics: {}
    })
  })

  it('should track moves correctly', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()
    const mockPlayers: Player[] = [mockPlayer]

    act(() => {
      result.current.updateStats(
        mockPlayers,
        { [mockPlayer.id]: 1 },
        { [mockPlayer.id]: 0 }
      )
    })

    expect(result.current.gameStats.moves).toBe(1)
    expect(result.current.gameStats.playerStats[mockPlayer.id]).toBeDefined()
  })

  it('should record winner', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    act(() => {
      result.current.recordWinner(mockPlayer.id)
    })

    expect(result.current.gameStats.winningPlayer).toBe(mockPlayer.id)
    expect(result.current.gameStats.endTime).toBeDefined()
  })

  it('should measure performance', () => {
    const { result } = renderHook(() => useGameAnalytics())

    act(() => {
      result.current.measurePerformance()
      jest.advanceTimersByTime(ANALYTICS_CONSTANTS.PERFORMANCE.PERFORMANCE_CHECK_INTERVAL)
    })

    expect(result.current.gameStats.performanceMetrics).toBeDefined()
  })

  // Add more tests...
})

