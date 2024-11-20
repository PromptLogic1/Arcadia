import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTimer } from '@/components/challenges/bingo-board/hooks/useTimer'
import { TIMER_CONSTANTS } from '@/components/challenges/bingo-board/types/timer.constants'

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
    sessionStorage.clear()
    jest.spyOn(window, 'dispatchEvent').mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    sessionStorage.clear()
  })

  // Helper function to advance timers and update state
  const advanceTimerAndAct = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms)
      // Allow any pending promises to resolve
      await Promise.resolve()
    })
  }

  it('should initialize with given time', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))
    
    expect(result.current.time).toBe(300)
    expect(result.current.isTimerRunning).toBe(false)
    expect(result.current.isPaused).toBe(false)
  })

  it('should format time correctly', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 3665, // 1h 1m 5s
      onTimeEnd: jest.fn()
    }))

    expect(result.current.formatTime(3665)).toBe('01:01:05')
  })

  it('should start and stop timer', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
    })
    expect(result.current.isTimerRunning).toBe(true)

    act(() => {
      result.current.setIsTimerRunning(false)
    })
    expect(result.current.isTimerRunning).toBe(false)
  })

  it('should count down when running', async () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    await act(async () => {
      result.current.setIsTimerRunning(true)
      await advanceTimerAndAct(1000)
    })

    expect(result.current.time).toBe(299)
  })

  it('should call onTimeEnd when timer reaches zero', async () => {
    const onTimeEnd = jest.fn()
    const { result } = renderHook(() => useTimer({ 
      initialTime: 1,
      onTimeEnd
    }))

    await act(async () => {
      result.current.setIsTimerRunning(true)
      await advanceTimerAndAct(1000)
    })

    expect(onTimeEnd).toHaveBeenCalled()
    expect(result.current.time).toBe(0)
    expect(result.current.isTimerRunning).toBe(false)
  })

  it('should pause and resume timer', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
      result.current.pauseTimer()
    })

    expect(result.current.isPaused).toBe(true)
    const timeAtPause = result.current.time

    act(() => {
      jest.advanceTimersByTime(1000) // Should not decrease while paused
    })

    expect(result.current.time).toBe(timeAtPause)

    act(() => {
      result.current.resumeTimer()
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.isPaused).toBe(false)
    expect(result.current.time).toBe(timeAtPause - 1)
  })

  it('should reset timer correctly', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(5000)
      result.current.resetTimer()
    })

    expect(result.current.time).toBe(300)
    expect(result.current.isTimerRunning).toBe(false)
    expect(result.current.isPaused).toBe(false)
  })

  it('should persist timer state', () => {
    // First render to set initial state
    const { result, rerender } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    // Run timer and save state
    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(5000)
    })

    const timeBeforeSave = result.current.time

    // Simulate beforeunload
    act(() => {
      const event = new Event('beforeunload')
      window.dispatchEvent(event)
    })

    // Clear the hook
    jest.clearAllMocks()

    // Rerender hook to test state restoration
    rerender()

    // Verify state was restored
    expect(result.current.time).toBe(timeBeforeSave)
  })

  it('should handle session timer end callback', () => {
    const onSessionTimerEnd = jest.fn()
    const { result } = renderHook(() => useTimer({ 
      initialTime: 1,
      onTimeEnd: jest.fn(),
      onSessionTimerEnd
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
    })

    expect(onSessionTimerEnd).toHaveBeenCalled()
  })

  it('should track performance metrics', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
    })

    const stats = result.current.timerStats
    expect(stats.totalDrift).toBeGreaterThanOrEqual(0)
    expect(stats.maxDrift).toBeGreaterThanOrEqual(0)
    expect(stats.averageTickTime).toBeGreaterThan(0)
  })

  it('should emit timer events', () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
    })

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'timerEvent'
      })
    )
  })

  it('should handle drift compensation', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      // Simulate significant drift
      jest.advanceTimersByTime(2000) // 2 seconds
    })

    expect(result.current.timerStats.driftCorrections).toBeGreaterThan(0)
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
  })

  // Add test for storage behavior
  it('should handle storage operations correctly', () => {
    // Mock storage
    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage })

    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
    })

    // Simulate beforeunload
    act(() => {
      const event = new Event('beforeunload')
      window.dispatchEvent(event)
    })

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      TIMER_CONSTANTS.STORAGE_KEY,
      expect.any(String)
    )
  })
})

