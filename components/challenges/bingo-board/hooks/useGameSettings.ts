'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

// Event-System Typen
interface SettingsChangeEventDetail {
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

/**
 * Interface für die Spieleinstellungen
 * @property teamMode - Aktiviert Team-basiertes Spielen
 * @property lockout - Verhindert mehrfache Markierungen der gleichen Zelle
 * @property soundEnabled - Aktiviert Sound-Effekte
 * @property winConditions - Definiert die Siegbedingungen
 * @property timeLimit - Zeitlimit in Sekunden
 */
interface GameSettings {
  teamMode: boolean
  lockout: boolean
  soundEnabled: boolean
  winConditions: {
    line: boolean
    majority: boolean
  }
  timeLimit: number
}

/**
 * Standard-Einstellungen für ein neues Spiel
 */
const DEFAULT_SETTINGS: GameSettings = {
  teamMode: false,
  lockout: true,
  soundEnabled: true,
  winConditions: {
    line: true,
    majority: false
  },
  timeLimit: 300 // 5 minutes
}

/**
 * Interface für den useGameSettings Hook
 */
interface UseGameSettings {
  // States
  settings: GameSettings
  loading: boolean
  error: string | null

  // Core Functions
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>
  resetSettings: () => void

  // Toggle Functions
  toggleTeamMode: () => Promise<void>
  toggleLockout: () => Promise<void>
  toggleSound: () => Promise<void>
  toggleWinCondition: (type: keyof GameSettings['winConditions']) => Promise<void>

  // Time Management
  updateTimeLimit: (seconds: number) => Promise<void>
}

/**
 * Hook für die Verwaltung von Spieleinstellungen
 * 
 * @param boardId - Optional. ID des Bingo-Boards für DB-Persistenz
 * @returns UseGameSettings Interface mit allen Funktionen und States
 * 
 * @example
 * ```tsx
 * const { 
 *   settings, 
 *   updateSettings,
 *   toggleTeamMode 
 * } = useGameSettings('board-123')
 * 
 * // Einstellungen aktualisieren
 * await updateSettings({ teamMode: true, lockout: true })
 * 
 * // Team-Modus umschalten
 * await toggleTeamMode()
 * ```
 */
export const useGameSettings = (boardId?: string): UseGameSettings => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastValidSettings, setLastValidSettings] = useState<GameSettings>(DEFAULT_SETTINGS)

  const supabase = createClientComponentClient<Database>()

  // Konsistenzprüfung
  const validateSettings = useCallback((newSettings: GameSettings): boolean => {
    try {
      // Mindestens eine Win-Condition muss aktiv sein
      if (!newSettings.winConditions.line && !newSettings.winConditions.majority) {
        return false
      }

      // Team-Mode Validierungen
      if (newSettings.teamMode) {
        // Lockout muss im Team-Modus aktiv sein
        if (!newSettings.lockout) {
          return false
        }
      }

      // Zeit-Validierung
      if (newSettings.timeLimit < 60 || newSettings.timeLimit > 3600) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating settings:', error)
      return false
    }
  }, [])

  // Event-Handling mit verbesserter Typisierung
  const emitSettingsChange = useCallback((newSettings: GameSettings) => {
    try {
      const event = new CustomEvent<SettingsChangeEventDetail>('settingsChange', { 
        detail: {
          settings: newSettings,
          source: 'user',
          timestamp: Date.now()
        },
        bubbles: true
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Error emitting settings change:', error)
    }
  }, [])

  // Lade gespeicherte Einstellungen
  useEffect(() => {
    const loadSettings = async () => {
      if (!boardId) {
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bingo_boards')
          .select('settings')
          .eq('id', boardId)
          .single()

        if (fetchError) throw fetchError

        if (data?.settings) {
          setSettings(data.settings as GameSettings)
        }
        
        setError(null)
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [boardId, supabase])

  // Speichere Einstellungen in der Datenbank
  const saveSettings = useCallback(async (newSettings: GameSettings) => {
    if (!boardId) return

    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update({ settings: newSettings })
        .eq('id', boardId)

      if (updateError) throw updateError
      
      setError(null)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
      throw err
    }
  }, [boardId, supabase])

  // Erweiterte updateSettings mit Validierung
  const updateSettings = useCallback(async (updates: Partial<GameSettings>) => {
    try {
      const newSettings = {
        ...settings,
        ...updates
      }
      
      // Validiere neue Einstellungen
      if (!validateSettings(newSettings)) {
        setError('Invalid settings configuration')
        return
      }
      
      setSettings(newSettings)
      setLastValidSettings(newSettings)
      await saveSettings(newSettings)
      emitSettingsChange(newSettings)
      setError(null)
    } catch (err) {
      console.error('Error updating settings:', err)
      setError('Failed to update settings')
      // Rollback zu letzten validen Einstellungen
      setSettings(lastValidSettings)
    }
  }, [settings, lastValidSettings, saveSettings, validateSettings, emitSettingsChange])

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

    if (!boardId) {
      loadLocalSettings()
    }

    // Cleanup-Funktion
    return () => {
      if (settings !== DEFAULT_SETTINGS) {
        try {
          localStorage.setItem('lastGameSettings', JSON.stringify(settings))
        } catch (error) {
          console.error('Error saving local settings:', error)
        }
      }
    }
  }, [boardId, settings, validateSettings])

  // Core Functions
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    if (boardId) {
      saveSettings(DEFAULT_SETTINGS).catch(err => {
        console.error('Error resetting settings:', err)
        setError('Failed to reset settings')
      })
    }
  }, [boardId, saveSettings])

  // Toggle Functions
  const toggleTeamMode = useCallback(async () => {
    await updateSettings({ teamMode: !settings.teamMode })
  }, [settings.teamMode, updateSettings])

  const toggleLockout = useCallback(async () => {
    await updateSettings({ lockout: !settings.lockout })
  }, [settings.lockout, updateSettings])

  const toggleSound = useCallback(async () => {
    await updateSettings({ soundEnabled: !settings.soundEnabled })
  }, [settings.soundEnabled, updateSettings])

  const toggleWinCondition = useCallback(async (type: keyof GameSettings['winConditions']) => {
    await updateSettings({
      winConditions: {
        ...settings.winConditions,
        [type]: !settings.winConditions[type]
      }
    })
  }, [settings.winConditions, updateSettings])

  // Time Management
  const updateTimeLimit = useCallback(async (seconds: number) => {
    const validSeconds = Math.max(60, Math.min(3600, seconds)) // 1 min to 1 hour
    await updateSettings({ timeLimit: validSeconds })
  }, [updateSettings])

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
