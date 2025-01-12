'use client'

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
import { Difficulty, DIFFICULTIES } from '@/src/store/types/game.types'
import { Checkbox } from "@/components/ui/checkbox"
import { useBingoBoardEdit } from '../hooks/useBingoBoardEdit'
import { BingoBoardComponentProps } from '../types'
import LoadingSpinner from "@/components/ui/loading-spinner"
import { DEFAULT_CARD_ID } from '@/src/store/types/bingocard.types'
import { useState, useCallback } from "react"
import { BingoCardEditDialog } from "./BingoCardEditDialog"
import type { BingoCard } from "@/src/store/types/bingocard.types"
import { useRouter } from 'next/navigation'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import { notFound } from "next/navigation"
import { setError } from "@/src/store/slices/bingoboardSlice"

interface BingoBoardEditProps {
  boardId: string
  onSaveSuccess: () => void
}

export function BingoBoardEdit({ boardId, onSaveSuccess }: BingoBoardEditProps) {
  const router = useRouter()
  const [editingCard, setEditingCard] = useState<{ card: BingoCard; index: number } | null>(null)
  
  const {
    isLoading,
    error,
    currentBoard,
    board,
    formData,
    setFormData,
    fieldErrors,
    gridCards,
    isLoadingCards,
    updateFormField,
    handleCardEdit,
    gridSize,
    handleSave,
  } = useBingoBoardEdit(boardId)

  const handleClose = useCallback(() => {
    router.push('/challengehub')
  }, [router])

  const handleSaveClick = async () => {
    const success = await handleSave()
    if (success) {
      onSaveSuccess()
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!currentBoard) {
    return notFound()
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Edit BingoBoard
        </h1>
        <Button variant="outline" onClick={handleClose}>
          Back to Boards
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left Section - Bingo Grid */}
        <div className="space-y-4">
          {isLoadingCards ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <div 
              className="grid gap-4" 
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
              }}
            >
              {gridCards.map((card, index) => (
                <Card 
                  key={card.id || index}
                  className={cn(
                    "bg-gray-800/50 p-4 aspect-square cursor-pointer hover:bg-gray-800/70 transition-colors",
                    card.id === "" ? "border-gray-600/20" : "border-cyan-500/20"
                  )}
                  onDoubleClick={() => setEditingCard({ card, index })}
                >
                  {card.card_content || "Empty Card"}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Section - Board Settings */}
        <div className="space-y-6 border-l border-gray-700 pl-8">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-cyan-400">Settings</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 pr-4">
              <Label htmlFor="board_title">
                Title
                <span className="text-xs text-gray-400 ml-2">
                  ({formData.board_title.length}/50)
                </span>
              </Label>
              <Input
                id="board_title"
                value={formData.board_title}
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
                  ({formData.board_description.length}/255)
                </span>
              </Label>
              <Textarea
                id="description"
                value={formData.board_description}
                onChange={(e) => updateFormField('board_description', e.target.value)}
                className={cn(
                  "min-h-[160px] bg-gray-800/50 resize-y text-gray-300",
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
                  ({formData.board_tags.length}/5)
                </span>
              </Label>
              <Input
                id="board_tags"
                value={formData.board_tags.join(', ')}
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
                  {DIFFICULTIES.map((difficulty) => (
                    <SelectItem 
                      key={difficulty} 
                      value={difficulty}
                      className="capitalize"
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
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
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end space-x-4 border-t border-gray-800 pt-4">
        <Button 
          onClick={handleClose}
          variant="outline"
          className="text-gray-400 hover:text-gray-100 hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={Object.values(fieldErrors).some(error => error !== undefined)}
          className={cn(
            "bg-gradient-to-r from-cyan-500 to-fuchsia-500",
            Object.values(fieldErrors).some(error => error !== undefined) && 
            "opacity-50 cursor-not-allowed"
          )}
        >
          Save Changes
        </Button>
      </div>

      {/* Card Edit Dialog */}
      {editingCard && (
        <BingoCardEditDialog
          card={editingCard.card}
          index={editingCard.index}
          isOpen={true}
          onClose={() => setEditingCard(null)}
          onSave={handleCardEdit}
        />
      )}
    </div>
  )
}

export default BingoBoardEdit
