import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Calendar, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Event {
  // ... bestehende Event-Schnittstelle ...
}

interface EventViewProps {
  event: Event;
  onClose: () => void;
}

const EventView: React.FC<EventViewProps> = ({ event, onClose }) => (
  <Dialog open={true} onOpenChange={onClose}>
    <DialogContent className="bg-gray-800 text-cyan-100 max-w-4xl max-h-[80vh] overflow-y-auto">
      {/* ... bestehender Dialog-Inhalt ... */}
    </DialogContent>
  </Dialog>
)

export default EventView