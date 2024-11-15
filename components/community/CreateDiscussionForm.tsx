'use client'

import React, { useState } from "react"
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DialogWrapper } from "./shared/DialogWrapper"
import { FilterGroup } from "./shared/FilterGroup"
import type { Discussion } from "./types/types"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface CreateDiscussionFormProps {
  onClose: () => void
  onSubmit?: (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date'>) => void
}

const CreateDiscussionForm: React.FC<CreateDiscussionFormProps> = ({ onClose, onSubmit }) => {
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!content.trim()) newErrors.content = 'Content is required'
    if (selectedGame === 'All Games') newErrors.game = 'Please select a specific game'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = tagInput.trim()
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag])
        setTagInput('')
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
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
      tags,
      commentList: []
    }

    onSubmit?.(formData)
    onClose()
  }

  return (
    <DialogWrapper isOpen={true} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Create Discussion
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Title</label>
          <Input
            placeholder="What's on your mind?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`bg-gray-700/50 border-gray-600 focus:border-cyan-500 transition-colors
              ${errors.title ? 'border-red-500' : ''}`}
          />
          {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Game & Challenge Type</label>
          <FilterGroup
            selectedGame={selectedGame}
            selectedChallenge={selectedChallenge}
            onGameChange={setSelectedGame}
            onChallengeChange={setSelectedChallenge}
          />
          {errors.game && <p className="text-red-500 text-sm">{errors.game}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Content</label>
          <Textarea
            placeholder="Share your thoughts, strategies, or questions..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`bg-gray-700/50 border-gray-600 focus:border-cyan-500 min-h-[200px] transition-colors
              ${errors.content ? 'border-red-500' : ''}`}
          />
          {errors.content && <p className="text-red-500 text-sm">{errors.content}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Tags (max 5)</label>
          <Input
            placeholder="Add tags (press Enter or comma to add)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            disabled={tags.length >= 5}
            className="bg-gray-700/50 border-gray-600 focus:border-cyan-500 transition-colors"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="bg-gray-700/50 px-3 py-1 text-sm flex items-center gap-1 group"
              >
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-gray-700/50 hover:bg-gray-600 border-gray-600 transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white transition-all"
          >
            Create Discussion
          </Button>
        </DialogFooter>
      </form>
    </DialogWrapper>
  )
}

export default CreateDiscussionForm