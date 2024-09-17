import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, ThumbsUp } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Discussion {
  id: number;
  author: string;
  avatar: string;
  title: string;
  game: string;
  challengeType: string | null;
  comments: number;
  upvotes: number;
  content: string;
  date: string;
  tags: string[];
}

interface DiscussionCardProps {
  discussion: Discussion;
  onClick: () => void;
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({ discussion, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="w-full mb-4 bg-gray-800 border-cyan-500 hover:border-fuchsia-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer group" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between">
        {/* ... bestehender CardHeader-Inhalt ... */}
      </CardHeader>
      <CardContent>
        {/* ... bestehender CardContent-Inhalt ... */}
      </CardContent>
      <CardFooter className="flex justify-between">
        {/* ... bestehender CardFooter-Inhalt ... */}
      </CardFooter>
    </Card>
  </motion.div>
)

export default DiscussionCard