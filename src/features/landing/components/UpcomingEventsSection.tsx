'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl: string;
}

const upcomingEvents: ReadonlyArray<Event> = [
  {
    id: 'tournament-2024',
    title: 'Arcadia Tournament 2024',
    date: 'June 15, 2024',
    description:
      'Join our annual tournament and compete with top gamers worldwide.',
    imageUrl: '/images/events/tournament2024.jpg',
  },
  {
    id: 'stream-marathon',
    title: 'Live Stream Marathon',
    date: 'July 10, 2024',
    description:
      'Watch live streams from your favorite gamers and participate in giveaways.',
    imageUrl: '/images/events/streamer1.jpg',
  },
  {
    id: 'dev-meetup',
    title: 'Developer Meetup',
    date: 'August 20, 2024',
    description: 'Meet the developers behind Arcadia and share your feedback.',
    imageUrl: '/images/events/developermeetup.jpg',
  },
] as const;

const UpcomingEventsSection: React.FC = () => {
  const renderEvents = useMemo(
    () =>
      upcomingEvents.map(event => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex h-full justify-center"
        >
          <NeonBorder color="cyan" className="h-full w-full max-w-sm p-0.5">
            <Card className="flex h-full flex-col border-none bg-gray-800 shadow-xl transition-transform duration-300 hover:scale-105">
              <CardHeader className="p-0">
                <div className="relative w-full pt-[50%]">
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="absolute left-0 top-0 rounded-t-lg object-cover"
                    placeholder="blur"
                    blurDataURL="/images/placeholder-blur.jpg"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-grow flex-col p-4">
                <CardTitle className="mb-2 line-clamp-2 h-[48px] overflow-hidden text-lg font-bold text-cyan-300">
                  {event.title}
                </CardTitle>
                <div className="mb-2 flex items-center text-xs text-cyan-100">
                  <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                  <p>{event.date}</p>
                </div>
                <p className="line-clamp-3 h-[60px] flex-grow overflow-hidden text-xs text-cyan-100">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          </NeonBorder>
        </motion.div>
      )),
    []
  );

  return (
    <section className="bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 py-24 text-gray-100">
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          <NeonText>Upcoming Events</NeonText>
        </h2>
        <div className="grid w-full max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {renderEvents}
        </div>
      </div>
    </section>
  );
};

export default React.memo(UpcomingEventsSection);
