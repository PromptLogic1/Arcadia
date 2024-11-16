import { renderHook, act } from '@testing-library/react'
import { useGameAnalytics } from '@/components/challenges/bingo-board/hooks/useGameAnalytics'
import { generateMockPlayer } from '@/__tests__/utils/test-utils'
import { ANALYTICS_CONSTANTS, EVENT_TYPES } from '@/components/challenges/bingo-board/types/analytics.constants'
import type { Player } from '@/components/challenges/bingo-board/types/types'
import { PERFORMANCE_METRICS } from '@/components/challenges/bingo-board/types/analytics.constants'

// Mock window event handling
const mockDispatchEvent = jest.fn()
window.dispatchEvent = mockDispatchEvent

describe('useGameAnalytics', () => {
  const MOCK_TIME = 1000

  beforeEach(() => {
    jest.useFakeTimers()
    mockDispatchEvent.mockClear()
    window.localStorage.clear()
    window.sessionStorage.clear()
    jest.spyOn(Date, 'now').mockImplementation(() => MOCK_TIME)
    jest.spyOn(performance, 'now').mockImplementation(() => MOCK_TIME)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('should initialize with default stats', () => {
    const { result } = renderHook(() => useGameAnalytics())
    
    expect(result.current.gameStats).toEqual({
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: MOCK_TIME,
      endTime: null,
      playerStats: {},
      performanceMetrics: {
        [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
        [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0,
        [PERFORMANCE_METRICS.FRAME_TIME]: 0,
        [PERFORMANCE_METRICS.UPDATE_TIME]: 0
      }
    })
  })

  it('should track moves and update player stats correctly', () => {
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

    const playerStats = result.current.gameStats.playerStats[mockPlayer.id]
    
    expect(result.current.gameStats.moves).toBe(1)
    expect(playerStats).toBeDefined()
    if (playerStats) {
      expect(playerStats.markedFields).toBe(1)
    }
  })

  it('should record winner and set end time', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    act(() => {
      result.current.recordWinner(mockPlayer.id)
    })

    expect(result.current.gameStats.winningPlayer).toBe(mockPlayer.id)
    expect(result.current.gameStats.endTime).toBe(MOCK_TIME)
    
    // Verify win event was emitted
    const expectedEvent = new CustomEvent(EVENT_TYPES.WIN, {
      detail: {
        type: EVENT_TYPES.WIN,
        playerId: mockPlayer.id,
        timestamp: MOCK_TIME,
        data: { duration: MOCK_TIME }
      }
    })

    expect(mockDispatchEvent).toHaveBeenCalledWith(expectedEvent)
  })

  it('should track move patterns', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    act(() => {
      result.current.trackMove(mockPlayer.id, 'mark', 0)
      result.current.trackMove(mockPlayer.id, 'mark', 1)
      result.current.trackMove(mockPlayer.id, 'mark', 2)
    })

    const analysis = result.current.calculateStats()
    expect(analysis.movePatterns).toHaveLength(3)
    expect(analysis.playerTendencies[mockPlayer.id]).toBeDefined()
  })

  it('should measure performance metrics', () => {
    const { result } = renderHook(() => useGameAnalytics())

    act(() => {
      result.current.measurePerformance()
      jest.advanceTimersByTime(ANALYTICS_CONSTANTS.PERFORMANCE.PERFORMANCE_CHECK_INTERVAL)
    })

    const expectedMetrics = {
      [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
      [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0,
      [PERFORMANCE_METRICS.FRAME_TIME]: 0,
      [PERFORMANCE_METRICS.UPDATE_TIME]: MOCK_TIME
    }

    expect(result.current.gameStats.performanceMetrics).toEqual(expectedMetrics)
  })

  it('should generate comprehensive game report', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    act(() => {
      // Simulate some game activity
      result.current.trackMove(mockPlayer.id, 'mark', 0)
      result.current.updateStats(
        [mockPlayer],
        { [mockPlayer.id]: 1 },
        { [mockPlayer.id]: 1 }
      )
      result.current.measurePerformance()
    })

    const report = result.current.generateReport()
    
    expect(report).toEqual(
      expect.objectContaining({
        gameStats: expect.any(Object),
        analysis: expect.objectContaining({
          averageMoveTime: expect.any(Number),
          movePatterns: expect.any(Array),
          winningStrategies: expect.any(Array),
          playerTendencies: expect.any(Object),
          performanceMetrics: expect.any(Object)
        })
      })
    )
  })

  it('should handle event queue overflow correctly', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    // Fill event queue beyond max size
    act(() => {
      for (let i = 0; i < ANALYTICS_CONSTANTS.EVENTS.MAX_QUEUE_SIZE + 5; i++) {
        result.current.trackMove(mockPlayer.id, 'mark', i)
      }
    })

    // Verify queue size is maintained
    const report = result.current.generateReport()
    expect(report.gameStats.moves).toBeLessThanOrEqual(ANALYTICS_CONSTANTS.EVENTS.MAX_QUEUE_SIZE)
  })

  it('should reset stats correctly', () => {
    const { result } = renderHook(() => useGameAnalytics())
    const mockPlayer = generateMockPlayer()

    act(() => {
      result.current.trackMove(mockPlayer.id, 'mark', 0)
      result.current.updateStats(
        [mockPlayer],
        { [mockPlayer.id]: 1 },
        { [mockPlayer.id]: 1 }
      )
    })

    act(() => {
      result.current.resetStats()
    })

    expect(result.current.gameStats).toEqual({
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: MOCK_TIME,
      endTime: null,
      playerStats: {},
      performanceMetrics: {
        [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
        [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0,
        [PERFORMANCE_METRICS.FRAME_TIME]: 0,
        [PERFORMANCE_METRICS.UPDATE_TIME]: 0
      }
    })
  })

  it('should handle performance monitoring cleanup', () => {
    const { result, unmount } = renderHook(() => useGameAnalytics())

    act(() => {
      result.current.measurePerformance()
      jest.advanceTimersByTime(ANALYTICS_CONSTANTS.PERFORMANCE.PERFORMANCE_CHECK_INTERVAL)
    })

    unmount()

    const expectedMetrics = {
      [PERFORMANCE_METRICS.PAGE_LOAD]: 0,
      [PERFORMANCE_METRICS.TIME_TO_INTERACTIVE]: 0,
      [PERFORMANCE_METRICS.FRAME_TIME]: 0,
      [PERFORMANCE_METRICS.UPDATE_TIME]: MOCK_TIME
    }

    expect(result.current.gameStats.performanceMetrics).toEqual(expectedMetrics)
  })
})

