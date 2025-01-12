'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings, Plus } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Difficulty, DIFFICULTIES } from '@/src/store/types/game.types'
import { Checkbox } from "@/components/ui/checkbox"
import { useBingoBoardEdit } from '../hooks/useBingoBoardEdit'
import LoadingSpinner from "@/components/ui/loading-spinner"
import { useState, useCallback } from "react"
import { BingoCardEditDialog } from "./BingoCardEditDialog"
import type { BingoCard as BingCardType} from "@/src/store/types/bingocard.types"
import { DEFAULT_BINGO_CARD } from "@/src/store/types/bingocard.types"
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/src/config/routes'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { BingoCardCompact } from "../BingoCardCompact"
import { Badge } from "@/components/ui/badge"
import NeonText from "@/components/ui/NeonText"
import { GridPositionSelectDialog } from './GridPositionSelectDialog'

interface BingoBoardEditProps {
  boardId: string
  onSaveSuccess: () => void
}

interface FormData {
  board_title: string
  board_description: string
  board_tags: string[]
  board_difficulty: Difficulty
  is_public: boolean
}

export function BingoBoardEdit({ boardId, onSaveSuccess }: BingoBoardEditProps) {
  const router = useRouter()
  const [editingCard, setEditingCard] = useState<{ card: BingCardType; index: number } | null>(null)
  const [selectedCard, setSelectedCard] = useState<BingCardType | null>(null)

  
  const {
    isLoadingBoard,
    isLoadingCards,
    error,
    currentBoard,
    formData,
    setFormData,
    fieldErrors,
    gridCards,
    updateFormField,
    placeCardInGrid,
    createNewCard,
    updateExistingCard,
    gridSize,
    handleSave,
    cards,
  } = useBingoBoardEdit(boardId)

  const handleClose = useCallback(() => {
    router.push(ROUTES.CHALLENGE_HUB)
  }, [router])

  const handleSaveClick = async () => {
    const success = await handleSave()
    if (success) {
      onSaveSuccess()
    }
  }

  const handleCardSelect = (card: BingCardType) => {
    // Check if card is already in grid
    const isCardInGrid = gridCards.some(gc => gc.id === card.id)
    if (isCardInGrid) {
      alert('This card is already in the grid') // Simple alert for feedback
      return
    }
    setSelectedCard(card)
  }

  const handlePositionSelect = (index: number) => {
    if (selectedCard) {
      placeCardInGrid(selectedCard, index)
      setSelectedCard(null)
      // Find and close the dropdown of the selected card
      const cardElement = document.querySelector(`[data-card-id="${selectedCard.id}"]`)
      if (cardElement) {
        const trigger = cardElement.querySelector('[data-state="open"]')
        if (trigger instanceof HTMLElement) {
          trigger.click()
        }
      }
    }
  }

  const handleCreateNewCard = () => {
    setEditingCard({
      card: {
        ...DEFAULT_BINGO_CARD,
        game_category: currentBoard?.board_game_type || 'All Games'
      },
      index: -1 // Use -1 to indicate this is a new card
    })
  }
  
  if (isLoadingBoard) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!currentBoard || !formData) {
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          <NeonText>{formData.board_title}</NeonText>
          </h1>

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-transparent bg-clip-text">Game:</h2>
              <Badge 
                variant="outline" 
                className="bg-gray-800/50 border-cyan-500/50 text-cyan-400"
             >
              {currentBoard.board_game_type}
              </Badge>
            </div>
          <div className="flex items-center gap-2"> 
            <Button variant="outline" onClick={handleClose}>
              Back to Boards
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
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-6">
        <div className="w-[300px] min-w-[300px] shrink-0 relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-cyan-400 truncate">Available Cards</h2>
            <Button
              onClick={handleCreateNewCard}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 shrink-0 ml-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Card
            </Button>
          </div>
          
          <ScrollArea className="min-h-[calc(100vh-12rem)]">
            <div className="space-y-2 pr-3">
              {isLoadingCards ? (
                <div className="flex items-center justify-center h-20">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-2 w-[300px]">
                  {cards.map((card) => (
                    <BingoCardCompact
                      key={card.id}
                      card={card}
                      onSelect={handleCardSelect}
                      onEdit={(card) => {
                        const index = cards.findIndex(c => c.id === card.id)
                        if (index !== -1) setEditingCard({ card, index })
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1">
          <Collapsible className="mb-4">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-cyan-500/50 rounded-lg shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-cyan-400" />
                  <span className="text-lg font-semibold text-cyan-400">Settings</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 p-4 bg-gray-800/30 rounded-lg mt-2">
              {formData && (
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
              )}

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
                    setFormData((prev: FormData | null) => prev ? ({ ...prev, board_difficulty: value }) : null)
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
                    setFormData((prev: FormData | null) => prev ? ({ ...prev, is_public: checked as boolean }) : null)
                  }
                />
                <Label htmlFor="is_public">Make this board public</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-4">
            {isLoadingCards ? (
              <div className="items-center justify-center min-h-[400px] bg-gray-800/20 rounded-lg">
                <LoadingSpinner />
              </div>
            ) : (
              console.log('Current gridSize:', gridSize, 'Type:', typeof gridSize),
              <div className="flex flex-wrap gap-2 mx-auto p-4 bg-gray-900/30 rounded-lg"
                style={{
                  width: `${gridSize * 196
                  }px`, // 180px card + 16px gap
                  justifyContent: 'flex-start'
                }}
              >
                {gridCards.map((card, index) => (
                  <Card 
                    key={card.id || index}
                    className={cn(
                      "bg-gray-800/50 p-2 aspect-square cursor-pointer hover:bg-gray-800/70 transition-colors",
                      "relative w-[180px] h-[180px]",
                      card.id === "" ? "border-gray-600/20" : "border-cyan-500/20"
                    )}
                    onClick={() => setEditingCard({ card, index })}
                  >
                    <div className="absolute top-1 left-1 text-xs text-gray-500 font-mono z-10 bg-gray-900/50 px-1 rounded">
                      {`${Math.floor(index / gridSize) + 1}-${(index % gridSize) + 1}`}
                    </div>
                    {card.id ? (
                      <div className="flex flex-col items-center h-full pt-6">
                        <div className="w-full text-center text-xs text-cyan-400 border-b border-gray-700 pb-1">
                          {card.card_difficulty}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-center px-1 text-sm">
                          {card.card_content}
                        </div>
                        <div className="w-full text-center text-xs text-gray-400 border-t border-gray-700 pt-1">
                          {card.card_type}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-gray-400 pt-6">
                        Click Me for Card Creation
                      </div>
                    )}
                  </Card>
                  
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingCard && (
        <BingoCardEditDialog
          card={editingCard.card}
          index={editingCard.index}
          isOpen={true}
          onClose={() => setEditingCard(null)}
          onSave={(formData, index) => {
            if (!editingCard.card.id) {
              createNewCard(formData, index)
            } else {
              updateExistingCard(formData, index)
            }
          }}
        />
      )} 

      {selectedCard && (
        <GridPositionSelectDialog
          isOpen={true}
          onClose={() => setSelectedCard(null)}
          onSelect={handlePositionSelect}
          gridSize={gridSize}
          takenPositions={gridCards
            .map((card, index) => card.id ? index : -1)
            .filter(index => index !== -1)
          }
        />
      )}
    </div>
  )
}

export default BingoBoardEdit
