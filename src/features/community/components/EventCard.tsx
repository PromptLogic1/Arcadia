'use client';

import React, { useState, useCallback } from 'react';
import { CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Trophy,
  Calendar,
  ChevronDown,
  MapPin,
  Star,
  Bell,
  Share2,
} from 'lucide-react';
import { CardWrapper } from './shared/CardWrapper';
import type { Event } from '@/lib/stores/community-store';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { log } from '@/lib/logger';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import './animations.css';

interface EventCardProps {
  event: Event;
  isExpanded: boolean;
  onToggle: () => void;
}

const EventActions = React.memo(
  ({
    isInterested,
    isNotifying,
    onInterested,
    onNotify,
    onShare,
  }: {
    isInterested: boolean;
    isNotifying: boolean;
    onInterested: (e: React.MouseEvent) => void;
    onNotify: (e: React.MouseEvent) => void;
    onShare: (e: React.MouseEvent) => void;
  }) => (
    <div className="mt-4 flex items-center space-x-4 border-t border-gray-700/50 pt-4">
      <button
        onClick={onInterested}
        className={`flex items-center space-x-2 rounded-full px-3 py-1.5 transition-all ${
          isInterested
            ? 'bg-yellow-400/10 text-yellow-400'
            : 'text-gray-400 hover:bg-yellow-400/10 hover:text-yellow-400'
        }`}
      >
        <Star
          className={`h-5 w-5 ${isInterested ? 'fill-current' : ''} transition-transform ${isInterested ? 'scale-110' : 'scale-100'}`}
        />
        <span className="text-sm font-medium">
          {isInterested ? 'Interested' : 'Interest'}
        </span>
      </button>
      <button
        onClick={onNotify}
        className={`flex items-center space-x-2 rounded-full px-3 py-1.5 transition-all ${
          isNotifying
            ? 'bg-lime-400/10 text-lime-400'
            : 'text-gray-400 hover:bg-lime-400/10 hover:text-lime-400'
        }`}
      >
        <Bell
          className={`h-5 w-5 ${isNotifying ? 'fill-current' : ''} transition-transform ${isNotifying ? 'scale-110' : 'scale-100'}`}
        />
        <span className="text-sm font-medium">
          {isNotifying ? 'Notifying' : 'Notify Me'}
        </span>
      </button>
      <button
        onClick={onShare}
        className="flex items-center space-x-2 rounded-full px-3 py-1.5 text-gray-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-400"
      >
        <Share2 className="h-5 w-5" />
        <span className="text-sm font-medium">Share</span>
      </button>
    </div>
  )
);

EventActions.displayName = 'EventActions';

const EventCard = React.memo(
  ({ event, isExpanded, onToggle }: EventCardProps) => {
    const [isInterested, setIsInterested] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [localParticipants, setLocalParticipants] = useState(
      event.participants
    );

    const handleInterested = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsInterested(prev => !prev);
        setLocalParticipants((prev: number) =>
          isInterested ? prev - 1 : prev + 1
        );
      },
      [isInterested]
    );

    const handleNotify = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsNotifying(prev => !prev);
    }, []);

    const handleShare = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      // Implementiere Share-Funktionalität
    }, []);

    const handleRegister = () => {
      // TODO: Implement actual registration logic
      log.info('Registering for event:', {
        component: 'EventCard',
        metadata: { eventId: event.id },
      });
      // For now, just navigate to a placeholder page or show a notification
    };

    return (
      <BaseErrorBoundary level="component">
        <CardWrapper
          onClick={onToggle}
          className="transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="relative">
            <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-xl leading-tight font-bold text-transparent">
                    {event.title}
                  </h2>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <Badge
                      variant="outline"
                      className="border-lime-500/20 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 text-lime-400"
                    >
                      {event.game}
                    </Badge>
                    <span className="text-gray-600">•</span>
                    <time className="text-gray-500">
                      {event.date
                        ? format(new Date(event.date), 'MMM d, yyyy')
                        : 'Date TBD'}
                    </time>
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-3">
                  <Badge
                    variant="outline"
                    className="border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 text-yellow-400"
                  >
                    {event.prize}
                  </Badge>
                  <div
                    className="chevron-icon"
                    data-state={isExpanded ? 'open' : 'closed'}
                  >
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 p-5">
              <p className="mb-4 line-clamp-2 text-base leading-relaxed text-gray-300">
                {event.description}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-3 rounded-lg bg-gray-800/30 p-3">
                  <Calendar className="h-5 w-5 text-lime-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">Date</p>
                    <p className="text-sm text-gray-400">
                      {event.date
                        ? format(new Date(event.date), 'MMM d, h:mm a')
                        : 'Date TBD'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-lg bg-gray-800/30 p-3">
                  <Users className="h-5 w-5 text-lime-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Participants
                    </p>
                    <p className="text-sm text-gray-400">
                      {localParticipants} registered
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-lg bg-gray-800/30 p-3">
                  <Trophy className="h-5 w-5 text-lime-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Prize Pool
                    </p>
                    <p className="text-sm text-gray-400">{event.prize}</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <div
              className="expandable-content"
              data-state={isExpanded ? 'open' : 'closed'}
              style={
                {
                  '--content-height': isExpanded ? 'auto' : '0px',
                } as React.CSSProperties
              }
            >
              {isExpanded && (
                <div className="space-y-6 bg-gradient-to-b from-gray-800/30 to-gray-900/30 px-6 py-5">
                  <div className="prose prose-invert max-w-none">
                    <p className="text-base leading-relaxed text-gray-200">
                      {event.description}
                    </p>
                  </div>

                  <EventActions
                    isInterested={isInterested}
                    isNotifying={isNotifying}
                    onInterested={handleInterested}
                    onNotify={handleNotify}
                    onShare={handleShare}
                  />

                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 md:grid-cols-2">
                    <div className="flex items-center text-gray-300">
                      <Calendar className="mr-3 h-5 w-5 text-lime-400" />
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-sm text-gray-400">
                          {event.date
                            ? format(
                                new Date(event.date),
                                'EEEE, MMMM d, yyyy h:mm a'
                              )
                            : 'Date TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Users className="mr-3 h-5 w-5 text-lime-400" />
                      <div>
                        <p className="font-medium">Participants</p>
                        <p className="text-sm text-gray-400">
                          {localParticipants} registered
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Trophy className="mr-3 h-5 w-5 text-lime-400" />
                      <div>
                        <p className="font-medium">Prize Pool</p>
                        <p className="text-sm text-gray-400">{event.prize}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <MapPin className="mr-3 h-5 w-5 text-lime-400" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-gray-400">Online</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-lg font-semibold text-transparent">
                      Event Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map(tag => (
                        <button
                          key={tag}
                          className="rounded-full border border-lime-500/20 bg-gray-800/50 px-3 py-1.5 text-sm font-medium text-lime-400 transition-colors hover:bg-gray-700/50"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleRegister}
                      className="transform bg-gradient-to-r from-lime-500 to-emerald-500 px-6 py-2 text-base font-medium text-white shadow-lg shadow-lime-500/20 transition-all duration-200 hover:scale-105 hover:from-lime-600 hover:to-emerald-600"
                    >
                      Register for Event
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardWrapper>
      </BaseErrorBoundary>
    );
  }
);

EventCard.displayName = 'EventCard';

export default EventCard;
