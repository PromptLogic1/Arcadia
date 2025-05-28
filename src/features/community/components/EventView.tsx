'use client';

import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, Trophy, Calendar, MapPin } from 'lucide-react';
import { DialogWrapper } from './shared/DialogWrapper';
import type { Event } from '../types/types';
import { log } from '@/lib/logger';

interface EventViewProps {
  event: Event;
  onClose: () => void;
}

const EventView: React.FC<EventViewProps> = ({ event, onClose }) => {
  const handleRegister = () => {
    // TODO: Implement actual registration logic
    log.info('Registering for event:', {
      component: 'EventView',
      metadata: { eventId: event.id },
    });
  };

  return (
    <DialogWrapper
      open={true}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      className="max-h-[80vh] max-w-4xl bg-gray-800 text-cyan-100"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription>{event.game}</DialogDescription>
          </div>
          <Badge variant="outline" className="bg-gray-700">
            {event.prize}
          </Badge>
        </div>
      </DialogHeader>
      <ScrollArea className="mt-4 max-h-[50vh]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span>{event.participants} players</span>
            </div>
            <div className="flex items-center">
              <Trophy className="mr-2 h-4 w-4" />
              <span>{event.prize}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span>Online</span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Description</h3>
            <p className="text-gray-300">{event.description}</p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-gray-700">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="mt-6 flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="bg-gray-700 hover:bg-gray-600"
        >
          Close
        </Button>
        <Button
          onClick={handleRegister}
          className="bg-lime-500 text-gray-900 hover:bg-lime-600"
        >
          Register for Event
        </Button>
      </div>
    </DialogWrapper>
  );
};

export default EventView;
