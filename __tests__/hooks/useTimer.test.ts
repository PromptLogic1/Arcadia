import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTimer } from '@/components/challenges/bingo-board/hooks/useTimer'

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Clear any mocked event listeners
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

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

  it('should count down when running', () => {
    const { result } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.time).toBe(299)
  })

  it('should call onTimeEnd when timer reaches zero', () => {
    const onTimeEnd = jest.fn()
    const { result } = renderHook(() => useTimer({ 
      initialTime: 1,
      onTimeEnd
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(1000)
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

  it('should persist timer state', () => {
    const { result, rerender } = renderHook(() => useTimer({ 
      initialTime: 300,
      onTimeEnd: jest.fn()
    }))

    act(() => {
      result.current.setIsTimerRunning(true)
      jest.advanceTimersByTime(5000)
    })

    const timeBeforeRerender = result.current.time

    rerender()

    expect(result.current.time).toBe(timeBeforeRerender)
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
})

