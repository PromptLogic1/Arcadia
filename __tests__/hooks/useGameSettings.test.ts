import { renderHook, act } from '@testing-library/react'
import { useGameSettings } from '@/components/challenges/bingo-board/hooks/useGameSettings'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { DEFAULT_GAME_SETTINGS, GAME_SETTINGS } from '@/components/challenges/bingo-board/types/gamesettings.constants'
import { mockSupabaseClient } from '@/__tests__/utils/test-utils'
import type { GameSettings } from '@/components/challenges/bingo-board/types/gamesettings.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Mock console.error to reduce noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalError
})

// Enable fake timers
jest.useFakeTimers()

describe('useGameSettings', () => {
  const mockBoardId = 'test-board'
  let mockSupabase: ReturnType<typeof mockSupabaseClient>

  beforeEach(() => {
    jest.clearAllTimers()
    mockSupabase = mockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    localStorage.clear()
    jest.spyOn(window, 'dispatchEvent').mockClear()

    // Setup default mock responses
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { settings: DEFAULT_GAME_SETTINGS },
        error: null
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to wait for hook initialization
  const renderAndWaitForHook = async () => {
    const hook = renderHook(() => useGameSettings(mockBoardId))
    await act(async () => {
      await Promise.resolve()
      jest.runAllTimers()
    })
    return hook
  }

  describe('Initialization', () => {
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
        timeLimit: GAME_SETTINGS.TIME_LIMITS.DEFAULT_TIME
      }

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { settings: savedSettings },
          error: null
        })
      })

      const { result } = await renderAndWaitForHook()
      expect(result.current.settings).toEqual(savedSettings)
      expect(result.current.loading).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error'))
      })

      const { result } = await renderAndWaitForHook()
      expect(result.current.error).toBeTruthy()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Settings Persistence', () => {
    it('should persist settings to localStorage when no boardId', async () => {
      // Clear localStorage
      window.localStorage.clear()

      // Mock localStorage
      const mockStorage = new Map<string, string>()
      const originalSetItem = window.localStorage.setItem
      const originalGetItem = window.localStorage.getItem

      window.localStorage.setItem = jest.fn((key: string, value: string) => {
        mockStorage.set(key, value)
        originalSetItem.call(window.localStorage, key, value)
      })

      window.localStorage.getItem = jest.fn((key: string) => {
        const value = mockStorage.get(key)
        return value || originalGetItem.call(window.localStorage, key)
      })

      const { result } = renderHook(() => useGameSettings(''))
      
      // Wait for initial render
      await act(async () => {
        await Promise.resolve()
        jest.runAllTimers()
      })

      // Update settings
      const newSettings = {
        ...DEFAULT_GAME_SETTINGS,
        teamMode: true,
        lockout: true
      }

      await act(async () => {
        await result.current.updateSettings(newSettings)
        jest.runAllTimers()
      })

      // Verify localStorage was updated
      const savedSettings = window.localStorage.getItem('lastGameSettings')
      expect(savedSettings).toBeDefined()
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        expect(parsed).toMatchObject({
          teamMode: true,
          lockout: true
        })
      }

      // Cleanup
      window.localStorage.setItem = originalSetItem
      window.localStorage.getItem = originalGetItem
    })

    it('should save settings to database when boardId exists', async () => {
      const { result } = await renderAndWaitForHook()
      const newSettings = { ...DEFAULT_GAME_SETTINGS, teamMode: true }

      await act(async () => {
        await result.current.updateSettings(newSettings)
        jest.runAllTimers()
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ settings: newSettings })
    })
  })

  describe('Settings Validation', () => {
    it('should enforce team mode lockout rule', async () => {
      const { result } = await renderAndWaitForHook()

      // First enable team mode
      await act(async () => {
        await result.current.updateSettings({ teamMode: true })
        jest.runAllTimers()
      })

      // Verify team mode and lockout are both enabled
      expect(result.current.settings.teamMode).toBe(true)
      expect(result.current.settings.lockout).toBe(true)

      // Try to disable lockout in team mode
      await act(async () => {
        await result.current.updateSettings({ lockout: false })
        jest.runAllTimers()
      })

      // Verify lockout remains enabled
      expect(result.current.settings.lockout).toBe(true)
      expect(result.current.error?.message).toBe('Team mode requires lockout to be enabled')
    })

    describe('Team Mode Settings', () => {
      it('should enable team mode with valid settings', async () => {
        const { result } = await renderAndWaitForHook()

        await act(async () => {
          await result.current.updateSettings({
            teamMode: true,
            lockout: true,
            boardSize: 4
          })
          jest.runAllTimers()
        })

        expect(result.current.settings).toMatchObject({
          teamMode: true,
          lockout: true,
          boardSize: 4
        })
      })

      it('should prevent invalid board size in team mode', async () => {
        const { result } = await renderAndWaitForHook()

        // First enable team mode
        await act(async () => {
          await result.current.updateSettings({
            teamMode: true,
            lockout: true,
            boardSize: 4
          })
          await Promise.resolve()
        })

        // Verify initial state
        expect(result.current.settings).toMatchObject({
          teamMode: true,
          lockout: true,
          boardSize: 4
        })

        // Try to set invalid board size
        await act(async () => {
          await result.current.updateSettings({ boardSize: 3 })
          await Promise.resolve()
        })

        // Verify settings were preserved
        expect(result.current.settings).toMatchObject({
          teamMode: true,
          lockout: true,
          boardSize: 4
        })
      })

      it('should maintain team mode settings when updating other settings', async () => {
        const { result } = await renderAndWaitForHook()

        // Enable team mode first with all required settings
        await act(async () => {
          await result.current.updateSettings({
            teamMode: true,
            lockout: true,
            boardSize: 4
          })
          jest.runAllTimers()
        })

        // Verify initial state
        expect(result.current.settings).toMatchObject({
          teamMode: true,
          lockout: true,
          boardSize: 4
        })

        // Update sound setting in a separate update
        await act(async () => {
          await result.current.updateSettings({
            soundEnabled: false
          })
          jest.runAllTimers()
        })

        // Verify all settings including preserved team mode settings
        expect(result.current.settings).toMatchObject({
          teamMode: true,
          lockout: true,
          boardSize: 4,
          soundEnabled: false
        })
      })
    })

    it('should validate time limits', async () => {
      const { result } = await renderAndWaitForHook()

      // Try to set time limit above maximum
      const invalidTimeLimit = GAME_SETTINGS.TIME_LIMITS.MAX_TIME + 1000

      await act(async () => {
        await result.current.updateSettings({ 
          timeLimit: invalidTimeLimit
        })
        jest.runAllTimers()
      })

      // Verify time limit was clamped and error was set
      expect(result.current.settings.timeLimit).toBe(GAME_SETTINGS.TIME_LIMITS.MAX_TIME)
      expect(result.current.error?.message).toBe('Time limit cannot exceed maximum')

      // Clear error state
      await act(async () => {
        await result.current.updateSettings({ timeLimit: GAME_SETTINGS.TIME_LIMITS.DEFAULT_TIME })
        jest.runAllTimers()
      })

      // Try to set time limit below minimum
      await act(async () => {
        await result.current.updateSettings({
          timeLimit: GAME_SETTINGS.TIME_LIMITS.MIN_TIME - 1000
        })
        jest.runAllTimers()
      })

      // Verify time limit was clamped and error was set
      expect(result.current.settings.timeLimit).toBe(GAME_SETTINGS.TIME_LIMITS.MIN_TIME)
      expect(result.current.error?.message).toBe('Time limit cannot be less than minimum')
    })

    it('should require at least one win condition', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.updateSettings({
          winConditions: { line: false, majority: false }
        })
        jest.runAllTimers()
      })

      expect(result.current.settings.winConditions.line).toBe(true)
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Toggle Functions', () => {
    it('should toggle team mode correctly', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.toggleTeamMode()
        jest.runAllTimers()
      })

      expect(result.current.settings.teamMode).toBe(true)
      expect(result.current.settings.lockout).toBe(true)
    })

    it('should toggle lockout correctly', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.toggleLockout()
        jest.runAllTimers()
      })

      expect(result.current.settings.lockout).toBe(false)
    })

    it('should not allow lockout toggle in team mode', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        // First enable team mode
        await result.current.updateSettings({ 
          teamMode: true,
          lockout: true // Ensure lockout is enabled with team mode
        })
        jest.runAllTimers()
      })

      await act(async () => {
        // Attempt to toggle lockout while in team mode
        await result.current.toggleLockout()
        jest.runAllTimers()
      })

      // Lockout should remain true in team mode
      expect(result.current.settings.lockout).toBe(true)
    })

    it('should toggle sound correctly', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.toggleSound()
        jest.runAllTimers()
      })

      expect(result.current.settings.soundEnabled).toBe(false)
    })

    it('should toggle win conditions correctly', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.toggleWinCondition('majority')
        jest.runAllTimers()
      })

      expect(result.current.settings.winConditions.majority).toBe(true)
    })
  })

  describe('Time Management', () => {
    it('should update time limit correctly', async () => {
      const { result } = await renderAndWaitForHook()
      const newTime = 600000 // 10 minutes

      await act(async () => {
        await result.current.updateTimeLimit(newTime)
        jest.runAllTimers()
      })

      expect(result.current.settings.timeLimit).toBe(newTime)
    })

    it('should clamp time limit to valid range', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.updateTimeLimit(GAME_SETTINGS.TIME_LIMITS.MIN_TIME - 1000)
        await Promise.resolve()
      })

      expect(result.current.settings.timeLimit).toBe(GAME_SETTINGS.TIME_LIMITS.MIN_TIME)
    })
  })

  describe('Event Emission', () => {
    it('should emit settings change events', async () => {
      const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.updateSettings({ teamMode: true })
        jest.runAllTimers()
      })

      expect(dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'settingsChange',
          detail: expect.objectContaining({
            type: 'change',
            settings: expect.objectContaining({ teamMode: true })
          })
        })
      )
    })
  })

  describe('Reset Function', () => {
    it('should reset settings to defaults', async () => {
      const { result } = await renderAndWaitForHook()

      await act(async () => {
        await result.current.updateSettings({ teamMode: true })
        await result.current.resetSettings()
        jest.runAllTimers()
      })

      expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS)
    })
  })
})

