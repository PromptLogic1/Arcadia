'use client';

import { useState, useCallback } from 'react';
import type { Event } from '@/src/lib/stores/community-store';
import { MOCK_EVENTS } from '../shared/constants';

export const useEvents = () => {
  const [events, setEvents] = useState<readonly Event[]>(MOCK_EVENTS);

  const addEvent = useCallback(
    (event: Omit<Event, 'id' | 'participants'>) => {
      const newEvent: Event = {
        ...event,
        id: Math.max(...events.map(e => e.id)) + 1,
        participants: 0,
      };

      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    },
    [events]
  );

  const updateParticipants = useCallback((eventId: number, delta: number) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, participants: event.participants + delta }
          : event
      )
    );
  }, []);

  return {
    events,
    addEvent,
    updateParticipants,
  };
};
