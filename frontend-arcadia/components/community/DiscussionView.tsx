import React, { useState } from "react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Underline, List } from "lucide-react"
import { DialogWrapper } from "./shared/DialogWrapper"
import { Discussion } from "./types"

interface DiscussionViewProps {
  discussion: Discussion
  onClose: () => void
}

const DiscussionView: React.FC<DiscussionViewProps> = ({ discussion, onClose }) => {
  const [comment, setComment] = useState('')

  return (
    <DialogWrapper 
      isOpen={true} 
      onClose={onClose}
      className="bg-gray-800 text-cyan-100 max-w-4xl max-h-[80vh]"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={discussion.avatar} alt={discussion.author} />
              <AvatarFallback>{discussion.author[0]}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{discussion.title}</DialogTitle>
              <DialogDescription>by {discussion.author}</DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-gray-700">
            {discussion.game}
          </Badge>
        </div>
      </DialogHeader>
      <ScrollArea className="mt-4 max-h-[50vh]">
        <div className="space-y-4">
          <p className="text-gray-300">{discussion.content}</p>
          <div className="flex flex-wrap gap-2">
            {discussion.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-gray-700">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </ScrollArea>
      <div className="mt-6">
        <div className="flex items-center space-x-2 mb-2">
          <ToggleGroup type="multiple" className="bg-gray-700 rounded-md p-1">
            <ToggleGroupItem value="bold">
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic">
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline">
              <Underline className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Textarea
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-gray-700 border-cyan-500"
        />
        <div className="flex justify-end mt-2">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-gray-900">
            Post Comment
          </Button>
        </div>
      </div>
    </DialogWrapper>
  )
}

export default DiscussionView