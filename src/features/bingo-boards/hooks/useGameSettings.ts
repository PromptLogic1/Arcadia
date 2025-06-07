'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  useGameSettingsQuery,
  useUpdateGameSettings,
} from '@/hooks/queries/useGameSettingsQueries';
import {
  DEFAULT_BOARD_SETTINGS,
  useGameSettingsValidation,
} from '@/lib/stores/game-settings-store';
import { gameSettingsService } from '../../../services/game-settings.service';
import type { BoardSettings, WinConditions } from '@/types';
import { log } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { usePersistedState } from '@/hooks/usePersistedState';

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
  // Use persisted state for local settings
  const [localSettings, setLocalSettings] =
    usePersistedState<BoardSettings | null>('lastBoardSettings', null);

  // Server state via TanStack Query
  const {
    data: settingsResponse,
    isLoading,
    error: queryError,
  } = useGameSettingsQuery(boardId);
  const updateMutation = useUpdateGameSettings(boardId);

  // UI state via Zustand
  const { error: validationError, setError: setValidationError } =
    useGameSettingsValidation();

  // Derived state
  const settings = useMemo(() => {
    if (boardId && settingsResponse?.data) {
      return settingsResponse.data;
    }
    return localSettings || DEFAULT_BOARD_SETTINGS;
  }, [boardId, settingsResponse?.data, localSettings]);

  const loading = isLoading;
  const error = useMemo(() => {
    if (queryError || validationError) {
      return new Error(validationError || 'Failed to load settings');
    }
    return null;
  }, [queryError, validationError]);

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
        log.error('Error emitting settings event', error as Error, {
          metadata: { hook: 'useGameSettings', boardId },
        });
      }
    },
    [boardId]
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
        const validation = gameSettingsService.validateSettings(newSettings);
        if (!validation.valid) {
          setValidationError(validation.error || 'Invalid settings');
          return;
        }

        setValidationError(null);

        // Persist settings
        if (boardId) {
          await updateMutation.mutateAsync(newSettings);
        } else {
          // For non-board contexts, only save to localStorage
          setLocalSettings(newSettings);
          notifications.success('Settings saved locally');
        }

        emitSettingsEvent('change', newSettings);
      } catch (error: unknown) {
        log.error('Error updating settings', error as Error, {
          metadata: { hook: 'useGameSettings', boardId, updates },
        });

        if (error instanceof Error && error.name !== 'AbortError') {
          setValidationError(error.message);
        }
      }
    },
    [
      settings,
      emitSettingsEvent,
      boardId,
      updateMutation,
      setValidationError,
      setLocalSettings,
    ]
  );

  // Event-Listener for external changes
  useEffect(() => {
    const handleExternalSettingsChange = (event: SettingsChangeEvent) => {
      // Ignore own events
      if (event.detail.source === 'user') return;

      const validation = gameSettingsService.validateSettings(
        event.detail.settings
      );
      if (validation.valid) {
        // For external changes, we might need to update our cache
        // This is handled by TanStack Query's invalidation
        log.info('Received external settings change', {
          metadata: { settings: event.detail.settings },
        });
      }
    };

    window.addEventListener('settingsChange', handleExternalSettingsChange);

    return () => {
      window.removeEventListener(
        'settingsChange',
        handleExternalSettingsChange
      );
    };
  }, []);

  // Core Functions
  const resetSettings = useCallback(async () => {
    try {
      if (boardId) {
        await updateMutation.mutateAsync(DEFAULT_BOARD_SETTINGS);
      } else {
        setLocalSettings(DEFAULT_BOARD_SETTINGS);
        notifications.success('Settings reset to defaults');
      }

      emitSettingsEvent('reset', DEFAULT_BOARD_SETTINGS);
    } catch (error) {
      log.error('Error resetting settings', error as Error, {
        metadata: { hook: 'useGameSettings', boardId },
      });
    }
  }, [boardId, updateMutation, emitSettingsEvent, setLocalSettings]);

  // Toggle Functions
  const toggleTeamMode = useCallback(async () => {
    const newSettings: Partial<BoardSettings> = {
      team_mode: !settings.team_mode,
      lockout: !settings.team_mode || settings.lockout, // Force lockout when enabling team mode
    };
    await updateSettings(newSettings);
    emitSettingsEvent('modeSwitch', { ...settings, ...newSettings });
  }, [settings, updateSettings, emitSettingsEvent]);

  const toggleLockout = useCallback(async () => {
    if (!settings.team_mode) {
      // Only allow toggle if not in team mode
      await updateSettings({ lockout: !settings.lockout });
    } else {
      notifications.warning('Cannot disable lockout while in team mode');
    }
  }, [settings.team_mode, settings.lockout, updateSettings]);

  const toggleSound = useCallback(async () => {
    await updateSettings({ sound_enabled: !settings.sound_enabled });
  }, [settings.sound_enabled, updateSettings]);

  const toggleWinCondition = useCallback(
    async (condition: keyof WinConditions) => {
      const currentConditions = settings.win_conditions || {
        line: true,
        majority: false,
        diagonal: false,
        corners: false,
      };

      // Check if this would disable all win conditions
      const newConditions = {
        ...currentConditions,
        [condition]: !currentConditions[condition],
      };

      const hasActiveCondition = Object.values(newConditions).some(v => v);
      if (!hasActiveCondition) {
        notifications.error('At least one win condition must be active');
        return;
      }

      await updateSettings({
        win_conditions: newConditions,
      });
    },
    [settings.win_conditions, updateSettings]
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
