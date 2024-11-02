import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Calendar } from "lucide-react"
import { CardWrapper } from "./shared/CardWrapper"
import { Event } from "./types"

interface EventCardProps {
  event: Event
  onClick: () => void
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => (
  <CardWrapper onClick={onClick} hoverAccentColor="lime">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{event.title}</h3>
          <p className="text-sm text-gray-400">{event.game}</p>
        </div>
        <Badge variant="outline" className="bg-gray-700">
          {event.prize}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-gray-300 line-clamp-2 mb-4">{event.description}</p>
      <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
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
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {event.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-gray-700">
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
  </CardWrapper>
)

export default EventCard