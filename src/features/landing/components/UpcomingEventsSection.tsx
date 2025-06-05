'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { NeonText } from '@/components/ui/NeonText';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';
import {
  GiCalendarHalfYear,
  GiClockwork,
  GiCrossedSwords,
} from 'react-icons/gi';

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
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="flex h-full justify-center"
        >
          <Card
            variant="cyber"
            glow="subtle"
            className="group cyber-card-hover h-[520px] w-full max-w-md cursor-pointer transition-all duration-300 hover:scale-105"
            role="article"
            aria-labelledby={`event-title-${event.id}`}
            aria-describedby={`event-desc-${event.id}`}
          >
            <CardHeader className="p-0">
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                <Image
                  src={event.imageUrl}
                  alt={`${event.title} event banner`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  placeholder="blur"
                  blurDataURL="/images/placeholder-blur.jpg"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                  <GiCalendarHalfYear
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    aria-hidden="true"
                  />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center text-cyan-200/90">
                  <GiClockwork
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    aria-hidden="true"
                  />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-cyan-200/90">
                  <GiCrossedSwords
                    className="mr-2 h-4 w-4 flex-shrink-0 text-cyan-400"
                    aria-hidden="true"
                  />
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
        </motion.div>
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
        variant="orbs"
        count={15}
        speed="fast"
        color="emerald"
        repositioning={true}
      />
      <section
        className="relative z-20"
        aria-labelledby="upcoming-events-heading"
      >
        <div className="container mx-auto flex flex-col items-center px-4">
          <h2 id="upcoming-events-heading" className="mb-16 text-center">
            <NeonText
              variant="gradient"
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
