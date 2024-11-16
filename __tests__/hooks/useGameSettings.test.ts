import { renderHook, act } from '@testing-library/react'
import { useGameSettings } from '@/components/challenges/bingo-board/hooks/useGameSettings'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { DEFAULT_GAME_SETTINGS } from '@/components/challenges/bingo-board/types/gamesettings.constants'
import { mockSupabaseClient } from '@/__tests__/utils/test-utils'
import type { GameSettings } from '@/components/challenges/bingo-board/types/gamesettings.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useGameSettings', () => {
  const mockBoardId = 'test-board'
  let mockSupabase: ReturnType<typeof mockSupabaseClient>

  beforeEach(() => {
    mockSupabase = mockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    localStorage.clear()
  })

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useGameSettings(mockBoardId))
    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS)
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should load saved settings from database', async () => {
    const savedSettings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      teamMode: true,
      timeLimit: 600
    }

    mockSupabase.from().select().eq().single.mockResolvedValueOnce({
      data: { settings: savedSettings },
      error: null
    })

    const { result } = renderHook(() => useGameSettings(mockBoardId))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.settings).toEqual(savedSettings)
    expect(result.current.loading).toBe(false)
  })

  it('should update settings correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ 
      data: null, 
      error: null 
    })

    const { result } = renderHook(() => useGameSettings(mockBoardId))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    expect(result.current.settings.teamMode).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
  })

  it('should enforce team mode lockout rule', async () => {
    const { result } = renderHook(() => useGameSettings(mockBoardId))

    await act(async () => {
      await result.current.updateSettings({ 
        teamMode: true,
        lockout: false // Should be forced to true in team mode
      })
    })

    expect(result.current.settings.teamMode).toBe(true)
    expect(result.current.settings.lockout).toBe(true)
  })

  it('should persist settings to localStorage when no boardId', async () => {
    const { result } = renderHook(() => useGameSettings(''))

    const newSettings = {
      ...DEFAULT_GAME_SETTINGS,
      teamMode: true
    }

    await act(async () => {
      await result.current.updateSettings(newSettings)
    })

    const savedSettings = localStorage.getItem('lastGameSettings')
    expect(savedSettings).toBeTruthy()
    if (savedSettings) {
      expect(JSON.parse(savedSettings)).toEqual(newSettings)
    }
  })

  it('should emit settings change events', async () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useGameSettings(mockBoardId))

    await act(async () => {
      await result.current.updateSettings({ teamMode: true })
    })

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'settingsChange'
      })
    )
  })
})

