/**
 * Events Hook - Modern Implementation
 * 
 * Uses the established Zustand pattern for state management.
 * Currently manages mock data via Zustand store.
 * Will be refactored to use TanStack Query when real API is implemented.
 */

import { useEffect } from 'react';
import { useCommunityState, useCommunityActions } from '@/lib/stores/community-store';
import { MOCK_EVENTS } from '../constants';

export const useEvents = () => {
  const { events } = useCommunityState();
  const { setEvents, addEvent, updateEventParticipants } = useCommunityActions();
  
  // Initialize with mock data on mount
  useEffect(() => {
    // Only run initialization once
    // Using a flag to ensure single execution
    let mounted = true;
    
    if (mounted && events.length === 0) {
      setEvents(MOCK_EVENTS);
    }
    
    return () => {
      mounted = false;
    };
  }, [events.length, setEvents]);
  
  return {
    events,
    addEvent,
    updateParticipants: updateEventParticipants,
  };
};