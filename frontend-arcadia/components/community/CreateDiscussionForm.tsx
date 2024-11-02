import React, { useState } from "react"
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DialogWrapper } from "./shared/DialogWrapper"
import { FilterGroup } from "./shared/FilterGroup"
import { Discussion } from "./types"

interface CreateDiscussionFormProps {
  onClose: () => void
  onSubmit?: (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date'>) => void
}

const CreateDiscussionForm: React.FC<CreateDiscussionFormProps> = ({ onClose, onSubmit }) => {
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!content.trim()) newErrors.content = 'Content is required'
    if (selectedGame === 'All Games') newErrors.game = 'Please select a specific game'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const formData = {
      author: 'Current User', // This should come from auth context
      avatar: '/avatars/default.jpg', // This should come from auth context
      title: title.trim(),
      game: selectedGame,
      challengeType: selectedChallenge === 'All Challenges' ? null : selectedChallenge,
      content: content.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    onSubmit?.(formData)
    onClose()
  }

  return (
    <DialogWrapper isOpen={true} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Create Discussion</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            placeholder="Discussion Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`bg-gray-700 border-cyan-500 ${errors.title ? 'border-red-500' : ''}`}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>
        
        <div>
          <FilterGroup
            selectedGame={selectedGame}
            selectedChallenge={selectedChallenge}
            onGameChange={setSelectedGame}
            onChallengeChange={setSelectedChallenge}
          />
          {errors.game && <p className="text-red-500 text-sm mt-1">{errors.game}</p>}
        </div>

        <div>
          <Textarea
            placeholder="Write your discussion here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`bg-gray-700 border-cyan-500 min-h-[200px] ${errors.content ? 'border-red-500' : ''}`}
          />
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
        </div>

        <Input
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="bg-gray-700 border-cyan-500"
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-cyan-500 hover:bg-cyan-600 text-gray-900"
          >
            Create
          </Button>
        </DialogFooter>
      </form>
    </DialogWrapper>
  )
}

export default CreateDiscussionForm