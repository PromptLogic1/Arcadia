/**
 * Sessions Store (Zustand)
 *
 * State-only store for session management.
 * Data fetching is handled by TanStack Query hooks.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  SessionFilters,
  BingoSession,
} from '../../services/sessions.service';

export interface SessionState {
  // Current session
  currentSession: BingoSession | null;
  currentSessionId: string | null;

  // UI states
  showHostDialog: boolean;
  showJoinDialog: boolean;
  joinSessionCode: string;

  // Filters (local state)
  filters: SessionFilters;
}

export interface SessionActions {
  // Session management
  setCurrentSession: (session: BingoSession | null) => void;
  setCurrentSessionId: (sessionId: string | null) => void;

  // UI state management
  setShowHostDialog: (show: boolean) => void;
  setShowJoinDialog: (show: boolean) => void;
  setJoinSessionCode: (code: string) => void;

  // Filter management
  setFilters: (filters: Partial<SessionFilters>) => void;
  resetFilters: () => void;

  // Cleanup
  reset: () => void;
}

const initialState: SessionState = {
  currentSession: null,
  currentSessionId: null,
  showHostDialog: false,
  showJoinDialog: false,
  joinSessionCode: '',
  filters: {
    search: '',
    gameCategory: undefined,
    difficulty: undefined,
    status: undefined,
    showPrivate: false,
  },
};

const useSessionsStore = createWithEqualityFn<SessionState & SessionActions>()(
  devtools(
    set => ({
      ...initialState,

      // Session management
      setCurrentSession: session =>
        set({ currentSession: session }, false, 'setCurrentSession'),

      setCurrentSessionId: sessionId =>
        set({ currentSessionId: sessionId }, false, 'setCurrentSessionId'),

      // UI state management
      setShowHostDialog: show =>
        set({ showHostDialog: show }, false, 'setShowHostDialog'),

      setShowJoinDialog: show =>
        set({ showJoinDialog: show }, false, 'setShowJoinDialog'),

      setJoinSessionCode: code =>
        set({ joinSessionCode: code }, false, 'setJoinSessionCode'),

      // Filter management
      setFilters: newFilters =>
        set(
          state => ({
            filters: { ...state.filters, ...newFilters },
          }),
          false,
          'setFilters'
        ),

      resetFilters: () =>
        set({ filters: initialState.filters }, false, 'resetFilters'),

      // Cleanup
      reset: () => set(initialState, false, 'reset'),
    }),
    {
      name: 'sessions-store',
    }
  )
);

// Selectors
export const useSessionsState = () =>
  useSessionsStore(
    useShallow(state => ({
      currentSession: state.currentSession,
      currentSessionId: state.currentSessionId,
      showHostDialog: state.showHostDialog,
      showJoinDialog: state.showJoinDialog,
      joinSessionCode: state.joinSessionCode,
      filters: state.filters,
    }))
  );

export const useSessionsActions = () =>
  useSessionsStore(
    useShallow(state => ({
      setCurrentSession: state.setCurrentSession,
      setCurrentSessionId: state.setCurrentSessionId,
      setShowHostDialog: state.setShowHostDialog,
      setShowJoinDialog: state.setShowJoinDialog,
      setJoinSessionCode: state.setJoinSessionCode,
      setFilters: state.setFilters,
      resetFilters: state.resetFilters,
      reset: state.reset,
    }))
  );

export default useSessionsStore;
