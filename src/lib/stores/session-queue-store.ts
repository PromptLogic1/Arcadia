/**
 * Session Queue Store (Zustand)
 *
 * UI state management for session queue functionality.
 * Server data is handled by TanStack Query hooks.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

export interface SessionQueueState {
  // Modal and dialog states
  showInviteDialog: boolean;
  showQueueDialog: boolean;

  // Invite link state
  inviteLink: string;

  // Player form state (for joining queue)
  playerFormData: {
    playerName: string;
    color: string;
    team?: number;
  } | null;

  // UI feedback states
  isGeneratingLink: boolean;
  isCopyingLink: boolean;

  // Auto-refresh settings
  autoRefreshEnabled: boolean;
  refreshInterval: number;

  // Filter and sort options for queue display
  queueFilters: {
    showOnlyWaiting: boolean;
    sortBy: 'requested_at' | 'player_name' | 'status';
    sortOrder: 'asc' | 'desc';
  };
}

export interface SessionQueueActions {
  // Modal management
  setShowInviteDialog: (show: boolean) => void;
  setShowQueueDialog: (show: boolean) => void;

  // Invite link management
  setInviteLink: (link: string) => void;
  setIsGeneratingLink: (generating: boolean) => void;
  setIsCopyingLink: (copying: boolean) => void;
  generateInviteLink: (sessionId: string) => Promise<void>;
  copyInviteLink: () => Promise<boolean>;

  // Player form management
  setPlayerFormData: (data: SessionQueueState['playerFormData']) => void;
  updatePlayerFormField: (
    field: keyof NonNullable<SessionQueueState['playerFormData']>,
    value: string | number
  ) => void;
  resetPlayerForm: () => void;

  // Auto-refresh management
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Filter management
  setQueueFilters: (
    filters: Partial<SessionQueueState['queueFilters']>
  ) => void;
  resetQueueFilters: () => void;

  // Utility actions
  reset: () => void;
}

const initialState: SessionQueueState = {
  showInviteDialog: false,
  showQueueDialog: false,
  inviteLink: '',
  playerFormData: null,
  isGeneratingLink: false,
  isCopyingLink: false,
  autoRefreshEnabled: true,
  refreshInterval: 30000, // 30 seconds
  queueFilters: {
    showOnlyWaiting: false,
    sortBy: 'requested_at',
    sortOrder: 'asc',
  },
};

const useSessionQueueStore = createWithEqualityFn<
  SessionQueueState & SessionQueueActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Modal management
      setShowInviteDialog: show =>
        set({ showInviteDialog: show }, false, 'setShowInviteDialog'),

      setShowQueueDialog: show =>
        set({ showQueueDialog: show }, false, 'setShowQueueDialog'),

      // Invite link management
      setInviteLink: inviteLink => set({ inviteLink }, false, 'setInviteLink'),

      setIsGeneratingLink: isGeneratingLink =>
        set({ isGeneratingLink }, false, 'setIsGeneratingLink'),

      setIsCopyingLink: isCopyingLink =>
        set({ isCopyingLink }, false, 'setIsCopyingLink'),

      generateInviteLink: async (sessionId: string) => {
        set({ isGeneratingLink: true }, false, 'generateInviteLink_start');

        try {
          // Generate the invite link
          const baseUrl =
            typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : '';
          const link = `${baseUrl}/join/${sessionId}`;

          set(
            {
              inviteLink: link,
              showInviteDialog: true,
              isGeneratingLink: false,
            },
            false,
            'generateInviteLink_success'
          );
        } catch (error) {
          set({ isGeneratingLink: false }, false, 'generateInviteLink_error');
          throw error;
        }
      },

      copyInviteLink: async () => {
        const { inviteLink } = get();

        if (!inviteLink) {
          return false;
        }

        set({ isCopyingLink: true }, false, 'copyInviteLink_start');

        try {
          // Use modern clipboard API only
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(inviteLink);
            set({ isCopyingLink: false }, false, 'copyInviteLink_success');
            return true;
          } else {
            // If clipboard API is not available, return false
            // Let the UI handle alternative methods (e.g., showing a copyable text field)
            set(
              { isCopyingLink: false },
              false,
              'copyInviteLink_no_clipboard_api'
            );
            return false;
          }
        } catch {
          set({ isCopyingLink: false }, false, 'copyInviteLink_error');
          return false;
        }
      },

      // Player form management
      setPlayerFormData: playerFormData =>
        set({ playerFormData }, false, 'setPlayerFormData'),

      updatePlayerFormField: (field, value) =>
        set(
          state => ({
            playerFormData: state.playerFormData
              ? { ...state.playerFormData, [field]: value }
              : { playerName: '', color: '', [field]: value },
          }),
          false,
          'updatePlayerFormField'
        ),

      resetPlayerForm: () =>
        set({ playerFormData: null }, false, 'resetPlayerForm'),

      // Auto-refresh management
      setAutoRefreshEnabled: autoRefreshEnabled =>
        set({ autoRefreshEnabled }, false, 'setAutoRefreshEnabled'),

      setRefreshInterval: refreshInterval =>
        set({ refreshInterval }, false, 'setRefreshInterval'),

      // Filter management
      setQueueFilters: newFilters =>
        set(
          state => ({
            queueFilters: { ...state.queueFilters, ...newFilters },
          }),
          false,
          'setQueueFilters'
        ),

      resetQueueFilters: () =>
        set(
          { queueFilters: initialState.queueFilters },
          false,
          'resetQueueFilters'
        ),

      // Utility actions
      reset: () => set(initialState, false, 'reset'),
    }),
    {
      name: 'session-queue-store',
    }
  )
);

// Selectors for performance optimization
export const useSessionQueueState = () =>
  useSessionQueueStore(
    useShallow(state => ({
      showInviteDialog: state.showInviteDialog,
      showQueueDialog: state.showQueueDialog,
      inviteLink: state.inviteLink,
      playerFormData: state.playerFormData,
      isGeneratingLink: state.isGeneratingLink,
      isCopyingLink: state.isCopyingLink,
      autoRefreshEnabled: state.autoRefreshEnabled,
      refreshInterval: state.refreshInterval,
      queueFilters: state.queueFilters,
    }))
  );

export const useSessionQueueActions = () =>
  useSessionQueueStore(
    useShallow(state => ({
      setShowInviteDialog: state.setShowInviteDialog,
      setShowQueueDialog: state.setShowQueueDialog,
      setInviteLink: state.setInviteLink,
      setIsGeneratingLink: state.setIsGeneratingLink,
      setIsCopyingLink: state.setIsCopyingLink,
      generateInviteLink: state.generateInviteLink,
      copyInviteLink: state.copyInviteLink,
      setPlayerFormData: state.setPlayerFormData,
      updatePlayerFormField: state.updatePlayerFormField,
      resetPlayerForm: state.resetPlayerForm,
      setAutoRefreshEnabled: state.setAutoRefreshEnabled,
      setRefreshInterval: state.setRefreshInterval,
      setQueueFilters: state.setQueueFilters,
      resetQueueFilters: state.resetQueueFilters,
      reset: state.reset,
    }))
  );

export default useSessionQueueStore;
