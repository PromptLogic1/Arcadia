import { renderHook, act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useGameSettings } from '@/components/challenges/bingo-board/hooks/useGameSettings'
import { DEFAULT_GAME_SETTINGS } from '@/components/challenges/bingo-board/types/gamesettings.constants'
import { GAME_SETTINGS } from '@/components/challenges/bingo-board/types/gamesettings.constants'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useGameSettings', () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    localStorage.clear()
  })

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useGameSettings('test-board'))
    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS)
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('should load saved settings from database', async () => {
    const savedSettings = {
      ...DEFAULT_GAME_SETTINGS,
      teamMode: true,
      timeLimit: 600
    }

    mockSupabase.from().select().eq().single.mockResolvedValueOnce({
      data: { settings: savedSettings },
      error: null
    })

    const { result } = renderHook(() => useGameSettings('test-board'))

    // Wait for settings to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.settings).toEqual(savedSettings)
    expect(result.current.loading).toBe(false)
  })

  it('should update settings correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    expect(result.current.settings.teamMode).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
  })

  it('should handle settings update error', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ 
      data: null, 
      error: new Error('Update failed') 
    })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS)
  })

  it('should toggle team mode correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.toggleTeamMode()
    })

    expect(result.current.settings.teamMode).toBe(true)
    expect(result.current.settings.lockout).toBe(true) // Lockout should be enabled in team mode
  })

  it('should toggle lockout correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.toggleLockout()
    })

    expect(result.current.settings.lockout).toBe(false)
  })

  it('should not allow disabling lockout in team mode', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
      await result.current.toggleLockout()
    })

    expect(result.current.settings.lockout).toBe(true)
  })

  it('should toggle sound correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.toggleSound()
    })

    expect(result.current.settings.soundEnabled).toBe(false)
  })

  it('should toggle win conditions correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.toggleWinCondition('line')
    })

    expect(result.current.settings.winConditions.line).toBe(false)
  })

  it('should prevent disabling all win conditions', async () => {
    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.toggleWinCondition('line')
      await result.current.toggleWinCondition('majority')
    })

    // At least one win condition should remain enabled
    expect(
      result.current.settings.winConditions.line || 
      result.current.settings.winConditions.majority
    ).toBe(true)
  })

  it('should update time limit within valid range', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateTimeLimit(120)
    })

    expect(result.current.settings.timeLimit).toBe(120)
  })

  it('should clamp time limit to valid range', async () => {
    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateTimeLimit(GAME_SETTINGS.TIME_LIMITS.MIN_TIME - 1)
    })
    expect(result.current.settings.timeLimit).toBe(GAME_SETTINGS.TIME_LIMITS.MIN_TIME)

    await act(async () => {
      await result.current.updateTimeLimit(GAME_SETTINGS.TIME_LIMITS.MAX_TIME + 1)
    })
    expect(result.current.settings.timeLimit).toBe(GAME_SETTINGS.TIME_LIMITS.MAX_TIME)
  })

  it('should reset settings to default', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.resetSettings()
    })

    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS)
  })

  it('should emit settings change event', async () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent')
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useGameSettings('test-board'))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    expect(mockDispatchEvent).toHaveBeenCalled()
    const eventCall = mockDispatchEvent.mock.calls[0]
    if (!eventCall) {
      throw new Error('No event was dispatched')
    }

    const event = eventCall[0] as CustomEvent
    if (!event?.detail) {
      throw new Error('Event has no detail property')
    }

    expect(event.detail.type).toBe('change')
    expect(event.detail.settings.teamMode).toBe(true)
  })

  it('should persist settings to localStorage when no boardId', async () => {
    const { result } = renderHook(() => useGameSettings(''))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    const savedSettings = localStorage.getItem('lastGameSettings')
    expect(savedSettings).toBeTruthy()
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      expect(parsed.teamMode).toBe(true)
    }
  })

  it('should validate settings before update', async () => {
    const { result } = renderHook(() => useGameSettings('test-board'))

    // Try to update with invalid settings (both win conditions false)
    await act(async () => {
      await result.current.updateSettings({
        winConditions: { line: false, majority: false }
      })
    })

    // Settings should not be updated due to validation failure
    expect(result.current.settings.winConditions).toEqual(DEFAULT_GAME_SETTINGS.winConditions)
    expect(result.current.error).toBeTruthy()
  })

  it('should handle external settings changes', () => {
    const { result } = renderHook(() => useGameSettings('test-board'))

    act(() => {
      window.dispatchEvent(new CustomEvent('settingsChange', {
        detail: {
          type: 'change',
          settings: { ...DEFAULT_GAME_SETTINGS, teamMode: true },
          source: 'system',
          timestamp: Date.now()
        }
      }))
    })

    expect(result.current.settings.teamMode).toBe(true)
  })
})

