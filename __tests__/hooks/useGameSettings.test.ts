import { renderHook, act } from '@testing-library/react'
import { useGameSettings } from '@/components/challenges/bingo-board/hooks/useGameSettings'
import type { Database } from '@/types/database.types'

// Definiere eigene Event-Detail-Struktur für Tests
interface SettingsChangeEventDetail {
  settings: {
    teamMode: boolean
    lockout: boolean
    soundEnabled: boolean
    winConditions: {
      line: boolean
      majority: boolean
    }
    timeLimit: number
  }
  source: 'user' | 'system'
  timestamp: number
}

// Definiere Typen für die Mock-Rückgabewerte
type SupabaseResponse = {
  data: { settings?: unknown } | null
  error: Error | null
}

// Mock für localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key]),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock für CustomEvent mit korrekter Typisierung
type CustomEventConstructor = new <T>(
  typeArg: string,
  eventInitDict?: CustomEventInit<T>
) => CustomEvent<T>

window.CustomEvent = jest.fn().mockImplementation((event, options) => ({
  type: event,
  detail: options?.detail,
  bubbles: options?.bubbles ?? false
})) as unknown as CustomEventConstructor

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn<Promise<SupabaseResponse>, []>()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn<Promise<SupabaseResponse>, []>()
    }))
  }))
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient
}))

describe('useGameSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    jest.spyOn(window, 'dispatchEvent')
  })

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useGameSettings())

      expect(result.current.settings).toEqual({
        teamMode: false,
        lockout: true,
        soundEnabled: true,
        winConditions: {
          line: true,
          majority: false
        },
        timeLimit: 300
      })
    })

    it('should load settings from database when boardId is provided', async () => {
      const mockSettings = {
        teamMode: true,
        lockout: false,
        soundEnabled: false,
        winConditions: {
          line: false,
          majority: true
        },
        timeLimit: 600
      }

      // Typisierter Mock für die Supabase-Antwort
      const mockResponse: SupabaseResponse = {
        data: { settings: mockSettings },
        error: null
      }

      mockSupabaseClient.from().select().eq().single
        .mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useGameSettings('test-board-id'))

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.settings).toEqual(mockSettings)
    })
  })

  describe('toggle functions', () => {
    it('should toggle team mode', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.toggleTeamMode()
      })

      expect(result.current.settings.teamMode).toBe(true)

      await act(async () => {
        await result.current.toggleTeamMode()
      })

      expect(result.current.settings.teamMode).toBe(false)
    })

    it('should toggle lockout', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.toggleLockout()
      })

      expect(result.current.settings.lockout).toBe(false)
    })

    it('should toggle sound', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.toggleSound()
      })

      expect(result.current.settings.soundEnabled).toBe(false)
    })

    it('should toggle win conditions', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.toggleWinCondition('majority')
      })

      expect(result.current.settings.winConditions.majority).toBe(true)
      expect(result.current.settings.winConditions.line).toBe(true)
    })
  })

  describe('time management', () => {
    it('should update time limit within valid range', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.updateTimeLimit(1800) // 30 minutes
      })

      expect(result.current.settings.timeLimit).toBe(1800)
    })

    it('should clamp time limit to valid range', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.updateTimeLimit(30) // Too low
      })
      expect(result.current.settings.timeLimit).toBe(60) // Minimum 1 minute

      await act(async () => {
        await result.current.updateTimeLimit(7200) // Too high
      })
      expect(result.current.settings.timeLimit).toBe(3600) // Maximum 1 hour
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      // Typisierter Mock für die Fehlermeldung
      const mockErrorResponse: SupabaseResponse = {
        data: null,
        error: new Error('Database error')
      }

      mockSupabaseClient.from().update().eq
        .mockResolvedValueOnce(mockErrorResponse)

      const { result } = renderHook(() => useGameSettings('test-board-id'))

      await act(async () => {
        await result.current.updateSettings({ teamMode: true })
      })

      expect(result.current.error).toBe('Failed to update settings')
    })
  })

  describe('settings validation', () => {
    it('should validate win conditions', async () => {
      const { result } = renderHook(() => useGameSettings())

      // Versuche beide Win-Conditions zu deaktivieren
      await act(async () => {
        await result.current.updateSettings({
          winConditions: {
            line: false,
            majority: false
          }
        })
      })

      // Settings sollten unverändert bleiben
      expect(result.current.settings.winConditions.line).toBe(true)
      expect(result.current.error).toBe('Invalid settings configuration')
    })

    it('should enforce lockout in team mode', async () => {
      const { result } = renderHook(() => useGameSettings())

      // Versuche Team-Mode zu aktivieren ohne Lockout
      await act(async () => {
        await result.current.updateSettings({
          teamMode: true,
          lockout: false
        })
      })

      expect(result.current.error).toBe('Invalid settings configuration')
    })

    it('should validate time limits', async () => {
      const { result } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.updateTimeLimit(30) // Zu niedrig
      })
      expect(result.current.settings.timeLimit).toBe(60)

      await act(async () => {
        await result.current.updateTimeLimit(4000) // Zu hoch
      })
      expect(result.current.settings.timeLimit).toBe(3600)
    })
  })

  describe('event handling', () => {
    it('should emit settings change event with correct detail structure', async () => {
      const { result } = renderHook(() => useGameSettings())
      const now = Date.now()
      jest.spyOn(Date, 'now').mockImplementation(() => now)

      await act(async () => {
        await result.current.toggleTeamMode()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'settingsChange',
          detail: expect.objectContaining({
            settings: expect.objectContaining({
              teamMode: true
            }),
            source: 'user',
            timestamp: now
          }),
          bubbles: true
        })
      )
    })

    it('should handle external settings changes with system source', async () => {
      const { result } = renderHook(() => useGameSettings())

      const newSettings = {
        teamMode: true,
        lockout: true,
        soundEnabled: false,
        winConditions: {
          line: true,
          majority: true
        },
        timeLimit: 600
      }

      const eventDetail: SettingsChangeEventDetail = {
        settings: newSettings,
        source: 'system',
        timestamp: Date.now()
      }

      await act(async () => {
        window.dispatchEvent(new CustomEvent('settingsChange', {
          detail: eventDetail
        }))
      })

      expect(result.current.settings).toEqual(newSettings)
    })

    it('should ignore own events', async () => {
      const { result } = renderHook(() => useGameSettings())
      const initialSettings = { ...result.current.settings }

      const eventDetail: SettingsChangeEventDetail = {
        settings: {
          ...initialSettings,
          teamMode: true
        },
        source: 'user', // Eigenes Event
        timestamp: Date.now()
      }

      await act(async () => {
        window.dispatchEvent(new CustomEvent('settingsChange', {
          detail: eventDetail
        }))
      })

      expect(result.current.settings).toEqual(initialSettings)
    })

    it('should validate external settings before applying', async () => {
      const { result } = renderHook(() => useGameSettings())
      const initialSettings = { ...result.current.settings }

      const invalidEventDetail: SettingsChangeEventDetail = {
        settings: {
          ...initialSettings,
          timeLimit: 0 // Ungültig
        },
        source: 'system',
        timestamp: Date.now()
      }

      await act(async () => {
        window.dispatchEvent(new CustomEvent('settingsChange', {
          detail: invalidEventDetail
        }))
      })

      expect(result.current.settings).toEqual(initialSettings)
    })
  })

  describe('persistence with validation', () => {
    it('should validate settings before saving to localStorage', async () => {
      const { result, unmount } = renderHook(() => useGameSettings())
      const invalidSettings = {
        ...result.current.settings,
        timeLimit: 0 // Ungültig
      }

      await act(async () => {
        await result.current.updateSettings(invalidSettings)
      })

      unmount()

      const mockCalls = localStorageMock.setItem.mock.calls
      const lastCall = mockCalls[mockCalls.length - 1]

      if (lastCall && lastCall[1]) {
        const savedSettings = JSON.parse(lastCall[1])
        expect(savedSettings.timeLimit).not.toBe(0)
      }
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      const { result } = renderHook(() => useGameSettings())
      
      act(() => {
        result.current.resetSettings()
      })

      // Sollte nicht abstürzen und Standardeinstellungen behalten
      expect(result.current.settings.teamMode).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('persistence', () => {
    it('should save settings to localStorage on cleanup', async () => {
      const { result, unmount } = renderHook(() => useGameSettings())

      await act(async () => {
        await result.current.toggleTeamMode()
      })

      unmount()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lastGameSettings',
        expect.any(String)
      )

      // Sichere Typprüfung für mock.calls
      const mockCalls = localStorageMock.setItem.mock.calls
      const lastCall = mockCalls[mockCalls.length - 1]
      
      if (lastCall && lastCall[1]) {
        const savedSettings = JSON.parse(lastCall[1])
        expect(savedSettings.teamMode).toBe(true)
      } else {
        throw new Error('No settings were saved to localStorage')
      }
    })

    it('should load settings from localStorage', () => {
      const savedSettings = {
        teamMode: true,
        lockout: true,
        soundEnabled: false,
        winConditions: {
          line: true,
          majority: true
        },
        timeLimit: 600
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))

      const { result } = renderHook(() => useGameSettings())
      expect(result.current.settings).toEqual(savedSettings)
    })

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const { result } = renderHook(() => useGameSettings())
      expect(result.current.settings).toEqual(expect.objectContaining({
        teamMode: false,
        lockout: true
      }))
    })
  })

  describe('rollback functionality', () => {
    it('should rollback to last valid settings on error', async () => {
      const { result } = renderHook(() => useGameSettings())
      const initialSettings = { ...result.current.settings }

      // Simuliere Datenbankfehler
      mockSupabaseClient.from().update().eq
        .mockRejectedValueOnce(new Error('Database error'))

      await act(async () => {
        await result.current.updateSettings({
          teamMode: true,
          lockout: false // Ungültige Kombination
        })
      })

      expect(result.current.settings).toEqual(initialSettings)
      expect(result.current.error).toBe('Failed to update settings')
    })
  })
}) 