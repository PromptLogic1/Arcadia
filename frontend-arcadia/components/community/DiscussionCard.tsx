import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, ThumbsUp } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CardWrapper } from "./shared/CardWrapper"
import { Discussion } from "./types"
import { useState } from "react"

interface DiscussionCardProps {
  discussion: Discussion
  onClick: () => void
  onUpvote: (id: number) => void
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({ discussion, onClick, onUpvote }) => {
  const [isUpvoted, setIsUpvoted] = useState(false)

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    if (!isUpvoted) {
      setIsUpvoted(true)
      onUpvote(discussion.id)
    }
  }

  return (
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
              <div 
                className={`flex items-center space-x-2 cursor-pointer transition-colors
                  ${isUpvoted ? 'text-cyan-400' : 'hover:text-cyan-400'}`}
                onClick={handleUpvote}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{discussion.upvotes + (isUpvoted ? 1 : 0)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isUpvoted ? 'Upvoted!' : 'Upvote'}</p>
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
}

export default DiscussionCard