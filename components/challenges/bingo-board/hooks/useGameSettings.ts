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

interface UseGameSettings {
  // States
  settings: GameSettings
  loading: boolean
  error: Error | null

  // Core Functions
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>
  resetSettings: () => Promise<void>

  // Toggle Functions
  toggleTeamMode: () => Promise<void>
  toggleLockout: () => Promise<void>
  toggleSound: () => Promise<void>
  toggleWinCondition: (type: keyof GameSettings['winConditions']) => Promise<void>

  // Time Management
  updateTimeLimit: (seconds: number) => Promise<void>
}

export const useGameSettings = (_boardId: string): UseGameSettings => {
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
      // Regelkonflikte
      if (newSettings.teamMode && !newSettings.lockout) {
        return false // Lockout muss im Team-Modus aktiv sein
      }

      // Mindestens eine Siegbedingung muss aktiv sein
      if (!newSettings.winConditions.line && !newSettings.winConditions.majority) {
        return false
      }

      // Spielmodus-Kompatibilität
      if (newSettings.teamMode && newSettings.boardSize < 4) {
        return false // Team-Modus braucht mindestens 4x4 Board
      }

      // Zeit-Validierung
      if (newSettings.timeLimit < GAME_SETTINGS.TIME_LIMITS.MIN_TIME || 
          newSettings.timeLimit > GAME_SETTINGS.TIME_LIMITS.MAX_TIME) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating settings:', error)
      return false
    }
  }, [])

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
      const newSettings = {
        ...settings,
        ...updates
      }
      
      // Validiere neue Einstellungen
      if (!validateSettings(newSettings)) {
        setError(new Error('Invalid settings configuration'))
        return
      }
      
      setSettings(newSettings)
      setLastValidSettings(newSettings)
      await saveSettings(newSettings)
      emitSettingsEvent('change', newSettings)
      setError(null)
    } catch (err) {
      console.error('Error updating settings:', err)
      setError(new Error('Failed to update settings'))
      // Rollback zu letzten validen Einstellungen
      setSettings(lastValidSettings)
    }
  }, [settings, lastValidSettings, saveSettings, validateSettings, emitSettingsEvent])

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
    // Lade gespeicherte Settings beim Start
    const loadLocalSettings = () => {
      try {
        const savedSettings = localStorage.getItem('lastGameSettings')
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

    if (!_boardId) {
      loadLocalSettings()
    }

    // Cleanup-Funktion
    return () => {
      if (settings !== DEFAULT_GAME_SETTINGS) {
        try {
          localStorage.setItem('lastGameSettings', JSON.stringify(settings))
        } catch (error) {
          console.error('Error saving local settings:', error)
        }
      }
    }
  }, [_boardId, settings, validateSettings])

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
      lockout: !settings.teamMode // Aktiviere Lockout wenn Team Mode aktiviert wird
    }
    await updateSettings(newSettings)
    emitSettingsEvent('modeSwitch', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  const toggleLockout = useCallback(async () => {
    const newSettings = {
      ...settings,
      lockout: !settings.lockout
    }
    await updateSettings(newSettings)
    emitSettingsEvent('change', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  const toggleSound = useCallback(async () => {
    const newSettings = {
      ...settings,
      soundEnabled: !settings.soundEnabled
    }
    await updateSettings(newSettings)
    emitSettingsEvent('change', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  const toggleWinCondition = useCallback(async (type: keyof GameSettings['winConditions']) => {
    const newSettings = {
      ...settings,
      winConditions: {
        ...settings.winConditions,
        [type]: !settings.winConditions[type]
      }
    }
    await updateSettings(newSettings)
    emitSettingsEvent('change', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  // Time Management
  const updateTimeLimit = useCallback(async (seconds: number) => {
    const validSeconds = Math.max(GAME_SETTINGS.TIME_LIMITS.MIN_TIME, Math.min(GAME_SETTINGS.TIME_LIMITS.MAX_TIME, seconds))
    const newSettings = {
      ...settings,
      timeLimit: validSeconds
    }
    await updateSettings(newSettings)
    emitSettingsEvent('change', newSettings)
  }, [settings, updateSettings, emitSettingsEvent])

  return {
    // States
    settings,
    loading,
    error,

    // Core Functions
    updateSettings,
    resetSettings,

    // Toggle Functions
    toggleTeamMode,
    toggleLockout,
    toggleSound,
    toggleWinCondition,

    // Time Management
    updateTimeLimit
  }
}
