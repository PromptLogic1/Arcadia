'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { BoardSettings, WinConditions } from '@/types';
import { log } from '@/lib/logger';

// Default settings aligned with database structure
const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  team_mode: false,
  lockout: false,
  sound_enabled: true,
  win_conditions: {
    line: true,
    majority: false,
    diagonal: false,
    corners: false,
  },
};

// Event-System Types
interface SettingsChangeEventDetail {
  type: 'change' | 'reset' | 'modeSwitch';
  settings: BoardSettings;
  source: 'user' | 'system';
  timestamp: number;
}

type SettingsChangeEvent = CustomEvent<SettingsChangeEventDetail>;

declare global {
  interface WindowEventMap {
    settingsChange: SettingsChangeEvent;
  }
}

// Add return type interface
interface UseGameSettingsReturn {
  settings: BoardSettings;
  loading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<BoardSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  toggleTeamMode: () => Promise<void>;
  toggleLockout: () => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleWinCondition: (condition: keyof WinConditions) => Promise<void>;
}

export const useGameSettings = (boardId: string): UseGameSettingsReturn => {
  const [settings, setSettings] = useState<BoardSettings>(
    DEFAULT_BOARD_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!boardId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bingo_boards')
          .select('settings')
          .eq('id', boardId)
          .single();

        if (fetchError) {
          log.error('Fetch error:', fetchError, {
            metadata: { hook: 'useGameSettings', boardId },
          });
          throw new Error('Failed to load settings');
        }

        if (data?.settings) {
          setSettings(data.settings);
        } else {
          // If no settings exist, use defaults
          setSettings(DEFAULT_BOARD_SETTINGS);
        }

        setError(null);
      } catch (err) {
        log.error('Error loading settings:', err as Error, {
          metadata: { hook: 'useGameSettings', boardId },
        });
        // Still use default settings even if there's an error
        setSettings(DEFAULT_BOARD_SETTINGS);
        setError(
          err instanceof Error ? err : new Error('Failed to load settings')
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [boardId, supabase]);

  // Error Handling
  const setErrorMessage = useCallback((message: string) => {
    setError(new Error(message));
  }, []);

  // Validation for database settings
  const validateSettings = useCallback(
    (newSettings: BoardSettings): boolean => {
      try {
        // Team mode requires lockout
        if (newSettings.team_mode && !newSettings.lockout) {
          setErrorMessage('Team mode requires lockout to be enabled');
          return false;
        }

        // At least one win condition must be active
        const winConditions = newSettings.win_conditions;
        if (
          !winConditions?.line &&
          !winConditions?.majority &&
          !winConditions?.diagonal &&
          !winConditions?.corners
        ) {
          setErrorMessage('At least one win condition must be active');
          return false;
        }

        setError(null);
        return true;
      } catch (error) {
        log.error('Error validating settings:', error as Error, {
          metadata: { hook: 'useGameSettings', boardId, newSettings },
        });
        return false;
      }
    },
    [setErrorMessage, setError, boardId]
  );

  // Event-Handling with all event types
  const emitSettingsEvent = useCallback(
    (type: 'change' | 'reset' | 'modeSwitch', newSettings: BoardSettings) => {
      try {
        const event = new CustomEvent<SettingsChangeEventDetail>(
          'settingsChange',
          {
            detail: {
              type,
              settings: newSettings,
              source: 'user',
              timestamp: Date.now(),
            },
            bubbles: true,
          }
        );
        window.dispatchEvent(event);
      } catch (error) {
        log.error('Error emitting settings event:', error as Error, {
          metadata: { hook: 'useGameSettings', boardId },
        });
      }
    },
    [boardId]
  );

  // Save settings to database
  const saveSettings = useCallback(
    async (newSettings: BoardSettings) => {
      if (!boardId) return;

      try {
        const { error: updateError } = await supabase
          .from('bingo_boards')
          .update({ settings: newSettings })
          .eq('id', boardId);

        if (updateError) throw updateError;

        setError(null);
      } catch (err) {
        log.error('Error saving settings:', err as Error, {
          metadata: { hook: 'useGameSettings', boardId, newSettings },
        });
        setError(new Error('Failed to save settings'));
        throw err;
      }
    },
    [boardId, supabase]
  );

  // Update settings with validation
  const updateSettings = useCallback(
    async (updates: Partial<BoardSettings>) => {
      try {
        let newSettings = {
          ...settings,
          ...updates,
        };

        // Enforce team mode rules
        if (newSettings.team_mode) {
          newSettings = {
            ...newSettings,
            lockout: true, // Force lockout when enabling team mode
          };
        }

        // Validate settings
        const isValid = validateSettings(newSettings);
        if (!isValid) {
          return;
        }

        // Update state
        setSettings(newSettings);
        setError(null);

        // Persist settings
        if (boardId) {
          await saveSettings(newSettings);
        } else {
          window.localStorage.setItem(
            'lastBoardSettings',
            JSON.stringify(newSettings)
          );
        }

        emitSettingsEvent('change', newSettings);
      } catch (err) {
        log.error('Error updating settings:', err as Error, {
          metadata: { hook: 'useGameSettings', boardId, updates },
        });
        setError(new Error('Failed to update settings'));
      }
    },
    [settings, validateSettings, emitSettingsEvent, boardId, saveSettings]
  );

  // Event-Listener
  useEffect(() => {
    const handleExternalSettingsChange = (event: SettingsChangeEvent) => {
      // Ignore own events
      if (event.detail.source === 'user') return;

      if (validateSettings(event.detail.settings)) {
        setSettings(event.detail.settings);
      }
    };

    window.addEventListener('settingsChange', handleExternalSettingsChange);

    return () => {
      window.removeEventListener(
        'settingsChange',
        handleExternalSettingsChange
      );
    };
  }, [validateSettings]);

  // Load from localStorage
  useEffect(() => {
    if (!boardId) {
      try {
        const savedSettings = window.localStorage.getItem('lastBoardSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as BoardSettings;
          if (validateSettings(parsed)) {
            setSettings(parsed);
          }
        }
      } catch (error) {
        log.error('Error loading local settings:', error as Error, {
          metadata: {
            hook: 'useGameSettings',
            boardId,
            storageKey: 'lastBoardSettings',
          },
        });
      }
    }
  }, [boardId, validateSettings]);

  // Core Functions
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_BOARD_SETTINGS);
    if (boardId) {
      saveSettings(DEFAULT_BOARD_SETTINGS).catch(err => {
        log.error('Error resetting settings:', err as Error, {
          metadata: { hook: 'useGameSettings', boardId },
        });
        setError(new Error('Failed to reset settings'));
      });
    }
  }, [boardId, saveSettings]);

  // Toggle Functions
  const toggleTeamMode = useCallback(async () => {
    const newSettings = {
      ...settings,
      team_mode: !settings.team_mode,
      lockout: !settings.team_mode || settings.lockout, // Force lockout when enabling team mode
    };
    await updateSettings(newSettings);
    emitSettingsEvent('modeSwitch', newSettings);
  }, [settings, updateSettings, emitSettingsEvent]);

  const toggleLockout = useCallback(async () => {
    if (!settings.team_mode) {
      // Only allow toggle if not in team mode
      await updateSettings({ lockout: !settings.lockout });
    }
  }, [settings.team_mode, settings.lockout, updateSettings]);

  const toggleSound = useCallback(async () => {
    await updateSettings({ sound_enabled: !settings.sound_enabled });
  }, [settings, updateSettings]);

  const toggleWinCondition = useCallback(
    async (condition: keyof WinConditions) => {
      const currentConditions = settings.win_conditions || {
        line: null,
        majority: null,
        diagonal: null,
        corners: null,
      };
      await updateSettings({
        win_conditions: {
          ...currentConditions,
          [condition]: !currentConditions[condition],
        },
      });
    },
    [settings, updateSettings]
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    toggleTeamMode,
    toggleLockout,
    toggleSound,
    toggleWinCondition,
  };
};
