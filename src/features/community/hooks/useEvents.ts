/**
 * Events Hook - Modern Implementation
 *
 * Uses the established Zustand pattern for state management.
 * Currently manages mock data via Zustand store.
 * Will be refactored to use TanStack Query when real API is implemented.
 */

import { useEffect, useRef } from 'react';
import {
  useCommunityState,
  useCommunityActions,
} from '@/lib/stores/community-store';
import { MOCK_EVENTS } from '../constants';

export const useEvents = () => {
  const { events } = useCommunityState();
  const { setEvents, addEvent, updateEventParticipants } =
    useCommunityActions();

  // Track if we've initialized to avoid dependency issues
  const hasInitializedRef = useRef(false);

  // Initialize with mock data on mount - only once
  useEffect(() => {
    // Only initialize once, regardless of state changes
    if (!hasInitializedRef.current && events.length === 0) {
      hasInitializedRef.current = true;
      setEvents(MOCK_EVENTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount, ref handles state tracking

  return {
    events,
    addEvent,
    updateParticipants: updateEventParticipants,
  };
};
