'use client'

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Calendar, ChevronDown, MapPin, Star, Bell, Share2 } from "lucide-react"
import { CardWrapper } from "./shared/CardWrapper"
import type { Event } from "./types/types"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'

interface EventCardProps {
  event: Event
  isExpanded: boolean
  onToggle: () => void
}

const EventActions = React.memo(({ 
  isInterested,
  isNotifying,
  onInterested,
  onNotify,
  onShare
}: {
  isInterested: boolean
  isNotifying: boolean
  onInterested: (e: React.MouseEvent) => void
  onNotify: (e: React.MouseEvent) => void
  onShare: (e: React.MouseEvent) => void
}) => (
  <div className="flex items-center space-x-4 border-t border-gray-700/50 pt-4 mt-4">
    <button
      onClick={onInterested}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
        isInterested 
          ? 'text-yellow-400 bg-yellow-400/10' 
          : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
      }`}
    >
      <Star className={`h-5 w-5 ${isInterested ? 'fill-current' : ''} transition-transform ${isInterested ? 'scale-110' : 'scale-100'}`} />
      <span className="text-sm font-medium">{isInterested ? 'Interested' : 'Interest'}</span>
    </button>
    <button
      onClick={onNotify}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
        isNotifying 
          ? 'text-lime-400 bg-lime-400/10' 
          : 'text-gray-400 hover:text-lime-400 hover:bg-lime-400/10'
      }`}
    >
      <Bell className={`h-5 w-5 ${isNotifying ? 'fill-current' : ''} transition-transform ${isNotifying ? 'scale-110' : 'scale-100'}`} />
      <span className="text-sm font-medium">{isNotifying ? 'Notifying' : 'Notify Me'}</span>
    </button>
    <button
      onClick={onShare}
      className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
    >
      <Share2 className="h-5 w-5" />
      <span className="text-sm font-medium">Share</span>
    </button>
  </div>
))

EventActions.displayName = 'EventActions'

const EventCard = React.memo(({ event, isExpanded, onToggle }: EventCardProps) => {
  const [isInterested, setIsInterested] = useState(false)
  const [isNotifying, setIsNotifying] = useState(false)
  const [localParticipants, setLocalParticipants] = useState(event.participants)

  const handleInterested = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsInterested(prev => !prev)
    setLocalParticipants(prev => isInterested ? prev - 1 : prev + 1)
  }, [isInterested])

  const handleNotify = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsNotifying(prev => !prev)
  }, [])

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Implementiere Share-Funktionalität
  }, [])

  const handleRegister = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Handle event registration
    console.log('Registering for event:', event.id)
  }, [event.id])

  return (
    <CardWrapper onClick={onToggle} hoverAccentColor="lime">
      <div className="relative">
        <CardHeader className="p-5 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                {event.title}
              </h2>
              <div className="flex items-center text-sm text-gray-400 space-x-3">
                <Badge 
                  variant="outline" 
                  className="bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border-lime-500/20 text-lime-400"
                >
                  {event.game}
                </Badge>
                <span className="text-gray-600">•</span>
                <time className="text-gray-500">
                  {format(event.date, 'MMM d, yyyy')}
                </time>
              </div>
            </div>
            <div className="flex items-center space-x-3 ml-4">
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20 text-yellow-400"
              >
                {event.prize}
              </Badge>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </motion.div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
          <p className="text-gray-300 text-base leading-relaxed line-clamp-2 mb-4">
            {event.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 bg-gray-800/30 rounded-lg p-3">
              <Calendar className="h-5 w-5 text-lime-400" />
              <div>
                <p className="text-sm font-medium text-gray-300">Date</p>
                <p className="text-sm text-gray-400">{format(event.date, 'MMM d, h:mm a')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-gray-800/30 rounded-lg p-3">
              <Users className="h-5 w-5 text-lime-400" />
              <div>
                <p className="text-sm font-medium text-gray-300">Participants</p>
                <p className="text-sm text-gray-400">{localParticipants} registered</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-gray-800/30 rounded-lg p-3">
              <Trophy className="h-5 w-5 text-lime-400" />
              <div>
                <p className="text-sm font-medium text-gray-300">Prize Pool</p>
                <p className="text-sm text-gray-400">{event.prize}</p>
              </div>
            </div>
          </div>
        </CardContent>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-5 space-y-6 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-200 text-base leading-relaxed">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                  <div className="flex items-center text-gray-300">
                    <Calendar className="h-5 w-5 mr-3 text-lime-400" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-gray-400">
                        {format(event.date, 'EEEE, MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Users className="h-5 w-5 mr-3 text-lime-400" />
                    <div>
                      <p className="font-medium">Participants</p>
                      <p className="text-sm text-gray-400">
                        {localParticipants} registered
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Trophy className="h-5 w-5 mr-3 text-lime-400" />
                    <div>
                      <p className="font-medium">Prize Pool</p>
                      <p className="text-sm text-gray-400">{event.prize}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <MapPin className="h-5 w-5 mr-3 text-lime-400" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-gray-400">Online</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3 bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
                    Event Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <button
                        key={tag}
                        className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 text-lime-400 border border-lime-500/20 rounded-full text-sm font-medium transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleRegister}
                    className="bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white px-6 py-2 text-base font-medium shadow-lg shadow-lime-500/20 transform hover:scale-105 transition-all duration-200"
                  >
                    Register for Event
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardWrapper>
  )
})

EventCard.displayName = 'EventCard'

export default EventCard






