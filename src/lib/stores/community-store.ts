/**
 * Community Store (Zustand)
 *
 * UI state management for community functionality.
 * Server data (discussions, comments) is handled by TanStack Query hooks.
 * This store only manages UI-specific state.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Tables } from '@/types/database-generated';

// Re-export types for backward compatibility
export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;

// Mock events (until real events are implemented)
export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  game: string;
  prize: string;
  participants: number;
  maxParticipants: number;
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
}

interface CommunityState {
  // UI state only - no server data!
  selectedDiscussion: Discussion | null;

  // UI loading and error states (separate from TanStack Query states)
  uiLoading: boolean;
  uiError: string | null;

  // Filters for client-side filtering and search
  filters: {
    game: string | null;
    challengeType: string | null;
    tags: string[];
    searchTerm: string;
  };

  // Modal and dialog states
  showCreateDiscussionDialog: boolean;
  showDiscussionDetailsDialog: boolean;

  // Form states
  createDiscussionForm: {
    title: string;
    content: string;
    tags: string[];
    game: string | null;
  } | null;

  // Events (mock data - will be moved to TanStack Query when real)
  events: Event[];

  // New state slice for real event filters
  eventFilters: {
    game: string | null;
    status: string | null;
    tags: string[];
    searchTerm: string;
  };
}

interface CommunityActions {
  // Selected discussion management
  setSelectedDiscussion: (discussion: Discussion | null) => void;

  // UI loading and error management
  setUiLoading: (loading: boolean) => void;
  setUiError: (error: string | null) => void;

  // Filter management
  setFilters: (filters: Partial<CommunityState['filters']>) => void;
  clearFilters: () => void;

  // Modal management
  setShowCreateDiscussionDialog: (show: boolean) => void;
  setShowDiscussionDetailsDialog: (show: boolean) => void;

  // Form management
  setCreateDiscussionForm: (
    form: CommunityState['createDiscussionForm']
  ) => void;
  updateCreateDiscussionField: (
    field: keyof NonNullable<CommunityState['createDiscussionForm']>,
    value: string | string[] | null
  ) => void;
  resetCreateDiscussionForm: () => void;

  // Events management (mock data)
  setEvents: (events: Event[]) => void;
  addEvent: (event: Omit<Event, 'id' | 'participants'>) => void;
  updateEventParticipants: (eventId: number, delta: number) => void;

  // Utility
  reset: () => void;
}

interface CommunityEventsActions {
  setEventFilters: (filters: Partial<CommunityState['eventFilters']>) => void;
  clearEventFilters: () => void;
}

const initialState: CommunityState = {
  selectedDiscussion: null,
  uiLoading: false,
  uiError: null,
  filters: {
    game: null,
    challengeType: null,
    tags: [],
    searchTerm: '',
  },
  showCreateDiscussionDialog: false,
  showDiscussionDetailsDialog: false,
  createDiscussionForm: null,
  events: [], // TODO: Replace with TanStack Query hook once real community API is implemented
  eventFilters: {
    game: null,
    status: null,
    tags: [],
    searchTerm: '',
  },
};

export const useCommunityStore = createWithEqualityFn<
  CommunityState & CommunityActions & CommunityEventsActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Selected discussion management
      setSelectedDiscussion: selectedDiscussion =>
        set({ selectedDiscussion }, false, 'community/setSelectedDiscussion'),

      // UI loading and error management
      setUiLoading: uiLoading =>
        set({ uiLoading }, false, 'community/setUiLoading'),

      setUiError: uiError => set({ uiError }, false, 'community/setUiError'),

      // Filter management
      setFilters: newFilters => {
        const { filters } = get();
        set(
          { filters: { ...filters, ...newFilters } },
          false,
          'community/setFilters'
        );
      },

      clearFilters: () =>
        set({ filters: initialState.filters }, false, 'community/clearFilters'),

      // Modal management
      setShowCreateDiscussionDialog: show =>
        set(
          { showCreateDiscussionDialog: show },
          false,
          'community/setShowCreateDiscussionDialog'
        ),

      setShowDiscussionDetailsDialog: show =>
        set(
          { showDiscussionDetailsDialog: show },
          false,
          'community/setShowDiscussionDetailsDialog'
        ),

      // Form management
      setCreateDiscussionForm: createDiscussionForm =>
        set(
          { createDiscussionForm },
          false,
          'community/setCreateDiscussionForm'
        ),

      updateCreateDiscussionField: (field, value) =>
        set(
          state => ({
            createDiscussionForm: state.createDiscussionForm
              ? { ...state.createDiscussionForm, [field]: value }
              : {
                  title: '',
                  content: '',
                  tags: [],
                  game: null,
                  [field]: value,
                },
          }),
          false,
          'community/updateCreateDiscussionField'
        ),

      resetCreateDiscussionForm: () =>
        set(
          { createDiscussionForm: null },
          false,
          'community/resetCreateDiscussionForm'
        ),

      // Events management (mock data - will be moved to TanStack Query when real)
      setEvents: events => set({ events }, false, 'community/setEvents'),

      addEvent: event => {
        const { events } = get();
        const newEvent: Event = {
          ...event,
          id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
          participants: 0,
        };
        set({ events: [...events, newEvent] }, false, 'community/addEvent');
      },

      updateEventParticipants: (eventId, delta) => {
        const { events } = get();
        set(
          {
            events: events.map(event =>
              event.id === eventId
                ? {
                    ...event,
                    participants: Math.max(0, event.participants + delta),
                  }
                : event
            ),
          },
          false,
          'community/updateEventParticipants'
        );
      },

      // Event filter management
      setEventFilters: newFilters => {
        const { eventFilters } = get();
        set(
          { eventFilters: { ...eventFilters, ...newFilters } },
          false,
          'community/setEventFilters'
        );
      },

      clearEventFilters: () =>
        set(
          { eventFilters: initialState.eventFilters },
          false,
          'community/clearEventFilters'
        ),

      // Utility
      reset: () => set(initialState, false, 'community/reset'),
    }),
    {
      name: 'community-store',
    }
  )
);

// Selectors for UI state only
export const useCommunityState = () =>
  useCommunityStore(
    useShallow(state => ({
      selectedDiscussion: state.selectedDiscussion,
      uiLoading: state.uiLoading,
      uiError: state.uiError,
      filters: state.filters,
      events: state.events,
    }))
  );

export const useCommunityEventsState = () =>
  useCommunityStore(
    useShallow(state => ({
      filters: state.eventFilters,
    }))
  );

export const useCommunityModals = () =>
  useCommunityStore(
    useShallow(state => ({
      showCreateDiscussionDialog: state.showCreateDiscussionDialog,
      showDiscussionDetailsDialog: state.showDiscussionDetailsDialog,
    }))
  );

export const useCommunityForm = () =>
  useCommunityStore(
    useShallow(state => ({
      createDiscussionForm: state.createDiscussionForm,
    }))
  );

export const useCommunityActions = () =>
  useCommunityStore(
    useShallow(state => ({
      // Selected discussion management
      setSelectedDiscussion: state.setSelectedDiscussion,

      // UI loading and error management
      setUiLoading: state.setUiLoading,
      setUiError: state.setUiError,

      // Filter management
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,

      // Modal management
      setShowCreateDiscussionDialog: state.setShowCreateDiscussionDialog,
      setShowDiscussionDetailsDialog: state.setShowDiscussionDetailsDialog,

      // Form management
      setCreateDiscussionForm: state.setCreateDiscussionForm,
      updateCreateDiscussionField: state.updateCreateDiscussionField,
      resetCreateDiscussionForm: state.resetCreateDiscussionForm,

      // Events management (mock data)
      setEvents: state.setEvents,
      addEvent: state.addEvent,
      updateEventParticipants: state.updateEventParticipants,

      // Utility
      reset: state.reset,
    }))
  );

export const useCommunityEventsActions = () =>
  useCommunityStore(
    useShallow(state => ({
      setFilters: state.setEventFilters,
      clearFilters: state.clearEventFilters,
    }))
  );

// Backward compatibility selector (deprecated - use specific selectors above)
export const useCommunity = () =>
  useCommunityStore(
    useShallow(state => ({
      // State
      selectedDiscussion: state.selectedDiscussion,
      uiLoading: state.uiLoading,
      uiError: state.uiError,
      filters: state.filters,
      eventFilters: state.eventFilters,
      showCreateDiscussionDialog: state.showCreateDiscussionDialog,
      showDiscussionDetailsDialog: state.showDiscussionDetailsDialog,
      createDiscussionForm: state.createDiscussionForm,
      events: state.events,

      // Actions
      setSelectedDiscussion: state.setSelectedDiscussion,
      setUiLoading: state.setUiLoading,
      setUiError: state.setUiError,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
      setShowCreateDiscussionDialog: state.setShowCreateDiscussionDialog,
      setShowDiscussionDetailsDialog: state.setShowDiscussionDetailsDialog,
      setCreateDiscussionForm: state.setCreateDiscussionForm,
      updateCreateDiscussionField: state.updateCreateDiscussionField,
      resetCreateDiscussionForm: state.resetCreateDiscussionForm,
      setEventFilters: state.setEventFilters,
      clearEventFilters: state.clearEventFilters,
      reset: state.reset,
    }))
  );
