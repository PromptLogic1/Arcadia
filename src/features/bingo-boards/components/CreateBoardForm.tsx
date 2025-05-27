'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
// GAMES constant removed - using GAME_CATEGORIES from centralized types
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
// Constants moved to centralized types or defined locally
const TITLE_LENGTH_LIMITS = { MIN: 3, MAX: 100 }
const DESCRIPTION_LENGTH_LIMIT = 500
import { GAME_CATEGORIES } from '@/src/types'
import type { Difficulty, GameCategory } from '@/src/types'
import { Checkbox } from "@/components/ui/checkbox"
// CreateBoardFormData type - using local FormData interface instead

interface FormData {
  board_title: string
  board_description?: string
  board_size: number
  board_game_type: GameCategory
  board_difficulty: Difficulty
  is_public: boolean
  board_tags: string[]
}

interface FormErrors {
  board_title?: string
  board_description?: string
  board_size?: string
  board_game_type?: string
  board_difficulty?: string
}

interface CreateBoardFormProps {
  isOpen: boolean
}

const BOARD_SIZES = [3, 4, 5, 6]
const DEFAULT_GAME_TYPE: GameCategory = 'World of Warcraft'

const sortedGames = [...GAME_CATEGORIES]
  .filter(game => game !== 'All Games')
  .sort((a, b) => a.localeCompare(b))

export function CreateBoardForm({ isOpen }: CreateBoardFormProps) {
  const [formData, setFormData] = useState<FormData>({
    board_title: '',
    board_description: '',
    board_size: 5,
    board_game_type: DEFAULT_GAME_TYPE,
    board_difficulty: 'medium',
    is_public: false,
    board_tags: []
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const internalOnClose = useCallback(() => {
    console.log('Dialog closed');
  }, []);

  const internalOnSubmit = useCallback(async (data: FormData) => {
    console.log('Board data submitted:', data);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Title validation
    if (!formData.board_title) {
      newErrors.board_title = 'Title is required'
    } else if (formData.board_title.length < TITLE_LENGTH_LIMITS.MIN) {
      newErrors.board_title = `Title must be at least ${TITLE_LENGTH_LIMITS.MIN} characters`
    } else if (formData.board_title.length > TITLE_LENGTH_LIMITS.MAX) {
      newErrors.board_title = `Title must not exceed ${TITLE_LENGTH_LIMITS.MAX} characters`
    }

    // Description validation (optional)
    if (formData.board_description && formData.board_description.length > DESCRIPTION_LENGTH_LIMIT) {
      newErrors.board_description = `Description must not exceed ${DESCRIPTION_LENGTH_LIMIT} characters`
    }

    // Board size validation
    if (!BOARD_SIZES.includes(formData.board_size)) {
      newErrors.board_size = 'Invalid board size'
    }

    // Game validation
    if (!formData.board_game_type) {
      newErrors.board_game_type = 'Game is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await internalOnSubmit(formData)
      setFormData({
        board_title: '',
        board_description: '',
        board_size: 5,
        board_game_type: DEFAULT_GAME_TYPE,
        board_difficulty: 'medium',
        is_public: false,
        board_tags: []
      })
      internalOnClose()
    } catch {
      setErrors({ 
        board_title: 'Failed to create board. Please try again.' 
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={internalOnClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Create New Bingo Board
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="board_title">
              Board Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="board_title"
              value={formData.board_title}
              onChange={(e) => setFormData(prev => ({ ...prev, board_title: e.target.value }))}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                errors.board_title && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter board title"
            />
            {errors.board_title && (
              <p className="text-sm text-red-400">{errors.board_title}</p>
            )}
            <p className="text-xs text-gray-400">
              {formData.board_title.length}/{TITLE_LENGTH_LIMITS.MAX} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_description">Description (Optional)</Label>
            <Textarea
              id="board_description"
              value={formData.board_description}
              onChange={(e) => setFormData(prev => ({ ...prev, board_description: e.target.value }))}
              className={cn(
                "bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500",
                errors.board_description && "border-red-500/50 focus:border-red-500"
              )}
              placeholder="Enter board description"
            />
            {errors.board_description && (
              <p className="text-sm text-red-400">{errors.board_description}</p>
            )}
            <p className="text-xs text-gray-400">
              {(formData.board_description?.length || 0)}/{DESCRIPTION_LENGTH_LIMIT} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_size">
              Board Size <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.board_size.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, board_size: parseInt(value) }))}
            >
              <SelectTrigger className="bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500">
                <SelectValue placeholder="Select board size" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                {BOARD_SIZES.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}x{size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.board_size && (
              <p className="text-sm text-red-400">{errors.board_size}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_game">
              Game <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.board_game_type}
              onValueChange={(value: GameCategory) => setFormData(prev => ({ ...prev, board_game_type: value }))}
            >
              <SelectTrigger className="bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500">
                <SelectValue placeholder="Select Game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500 max-h-[200px]">
                {sortedGames.map(game => (
                  <SelectItem key={game} value={game}>
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.board_game_type && (
              <p className="text-sm text-red-400">{errors.board_game_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_difficulty">
              Difficulty <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.board_difficulty}
              onValueChange={(value: Difficulty) => setFormData(prev => ({ ...prev, board_difficulty: value }))}
            >
              <SelectTrigger className="bg-gray-800/50 border-cyan-500/50 focus:border-fuchsia-500">
                <SelectValue placeholder="Select Difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            {errors.board_difficulty && (
              <p className="text-sm text-red-400">{errors.board_difficulty}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_public: checked as boolean }))
              }
            />
            <Label htmlFor="is_public" className="text-sm font-normal">
              Make this board public
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={internalOnClose}
              className="border-cyan-500/50 hover:bg-cyan-500/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                "bg-gradient-to-r from-cyan-500 to-fuchsia-500",
                "text-white font-medium",
                "hover:opacity-90 transition-all duration-200",
                "shadow-lg shadow-cyan-500/25"
              )}
            >
              Create Board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 