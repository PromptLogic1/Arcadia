'use client'

import React from "react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Calendar, MapPin } from "lucide-react"
import { DialogWrapper } from "./shared/DialogWrapper"
import type { Event } from "./types/types"

interface EventViewProps {
  event: Event
  onClose: () => void
}

const EventView: React.FC<EventViewProps> = ({ event, onClose }) => {
  const handleRegister = () => {
    // Handle event registration
    console.log('Registering for event:', event.id)
  }

  return (
    <DialogWrapper 
      isOpen={true} 
      onClose={onClose}
      className="bg-gray-800 text-cyan-100 max-w-4xl max-h-[80vh]"
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
              <Calendar className="h-4 w-4 mr-2" />
              <span>{event.date.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span>{event.participants} players</span>
            </div>
            <div className="flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              <span>{event.prize}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span>Online</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-300">{event.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
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
          className="bg-lime-500 hover:bg-lime-600 text-gray-900"
        >
          Register for Event
        </Button>
      </div>
    </DialogWrapper>
  )
}

export default EventView