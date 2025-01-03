'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import NeonBorder from '@/components/ui/NeonBorder'
import NeonText from '@/components/ui/NeonText'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

interface Event {
  id: string
  title: string
  date: string
  description: string
  imageUrl: string
}

const upcomingEvents: ReadonlyArray<Event> = [
  {
    id: 'tournament-2024',
    title: 'Arcadia Tournament 2024',
    date: 'June 15, 2024',
    description: 'Join our annual tournament and compete with top gamers worldwide.',
    imageUrl: '/images/events/tournament2024.jpg',
  },
  {
    id: 'stream-marathon',
    title: 'Live Stream Marathon',
    date: 'July 10, 2024',
    description: 'Watch live streams from your favorite gamers and participate in giveaways.',
    imageUrl: '/images/events/streamer1.jpg',
  },
  {
    id: 'dev-meetup',
    title: 'Developer Meetup',
    date: 'August 20, 2024',
    description: 'Meet the developers behind Arcadia and share your feedback.',
    imageUrl: '/images/events/developermeetup.jpg',
  },
] as const

const UpcomingEventsSection: React.FC = () => {
  const renderEvents = useMemo(() => (
    upcomingEvents.map((event) => (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <NeonBorder color="cyan" className="p-0.5 h-full">
          <Card className="bg-gray-800 border-none hover:scale-105 transition-transform duration-300 h-full flex flex-col">
            <CardHeader className="p-0">
              <div className="relative w-full pt-[50%]">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover rounded-t-lg absolute top-0 left-0"
                  placeholder="blur"
                  blurDataURL="/placeholder-blur.jpg"
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 flex flex-col flex-grow">
              <CardTitle className="text-lg font-bold text-cyan-300 mb-2 h-[48px] overflow-hidden line-clamp-2">
                {event.title}
              </CardTitle>
              <div className="flex items-center text-cyan-100 text-xs mb-2">
                <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                <p>{event.date}</p>
              </div>
              <p className="text-cyan-100 text-xs flex-grow h-[60px] overflow-hidden line-clamp-3">
                {event.description}
              </p>
            </CardContent>
          </Card>
        </NeonBorder>
      </motion.div>
    ))
  ), [])

  return (
    <section className="py-16 bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          <NeonText>Upcoming Events</NeonText>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderEvents}
        </div>
      </div>
    </section>
  )
}

export default React.memo(UpcomingEventsSection)