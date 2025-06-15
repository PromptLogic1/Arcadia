import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { BoardSettings } from '@/types';

// Default settings aligned with database structure
export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
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

interface GameSettingsUIState {
  // UI state only - server data comes from TanStack Query
  isSettingsModalOpen: boolean;
  pendingChanges: Partial<BoardSettings> | null;
  validationError: string | null;
  lastSavedAt: number | null;
}

interface GameSettingsUIActions {
  // Modal management
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Pending changes management
  setPendingChanges: (changes: Partial<BoardSettings> | null) => void;
  updatePendingChange: <K extends keyof BoardSettings>(
    key: K,
    value: BoardSettings[K]
  ) => void;
  clearPendingChanges: () => void;

  // Validation
  setValidationError: (error: string | null) => void;

  // Tracking
  setLastSavedAt: (timestamp: number) => void;

  // Reset
  reset: () => void;
}

type GameSettingsStore = GameSettingsUIState & GameSettingsUIActions;

const initialState: GameSettingsUIState = {
  isSettingsModalOpen: false,
  pendingChanges: null,
  validationError: null,
  lastSavedAt: null,
};

export const useGameSettingsStore = createWithEqualityFn<GameSettingsStore>()(
  devtools(
    set => ({
      ...initialState,

      // Modal management
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () =>
        set({
          isSettingsModalOpen: false,
          pendingChanges: null,
          validationError: null,
        }),

      // Pending changes management
      setPendingChanges: changes =>
        set({
          pendingChanges: changes,
          validationError: null,
        }),

      updatePendingChange: (key, value) =>
        set(state => ({
          pendingChanges: {
            ...state.pendingChanges,
            [key]: value,
          },
        })),

      clearPendingChanges: () =>
        set({
          pendingChanges: null,
          validationError: null,
        }),

      // Validation
      setValidationError: error => set({ validationError: error }),

      // Tracking
      setLastSavedAt: timestamp => set({ lastSavedAt: timestamp }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'game-settings-ui',
    }
  )
);

// Selectors
export const useGameSettingsModal = () =>
  useGameSettingsStore(
    useShallow(state => ({
      isOpen: state.isSettingsModalOpen,
      open: state.openSettingsModal,
      close: state.closeSettingsModal,
    }))
  );

export const useGameSettingsPendingChanges = () =>
  useGameSettingsStore(
    useShallow(state => ({
      pendingChanges: state.pendingChanges,
      setPendingChanges: state.setPendingChanges,
      updatePendingChange: state.updatePendingChange,
      clearPendingChanges: state.clearPendingChanges,
    }))
  );

export const useGameSettingsValidation = () =>
  useGameSettingsStore(
    useShallow(state => ({
      error: state.validationError,
      setError: state.setValidationError,
    }))
  );
