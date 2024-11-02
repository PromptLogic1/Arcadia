import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, ThumbsUp } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CardWrapper } from "./shared/CardWrapper"
import { Discussion } from "./types"

interface DiscussionCardProps {
  discussion: Discussion
  onClick: () => void
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({ discussion, onClick }) => (
  <CardWrapper onClick={onClick} hoverAccentColor="fuchsia">
    <CardHeader className="flex flex-row items-center justify-between">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage src={discussion.avatar} alt={discussion.author} />
          <AvatarFallback>{discussion.author[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{discussion.title}</h3>
          <p className="text-sm text-gray-400">by {discussion.author}</p>
        </div>
      </div>
      <Badge variant="outline" className="bg-gray-700">
        {discussion.game}
      </Badge>
    </CardHeader>
    <CardContent>
      <p className="text-gray-300 line-clamp-2">{discussion.content}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {discussion.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-gray-700">
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
    <CardFooter className="flex justify-between">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <ThumbsUp className="h-4 w-4" />
              <span>{discussion.upvotes}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upvotes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>{discussion.comments}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Comments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CardFooter>
  </CardWrapper>
)

export default DiscussionCard