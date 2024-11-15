import { renderHook, act } from '@testing-library/react'
import { useTimer } from '@/components/challenges/bingo-board/hooks/useTimer'
import type { TimerStats } from '@/components/challenges/bingo-board/hooks/useTimer'
import { TIMER_CONSTANTS } from '@/components/challenges/bingo-board/types/timer.constants'

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 16))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with given time', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))
      
      expect(result.current.time).toBe(300)
      expect(result.current.isTimerRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
    })

    it('should prevent negative initial time', () => {
      const { result } = renderHook(() => useTimer({ initialTime: -100 }))
      expect(result.current.time).toBe(0)
    })

    it('should initialize with clean timer stats', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))
      
      const expectedStats: TimerStats = {
        totalDrift: 0,
        maxDrift: 0,
        driftCorrections: 0,
        averageDrift: 0,
        lastCorrectionTime: 0,
        averageTickTime: 0,
        missedTicks: 0
      }
      
      expect(result.current.timerStats).toEqual(expectedStats)
    })
  })

  describe('timer controls', () => {
    it('should start and stop timer', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })
      expect(result.current.isTimerRunning).toBe(true)

      act(() => {
        result.current.setIsTimerRunning(false)
      })
      expect(result.current.isTimerRunning).toBe(false)
    })

    it('should pause and resume timer', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      // Start timer
      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Pause timer
      act(() => {
        result.current.pauseTimer()
      })
      expect(result.current.isPaused).toBe(true)
      expect(result.current.isTimerRunning).toBe(false)

      // Resume timer
      act(() => {
        result.current.resumeTimer()
      })
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isTimerRunning).toBe(true)
    })

    it('should reset timer', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      // Modify timer state
      act(() => {
        result.current.setTime(150)
        result.current.setIsTimerRunning(true)
      })

      // Reset timer
      act(() => {
        result.current.resetTimer()
      })

      expect(result.current.time).toBe(300)
      expect(result.current.isTimerRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.timerStats).toEqual({
        totalDrift: 0,
        maxDrift: 0,
        driftCorrections: 0,
        averageDrift: 0,
        lastCorrectionTime: 0,
        averageTickTime: 0,
        missedTicks: 0
      })
    })
  })

  describe('time tracking', () => {
    it('should count down when running', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(result.current.time).toBe(299)
    })

    it('should stop at zero', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 1 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Advance timer past zero
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(result.current.time).toBe(0)
      expect(result.current.isTimerRunning).toBe(false)
    })

    it('should maintain time when paused', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Run for 1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Pause timer
      act(() => {
        result.current.pauseTimer()
      })

      // Try to advance time while paused
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(result.current.time).toBe(299)
    })
  })

  describe('drift compensation', () => {
    it('should detect and correct large time drifts', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate a large time jump
      act(() => {
        jest.advanceTimersByTime(10000) // 10 seconds
      })

      expect(result.current.timerStats.driftCorrections).toBeGreaterThan(0)
    })

    it('should track maximum drift', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate multiple drifts
      for (let i = 0; i < 3; i++) {
        act(() => {
          jest.advanceTimersByTime(1100) // 1.1 seconds
        })
      }

      expect(result.current.timerStats.maxDrift).toBeGreaterThan(0)
    })

    it('should accumulate total drift', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate multiple small drifts
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(1050) // 1.05 seconds
        })
      }

      expect(result.current.timerStats.totalDrift).toBeGreaterThan(0)
    })

    it('should calculate average drift correctly', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate consistent drift
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(1100) // Consistent 100ms drift
        })
      }

      expect(result.current.timerStats.averageDrift).toBeGreaterThan(0)
      expect(result.current.timerStats.averageDrift).toBeLessThanOrEqual(
        result.current.timerStats.maxDrift
      )
    })

    it('should track missed ticks', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate a large jump that should cause missed ticks
      act(() => {
        jest.advanceTimersByTime(3000) // 3 seconds
      })

      expect(result.current.timerStats.missedTicks).toBeGreaterThan(0)
    })
  })

  describe('time formatting', () => {
    it('should format time correctly', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 3661 })) // 1h 1m 1s

      expect(result.current.formatTime(3661)).toBe('01:01:01')
      expect(result.current.formatTime(60)).toBe('00:01:00')
      expect(result.current.formatTime(0)).toBe('00:00:00')
    })
  })

  describe('error handling', () => {
    it('should handle timer update errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      // Simuliere Error mit ungültigem Zeitwert
      act(() => {
        // Explizite Typisierung für den ungültigen Wert
        const invalidTime: number = undefined as unknown as number
        result.current.setTime(invalidTime)
        result.current.setIsTimerRunning(true)
      })

      expect(result.current.isTimerRunning).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('callback handling', () => {
    it('should call onTimeEnd when timer reaches zero', () => {
      const onTimeEnd = jest.fn()
      const { result } = renderHook(() => useTimer({ 
        initialTime: 1,
        onTimeEnd 
      }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(onTimeEnd).toHaveBeenCalled()
    })
  })

  describe('session synchronization', () => {
    it('should call onSessionTimerEnd when timer reaches zero', () => {
      const onSessionTimerEnd = jest.fn()
      const { result } = renderHook(() => useTimer({ 
        initialTime: 1,
        onSessionTimerEnd
      }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(onSessionTimerEnd).toHaveBeenCalled()
    })
  })

  describe('browser refresh persistence', () => {
    // Mock für sessionStorage
    const sessionStorageMock = (() => {
      let store: { [key: string]: string } = {}
      return {
        getItem: jest.fn((key: string) => store[key]),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key]
        }),
        clear: jest.fn(() => {
          store = {}
        })
      }
    })()

    beforeEach(() => {
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })
      sessionStorageMock.clear()
    })

    it('should save timer state before unload', () => {
      const { result, unmount } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setTime(150)
        result.current.setIsTimerRunning(true)
      })

      // Simuliere beforeunload
      act(() => {
        window.dispatchEvent(new Event('beforeunload'))
      })

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'timerState',
        expect.stringContaining('"time":150')
      )

      unmount()
    })

    it('should load saved timer state on mount', () => {
      const savedState = {
        time: 150,
        isRunning: true,
        isPaused: false,
        pausedTime: null
      }

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      expect(result.current.time).toBe(150)
      expect(result.current.isTimerRunning).toBe(true)
    })

    it('should handle invalid saved state gracefully', () => {
      sessionStorageMock.getItem.mockReturnValue('invalid json')

      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      expect(result.current.time).toBe(300) // Sollte initialTime verwenden
      expect(result.current.isTimerRunning).toBe(false)
    })

    it('should remove timer state when reaching zero', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 1 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('timerState')
    })
  })

  describe('timer events', () => {
    beforeEach(() => {
      jest.spyOn(window, 'dispatchEvent')
    })

    it('should emit start event when timer starts', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            type: 'start',
            isRunning: true,
            isPaused: false
          })
        })
      )
    })

    it('should emit pause event when timer is paused', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
        result.current.pauseTimer()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            type: 'pause',
            isRunning: false,
            isPaused: true
          })
        })
      )
    })

    it('should emit resume event when timer is resumed', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
        result.current.pauseTimer()
        result.current.resumeTimer()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            type: 'resume',
            isRunning: true,
            isPaused: false
          })
        })
      )
    })

    it('should emit reset event when timer is reset', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setTime(150)
        result.current.resetTimer()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            type: 'reset',
            time: 300,
            isRunning: false,
            isPaused: false
          })
        })
      )
    })

    it('should emit tick events while running', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Advance timer and check for tick events
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            type: 'tick',
            time: 299
          })
        })
      )
    })

    it('should include timer stats in events', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timerEvent',
          detail: expect.objectContaining({
            stats: expect.objectContaining({
              totalDrift: 0,
              maxDrift: 0,
              driftCorrections: 0
            })
          })
        })
      )
    })

    it('should emit events with correct event names', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TIMER_CONSTANTS.EVENTS.TIMER_EVENT
        })
      )

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TIMER_CONSTANTS.EVENTS.TIMER_UPDATE
        })
      )
    })

    it('should respect MAX_TICK_HISTORY limit', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate many ticks
      for (let i = 0; i < TIMER_CONSTANTS.MAX_TICK_HISTORY + 10; i++) {
        act(() => {
          jest.advanceTimersByTime(TIMER_CONSTANTS.TICK_INTERVAL)
        })
      }

      // Check last event stats
      const dispatchCalls = (window.dispatchEvent as jest.Mock).mock.calls
      const lastEvent = dispatchCalls[dispatchCalls.length - 1].arguments[0]
      
      expect(lastEvent.detail.stats.averageTickTime).toBeDefined()
    })

    it('should use correct time constants', () => {
      const { result } = renderHook(() => useTimer({ 
        initialTime: TIMER_CONSTANTS.DEFAULT_TIME 
      }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Advance by performance check interval
      act(() => {
        jest.advanceTimersByTime(TIMER_CONSTANTS.PERFORMANCE_CHECK_INTERVAL)
      })

      expect(result.current.time).toBe(
        TIMER_CONSTANTS.DEFAULT_TIME - 
        TIMER_CONSTANTS.PERFORMANCE_CHECK_INTERVAL / TIMER_CONSTANTS.TICK_INTERVAL
      )
    })
  })

  describe('storage persistence', () => {
    const sessionStorageMock = (() => {
      let store: { [key: string]: string } = {}
      return {
        getItem: jest.fn((key: string) => store[key]),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key]
        }),
        clear: jest.fn(() => {
          store = {}
        })
      }
    })()

    beforeEach(() => {
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })
      sessionStorageMock.clear()
    })

    it('should use correct storage key', () => {
      const { result, unmount } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setTime(150)
      })

      unmount()

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        TIMER_CONSTANTS.STORAGE_KEY,
        expect.any(String)
      )
    })

    it('should respect MIN_TIME and MAX_TIME limits', () => {
      const { result } = renderHook(() => useTimer({ initialTime: -100 }))
      expect(result.current.time).toBe(TIMER_CONSTANTS.MIN_TIME)

      act(() => {
        result.current.setTime(TIMER_CONSTANTS.MAX_TIME + 100)
      })
      expect(result.current.time).toBe(TIMER_CONSTANTS.MAX_TIME)
    })
  })

  describe('drift compensation', () => {
    it('should respect MAX_DRIFT_THRESHOLD', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      // Simulate drift just below threshold
      act(() => {
        jest.advanceTimersByTime(TIMER_CONSTANTS.MAX_DRIFT_THRESHOLD - 100)
      })

      const initialDriftCorrections = result.current.timerStats.driftCorrections

      // Simulate drift above threshold
      act(() => {
        jest.advanceTimersByTime(TIMER_CONSTANTS.MAX_DRIFT_THRESHOLD + 100)
      })

      expect(result.current.timerStats.driftCorrections)
        .toBeGreaterThan(initialDriftCorrections)
    })

    it('should update stats at correct intervals', () => {
      const { result } = renderHook(() => useTimer({ initialTime: 300 }))

      act(() => {
        result.current.setIsTimerRunning(true)
      })

      const initialStats = { ...result.current.timerStats }

      act(() => {
        jest.advanceTimersByTime(TIMER_CONSTANTS.STATS_UPDATE_INTERVAL)
      })

      expect(result.current.timerStats).not.toEqual(initialStats)
    })
  })
})