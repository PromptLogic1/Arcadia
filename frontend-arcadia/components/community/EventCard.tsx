import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Calendar } from "lucide-react"

interface Event {
  id: number;
  title: string;
  date: Date;
  game: string;
  participants: number;
  prize: string;
  description: string;
  tags: string[];
}

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="w-full mb-4 bg-gray-800 border-cyan-500 hover:border-lime-500 transition-all duration-300 hover:shadow-lg hover:shadow-lime-500/20 cursor-pointer group" onClick={onClick}>
      <CardHeader>
        {/* ... bestehender CardHeader-Inhalt ... */}
      </CardHeader>
      <CardContent>
        {/* ... bestehender CardContent-Inhalt ... */}
      </CardContent>
    </Card>
  </motion.div>
)

export default EventCard