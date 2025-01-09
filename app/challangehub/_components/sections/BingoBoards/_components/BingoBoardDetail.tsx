'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Settings } from 'lucide-react'
import { cn } from "@/lib/utils"
import type { Difficulty } from '@/src/store/types/bingoboard.types'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import { Checkbox } from "@/components/ui/checkbox"
import { bingoBoardService } from '@/src/store/services/bingoboard-service'

interface BingoBoardDetailProps {
  boardId: string
  onClose: () => void
}

type FieldKey = 'title' | 'description' | 'tags';

export function BingoBoardDetail({ boardId, onClose }: BingoBoardDetailProps) {
  const { 
    boards,
    updateBoard 
  } = useBingoBoards()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    description?: string;
    tags?: string;
  }>({})
  
  const board = boards.find(b => b.id === boardId)
  const [formData, setFormData] = useState(board ? {
    board_title: board.board_title,
    board_description: board.board_description || '',
    board_tags: board.board_tags || [],
    board_difficulty: board.board_difficulty,
    is_public: board.is_public,
  } : null)

  const handleSave = async () => {
    if (!board || !formData) return
    setError(null) // Reset any previous errors

    // Validate first
    const validation = bingoBoardService.validateBoardConstraints({
      ...board,
      ...formData
    })

    if (!validation.isValid) {
      setError(validation.error || 'Invalid board data')
      return
    }

    try {
      await updateBoard(board.id, {
        ...board,
        ...formData
      })
      onClose()
    } catch (error) {
      setError('Failed to update board')
    }
  }

  // Generate placeholder bingo cards based on board size
  const generatePlaceholderCards = (size: number) => {
    const cards = []
    const totalCards = size * size
    
    for (let i = 0; i < totalCards; i++) {
      cards.push({
        id: `placeholder-${i}`,
        text: `Complete Task ${i + 1}`,
        category: 'Quest',
        difficulty: 'Medium'
      })
    }
    return cards
  }

  // Validiere ein einzelnes Feld
  const validateField = (field: string, value: string | string[] | boolean): string | null => {
    switch (field) {
      case 'board_title':
        if (typeof value === 'string' && (value.length < 3 || value.length > 50)) {
          return 'Title must be between 3 and 50 characters'
        }
        break
      case 'board_description':
        if (typeof value === 'string' && value.length > 255) {
          return 'Description cannot exceed 255 characters'
        }
        break
      case 'board_tags':
        if (Array.isArray(value) && value.length > 5) {
          return 'Maximum of 5 tags allowed'
        }
        break
    }
    return null
  }

  // Update FormData mit Live-Validierung
  const updateFormField = (field: string, value: string | string[] | boolean) => {
    const error = validateField(field, value)
    
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      const key = field.replace('board_', '') as FieldKey
      
      if (error) {
        newErrors[key] = error
      } else {
        delete newErrors[key]
      }
      return newErrors
    })
    
    setFormData(prev => ({ ...prev!, [field]: value }))
  }

  if (!board || !formData) return null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] bg-gray-900 text-gray-100 flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Board Details
          </DialogTitle>
        </DialogHeader>

        {/* Show error message if exists */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Main content with scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          <div className="grid grid-cols-[2fr,1fr] gap-6 h-full">
            {/* Left Section - Bingo Board */}
            <div className="space-y-6 min-h-0">
              {/* Bingo Grid */}
              <div 
                className="grid gap-4 aspect-square" 
                style={{ 
                  gridTemplateColumns: `repeat(${board.board_size}, minmax(0, 1fr))` 
                }}
              >
                {generatePlaceholderCards(board.board_size).map((card, index) => (
                  <Card
                    key={card.id}
                    className={cn(
                      "relative aspect-square p-4 bg-gray-800/50 border-cyan-500/20",
                      "hover:border-cyan-500/40 transition-all duration-300",
                      "cursor-pointer flex flex-col justify-center"
                    )}
                  >
                    <p className="text-sm text-cyan-300 text-center px-2">
                      {card.text}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between p-2 text-[10px] text-gray-400">
                      <Badge 
                        className={cn(
                          "text-[10px] px-1.5 py-0.5",
                          "bg-cyan-500/5 text-cyan-300/70"
                        )}
                      >
                        {card.category}
                      </Badge>
                      <Badge 
                        className={cn(
                          "text-[10px] px-1.5 py-0.5",
                          "bg-cyan-500/5 text-cyan-300/70"
                        )}
                      >
                        {card.difficulty}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Section - Settings */}
            <div className="border-l border-gray-700 pl-6 min-h-0">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-cyan-300 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Board Settings
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="board_title">
                      Board Title
                      <span className="text-xs text-gray-400 ml-2">
                        ({formData?.board_title.length}/50)
                      </span>
                    </Label>
                    <Input
                      id="board_title"
                      value={formData?.board_title}
                      onChange={(e) => updateFormField('board_title', e.target.value)}
                      className={cn(
                        "bg-gray-800/50",
                        fieldErrors.title 
                          ? "border-red-500/50 focus:border-red-500/70" 
                          : "border-cyan-500/50"
                      )}
                    />
                    {fieldErrors.title && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description
                      <span className="text-xs text-gray-400 ml-2">
                        ({formData?.board_description.length}/255)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData?.board_description}
                      onChange={(e) => updateFormField('board_description', e.target.value)}
                      className={cn(
                        "min-h-[120px]",
                        "bg-gray-800/50",
                        "resize-y",
                        "text-gray-300",
                        fieldErrors.description 
                          ? "border-red-500/50 focus:border-red-500/70" 
                          : "border-cyan-500/20 focus:border-cyan-500/40"
                      )}
                    />
                    {fieldErrors.description && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="board_tags">
                      Tags
                      <span className="text-xs text-gray-400 ml-2">
                        ({formData?.board_tags.length}/5)
                      </span>
                    </Label>
                    <Input
                      id="board_tags"
                      value={formData?.board_tags.join(', ')}
                      onChange={(e) => updateFormField('board_tags', e.target.value.split(',').map(tag => tag.trim()))}
                      className={cn(
                        "bg-gray-800/50",
                        fieldErrors.tags 
                          ? "border-red-500/50 focus:border-red-500/70" 
                          : "border-cyan-500/50"
                      )}
                      placeholder="Enter tags separated by commas"
                    />
                    {fieldErrors.tags && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.tags}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="board_difficulty">Difficulty</Label>
                    <Select 
                      value={formData.board_difficulty}
                      onValueChange={(value: Difficulty) => 
                        setFormData(prev => ({ ...prev!, board_difficulty: value }))
                      }
                    >
                      <SelectTrigger className="bg-gray-800/50 border-cyan-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-cyan-500">
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev!, is_public: checked as boolean }))
                      }
                    />
                    <Label htmlFor="is_public">Make this board public</Label>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={Object.values(fieldErrors).some(error => error !== undefined)}
                  className={cn(
                    "w-full",
                    Object.values(fieldErrors).some(error => error !== undefined)
                      ? "bg-gray-500/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                  )}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-none mt-4 border-t border-gray-800 pt-4">
          <Button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BingoBoardDetail
