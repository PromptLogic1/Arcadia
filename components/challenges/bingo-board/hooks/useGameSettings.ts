'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { GameSettings } from '../types/gamesettings.types'
import { GAME_SETTINGS, DEFAULT_GAME_SETTINGS } from '../types/gamesettings.constants'
import type { Database } from '@/types/database.types'

// Event-System Types
interface SettingsChangeEventDetail {
  type: 'change' | 'reset' | 'modeSwitch'
  settings: GameSettings
  source: 'user' | 'system'
  timestamp: number
}

type SettingsChangeEvent = CustomEvent<SettingsChangeEventDetail>

declare global {
  interface WindowEventMap {
    'settingsChange': SettingsChangeEvent
  }
}

// Add return type interface
interface UseGameSettingsReturn {
  settings: GameSettings
  loading: boolean
  error: Error | null
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  toggleTeamMode: () => Promise<void>
  toggleLockout: () => Promise<void>
  toggleSound: () => Promise<void>
  toggleWinCondition: (condition: keyof GameSettings['winConditions']) => Promise<void>
  updateTimeLimit: (newLimit: number) => Promise<void>
}

export const useGameSettings = (_boardId: string): UseGameSettingsReturn => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastValidSettings, setLastValidSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)

  const supabase = createClientComponentClient<Database>()

  // Error Handling korrigieren
  const setErrorMessage = useCallback((message: string) => {
    setError(new Error(message))
  }, [])

  // Erweiterte Validierung gemäß 3.1 & 3.2
  const validateSettings = useCallback((newSettings: GameSettings): boolean => {
    try {
      // Team mode requires lockout and minimum board size
      if (newSettings.teamMode && !newSettings.lockout) {
        setErrorMessage('Team mode requires lockout to be enabled')
        return false
      }

      if (newSettings.teamMode && newSettings.boardSize < 4) {
        setErrorMessage('Team mode requires minimum board size of 4')
        return false
      }

      // At least one win condition must be active
      if (!newSettings.winConditions.line && !newSettings.winConditions.majority) {
        setErrorMessage('At least one win condition must be active')
        return false
      }

      // Time limit validation
      if (newSettings.timeLimit < GAME_SETTINGS.TIME_LIMITS.MIN_TIME ||
          newSettings.timeLimit > GAME_SETTINGS.TIME_LIMITS.MAX_TIME) {
        setErrorMessage(
          newSettings.timeLimit < GAME_SETTINGS.TIME_LIMITS.MIN_TIME
            ? 'Time limit cannot be less than minimum'
            : 'Time limit cannot exceed maximum'
        )
        return false
      }

      setError(null)
      return true
    } catch (error) {
      console.error('Error validating settings:', error)
      return false
    }
  }, [setErrorMessage, setError])

  // Event-Handling mit allen Event-Typen
  const emitSettingsEvent = useCallback((
    type: 'change' | 'reset' | 'modeSwitch',
    newSettings: GameSettings
  ) => {
    try {
      const event = new CustomEvent<SettingsChangeEventDetail>('settingsChange', {
        detail: {
          type,
          settings: newSettings,
          source: 'user',
          timestamp: Date.now()
        },
        bubbles: true
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Error emitting settings event:', error)
    }
  }, [])

  // Lade gespeicherte Einstellungen
  useEffect(() => {
    const loadSettings = async () => {
      if (!_boardId) {
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bingo_boards')
          .select('settings')
          .eq('id', _boardId)
          .single()

        if (fetchError) throw fetchError

        if (data?.settings) {
          setSettings(data.settings as GameSettings)
        }
        
        setError(null)
      } catch (err) {
        console.error('Error loading settings:', err)
        setErrorMessage('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [_boardId, supabase, setErrorMessage])

  // Speichere Einstellungen in der Datenbank
  const saveSettings = useCallback(async (newSettings: GameSettings) => {
    if (!_boardId) return

    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update({ settings: newSettings })
        .eq('id', _boardId)

      if (updateError) throw updateError
      
      setError(null)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(new Error('Failed to save settings'))
      throw err
    }
  }, [_boardId, supabase])

  // Erweiterte updateSettings mit Validierung
  const updateSettings = useCallback(async (updates: Partial<GameSettings>) => {
    try {
      let newSettings = {
        ...settings,
        ...updates
      }

      // Enforce team mode rules
      if (newSettings.teamMode || settings.teamMode) {
        if (!newSettings.lockout) {
          setErrorMessage('Team mode requires lockout to be enabled')
          return // Return early to prevent state update but keep error message
        }
        newSettings = {
          ...newSettings,
          teamMode: updates.teamMode ?? settings.teamMode,
          lockout: true, // Always enforce lockout in team mode
          boardSize: Math.max(4, newSettings.boardSize)
        }
      }

      // Handle time limit validation before general validation
      if (updates.timeLimit !== undefined) {
        if (updates.timeLimit > GAME_SETTINGS.TIME_LIMITS.MAX_TIME) {
          newSettings.timeLimit = GAME_SETTINGS.TIME_LIMITS.MAX_TIME
          setErrorMessage('Time limit cannot exceed maximum')
          setSettings(newSettings) // Update state with clamped value
          return
        } else if (updates.timeLimit < GAME_SETTINGS.TIME_LIMITS.MIN_TIME) {
          newSettings.timeLimit = GAME_SETTINGS.TIME_LIMITS.MIN_TIME
          setErrorMessage('Time limit cannot be less than minimum')
          setSettings(newSettings) // Update state with clamped value
          return
        }
      }

      // Validate settings
      const isValid = validateSettings(newSettings)
      if (!isValid) {
        return
      }

      // Update state
      setSettings(newSettings)
      setLastValidSettings(newSettings)
      setError(null) // Clear error after successful update

      // Persist settings
      if (!_boardId) {
        window.localStorage.setItem('lastGameSettings', JSON.stringify(newSettings))
      } else {
        await saveSettings(newSettings)
      }

      emitSettingsEvent('change', newSettings)
    } catch (err) {
      console.error('Error updating settings:', err)
      setError(new Error('Failed to update settings'))
      setSettings(lastValidSettings)
    }
  }, [settings, lastValidSettings, _boardId, saveSettings, validateSettings, emitSettingsEvent, setErrorMessage])

  // Event-Listener mit korrekter Typisierung
  useEffect(() => {
    const handleExternalSettingsChange = (event: SettingsChangeEvent) => {
      // Ignoriere eigene Events
      if (event.detail.source === 'user') return

      if (validateSettings(event.detail.settings)) {
        setSettings(event.detail.settings)
        setLastValidSettings(event.detail.settings)
      }
    }

    window.addEventListener('settingsChange', handleExternalSettingsChange)
    
    return () => {
      window.removeEventListener('settingsChange', handleExternalSettingsChange)
    }
  }, [validateSettings])

  // Cleanup und Persistenz
  useEffect(() => {
    if (!_boardId) {
      try {
        const savedSettings = window.localStorage.getItem('lastGameSettings')
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as GameSettings
          if (validateSettings(parsed)) {
            setSettings(parsed)
            setLastValidSettings(parsed)
          }
        }
      } catch (error) {
        console.error('Error loading local settings:', error)
      }
    }
  }, [_boardId, validateSettings])

  // Core Functions
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_GAME_SETTINGS)
    if (_boardId) {
      saveSettings(DEFAULT_GAME_SETTINGS).catch(err => {
        console.error('Error resetting settings:', err)
        setError(new Error('Failed to reset settings'))
      })
    }
  }, [_boardId, saveSettings])

  // Toggle Functions
  const toggleTeamMode = useCallback(async () => {
    const newSettings = {
      ...settings,
      teamMode: !settings.teamMode,
      lockout: !settings.teamMode // Force lockout when enabling team mode
    }
    await updateSettings(newSettings)
    emitSettingsEvent('modeSwitch', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  const toggleLockout = useCallback(async () => {
    if (!settings.teamMode) { // Only allow toggle if not in team mode
      await updateSettings({ lockout: !settings.lockout })
    }
  }, [settings.teamMode, settings.lockout, updateSettings])

  const toggleSound = useCallback(async () => {
    await updateSettings({ soundEnabled: !settings.soundEnabled })
  }, [settings, updateSettings])

  // Time Management
  const updateTimeLimit = useCallback(async (newLimit: number) => {
    await updateSettings({ timeLimit: newLimit })
  }, [updateSettings])

  // Update the return statement to include all functions
  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    toggleTeamMode,
    toggleLockout,
    toggleSound,
    toggleWinCondition: useCallback(async (condition: keyof GameSettings['winConditions']) => {
      await updateSettings({
        winConditions: {
          ...settings.winConditions,
          [condition]: !settings.winConditions[condition]
        }
      })
    }, [settings, updateSettings]),
    updateTimeLimit
  }
}
