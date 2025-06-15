'use client';

import React, { useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/Image';
import { NeonText } from '@/components/ui/NeonText';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(
  () => import('@/components/ui/FloatingElements'),
  { ssr: false }
);

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: number;
  description: string;
  imageUrl: string;
}

const upcomingEvents: ReadonlyArray<Event> = [
  {
    id: 'tournament-2024',
    title: 'Arcadia Tournament 2024',
    date: 'June 15, 2024',
    time: '7:00 PM EST',
    attendees: 1247,
    description:
      'Join our annual tournament and compete with top gamers worldwide for exclusive prizes and bragging rights.',
    imageUrl: '/images/events/tournament2024.jpg',
  },
  {
    id: 'stream-marathon',
    title: 'Live Stream Marathon',
    date: 'July 10, 2024',
    time: '12:00 PM EST',
    attendees: 892,
    description:
      'Watch live streams from your favorite gamers and participate in giveaways with amazing rewards.',
    imageUrl: '/images/events/streamer1.jpg',
  },
  {
    id: 'dev-meetup',
    title: 'Developer Meetup',
    date: 'August 20, 2024',
    time: '6:00 PM EST',
    attendees: 356,
    description:
      'Meet the developers behind Arcadia and share your feedback to shape the future of gaming.',
    imageUrl: '/images/events/developermeetup.jpg',
  },
] as const;

const UpcomingEventsSection: React.FC = () => {
  const renderEvents = useMemo(
    () =>
      upcomingEvents.map((event, index) => (
        <div
          key={event.id}
          className="animate-in fade-in slide-in-from-bottom-10 fill-mode-both flex h-full justify-center duration-700"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Card
            variant="primary"
            className="group cyber-card-hover h-[520px] w-full max-w-md transform-gpu cursor-pointer transition-all duration-300 hover:scale-105"
            role="article"
            aria-labelledby={`event-title-${event.id}`}
            aria-describedby={`event-desc-${event.id}`}
          >
            <CardHeader className="p-0">
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                <OptimizedImage
                  src={event.imageUrl}
                  alt={`${event.title} event banner`}
                  fill
                  className="object-cover transition-transform duration-300 will-change-transform group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index === 0}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-grow flex-col space-y-4 p-6">
              <CardTitle
                id={`event-title-${event.id}`}
                className="neon-glow-cyan line-clamp-2 text-2xl font-bold transition-colors group-hover:text-cyan-300"
              >
                {event.title}
              </CardTitle>

              <div className="flex flex-col space-y-3 text-sm">
                <div className="flex items-center text-cyan-200/90">
                  <svg
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                  </svg>
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center text-cyan-200/90">
                  <svg
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-.5-13v6l5.25 3.15.75-1.23-4.5-2.67V7h-1.5z" />
                  </svg>
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-cyan-200/90">
                  <svg
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M16 17v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2H2v-2l1-5h18l1 5v2h-4zM7 22h10a3 3 0 003-3v-3H4v3a3 3 0 003 3zM18.56 8L17 4.92 11.5 8.22 6 4.92 4.44 8A2 2 0 002 10v1h20v-1a2 2 0 00-2.44-2z" />
                  </svg>
                  <span>{event.attendees} attending</span>
                </div>
              </div>

              <p
                id={`event-desc-${event.id}`}
                className="line-clamp-4 flex-grow leading-relaxed text-cyan-200/80"
              >
                {event.description}
              </p>

              <div className="pt-2">
                <div className="text-xs font-medium text-cyan-400/70">
                  Click to learn more →
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )),
    []
  );

  return (
    <CyberpunkBackground
      variant="circuit"
      intensity="medium"
      className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 py-24"
    >
      <FloatingElements
        variant="hexagons"
        count={15}
        speed="fast"
        color="emerald"
      />
      <section
        className="relative z-20"
        aria-labelledby="upcoming-events-heading"
      >
        <div className="container mx-auto flex flex-col items-center px-4">
          <h2 id="upcoming-events-heading" className="mb-16 text-center">
            <NeonText
              variant="solid"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
            >
              Upcoming Events
            </NeonText>
          </h2>
          <div className="grid w-full max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {renderEvents}
          </div>
        </div>
      </section>
    </CyberpunkBackground>
  );
};

export default React.memo(UpcomingEventsSection);
