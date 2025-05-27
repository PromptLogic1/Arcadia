'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
import { cn } from '@/lib/utils'
import { notifications } from '@/src/lib/notifications'
import { ChevronDown, Settings, Plus, X } from 'lucide-react'
import LoadingSpinner from "@/components/ui/loading-spinner"
import NeonText from "@/components/ui/NeonText"
import { ROUTES } from '@/src/config/routes'
import { BingoCardPreview } from './BingoCard'
import { BingoCardPublic } from './BingoCardPublic'
import { FilterBingoCards } from './FilterBingoCards'
import { GeneratorPanel } from '../Generator/GeneratorPanel'
import { BingoCardEditDialog } from './BingoCardEditDialog'
import { GridPositionSelectDialog } from './GridPositionSelectDialog'
import { useBingoBoardEdit } from '../../hooks/useBingoBoardEdit'
import { useBingoCardsStore, useBingoCardsActions } from '@/lib/stores/bingo-cards-store'
import { useAuth } from '@/src/hooks/useAuth'
import type { 
  BingoCard, 
  Difficulty,
  FilterOptions
} from '@/types'
import { DIFFICULTIES, DIFFICULTY_STYLES, DEFAULT_BINGO_CARD } from '@/types'
import { log } from "@/lib/logger"

interface BingoBoardEditProps {
  boardId: string
  onSaveSuccess?: () => void
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
  const [editingCard, setEditingCard] = useState<{ card: BingoCard; index: number } | null>(null)
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const { isAuthenticated, loading: isAuthLoading } = useAuth()

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
    initializeBoard,
  } = useBingoBoardEdit(boardId)

  const { publicCards, loading: isLoadingPublicCards } = useBingoCardsStore()
  const {
    initializePublicCards,
    filterPublicCards,
    voteCard,
    updateGridCard
  } = useBingoCardsActions()
  const [_activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      initializeBoard()
    }
  }, [isAuthLoading, isAuthenticated, boardId, initializeBoard])

  const handleClose = () => {
    router.push(ROUTES.CHALLENGE_HUB)
  }

  const handleSaveClick = async () => {
    try {
      setIsSaving(true)
      const success = await handleSave()
      if (success) {
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 3000)
        onSaveSuccess?.()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCardSelect = (card: BingoCard) => {
    // Check if card is already in grid
    const isCardInGrid = gridCards.some(gc => gc.id === card.id)
    if (isCardInGrid) {
              notifications.cardAlreadyInGrid()
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
    if (!currentBoard) {
      log.error('Cannot create card: Board not initialized', undefined, { component: 'BingoBoardEdit' })
      return
    }

    setEditingCard({
      card: {
        ...DEFAULT_BINGO_CARD,
        game_type: currentBoard.game_type
      } as BingoCard,
      index: -1 // Use -1 to indicate this is a new card
    })
  }

  const handleTabChange = async (value: string) => {
    setActiveTab(value)
    if (value === 'public' && currentBoard) {
      await initializePublicCards(currentBoard.game_type)
    }
  }

  if (isAuthLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold text-cyan-400">
          Please log in to view and edit Bingo Boards
        </h2>
        {/* ... auth buttons ... */}
      </div>
    )
  }

  if (isLoadingBoard || isLoadingCards) {
    return <LoadingSpinner />
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!currentBoard || !formData) {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 break-words" style={{ wordBreak: 'break-word' }}>
            <NeonText>{formData.board_title}</NeonText>
          </h1>
        </div>
        <div className="flex items-center flex-wrap justify-between  w-full">
          <div className="flex items-center gap-4 mb-4">
            <Badge 
              variant="outline" 
              className="bg-gray-800/50 border-cyan-500/50 text-cyan-400"
            >
              {currentBoard.game_type}
            </Badge>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Back to Boards
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={Object.values(fieldErrors).some(error => error !== undefined) || isSaving}
              className={cn(
                "bg-gradient-to-r from-cyan-500 to-fuchsia-500",
                (Object.values(fieldErrors).some(error => error !== undefined) || isSaving) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner/>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-6 justify-center">
        <div className="flex flex-col" style={{ maxWidth: '310px', minWidth: '310px' }}>
          <Tabs defaultValue="private" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="w-full mb-4 bg-gray-800/50 border border-cyan-500/20">
              <div className="flex flex-start w-full" style={{ justifyContent: 'space-around' }}>
                <TabsTrigger 
                  value="private"
                  className={cn(
                    "transition-all duration-200",
                    "data-[state=active]:bg-cyan-500/20",
                    "data-[state=active]:text-cyan-400",
                    "data-[state=active]:border-b-2",
                    "data-[state=active]:border-cyan-500",
                    "hover:text-cyan-400",
                    "p-0"
                  )}
                >
                  Private Cards
                </TabsTrigger>
                <TabsTrigger 
                  value="public"
                  className={cn(
                    "transition-all duration-200",
                    "data-[state=active]:bg-cyan-500/20",
                    "data-[state=active]:text-cyan-400",
                    "data-[state=active]:border-b-2",
                    "data-[state=active]:border-cyan-500",
                    "hover:text-cyan-400",
                    "p-0"
                  )}
                >
                  Public Cards
                </TabsTrigger>
                <TabsTrigger 
                  value="generator"
                  className={cn(
                    "transition-all duration-200",
                    "data-[state=active]:bg-cyan-500/20",
                    "data-[state=active]:text-cyan-400",
                    "data-[state=active]:border-b-2",
                    "data-[state=active]:border-cyan-500",
                    "hover:text-cyan-400",
                    "p-0"
                  )}
                >
                  Generator
                </TabsTrigger>
              </div>
            </TabsList>

            <TabsContent value="private" className="mt-2">
              <div className="flex items-center mb-3">
                <Button
                  onClick={handleCreateNewCard}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 w-full"
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
                    <div>
                      {cards.map((card) => (
                        <BingoCardPreview
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
            </TabsContent>

            <TabsContent value="public" className="mt-2">
              <FilterBingoCards 
                onFilter={async (filters: FilterOptions) => {
                  if (currentBoard) {
                    await filterPublicCards(filters, currentBoard.game_type)
                  }
                }}
                onClear={async () => {
                  if (currentBoard) {
                    await initializePublicCards(currentBoard.game_type)
                  }
                }}
              />
              <ScrollArea className="min-h-[calc(100vh-12rem)]">
                <div className="space-y-2 pr-3">
                  {isLoadingPublicCards ? (
                    <div className="flex items-center justify-center h-20">
                      <LoadingSpinner />
                    </div>
                  ) : publicCards.length === 0 ? (
                    <div className="min-h-[200px] flex items-center justify-center text-gray-400">
                      No public cards available for this game
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {publicCards.map((card: BingoCard) => (
                        <BingoCardPublic
                          key={card.id}
                          card={card}
                          onSelect={handleCardSelect}
                          onVote={async (card: BingoCard) => {
                            await voteCard(card.id)
                            if (currentBoard) {
                              await initializePublicCards(currentBoard.game_type)
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="generator" className="mt-2">
              <GeneratorPanel 
                gameCategory={currentBoard.game_type}
                gridSize={currentBoard.size || 5}
              />
            </TabsContent>
          </Tabs>
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
                  <span className="text-lg font-semibold text-cyan-400">Board Settings</span>
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
                      ({formData?.board_title?.length || 0}/50)
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
                    ({formData?.board_description?.length || 0}/255)
                  </span>
                </Label>
                <Textarea
                  id="board_description"
                  value={formData.board_description}
                  onChange={(e) => updateFormField('board_description', e.target.value)}
                  placeholder="Enter board description"
                  className="min-h-[100px] bg-gray-800/50 border-cyan-500/20 break-words"
                />
                {fieldErrors.description && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="board_tags">
                  Tags
                  <span className="text-xs text-gray-400 ml-2">
                    ({formData?.board_tags?.length || 0}/5)
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
              <div className="flex flex-wrap gap-2 mx-auto p-4 bg-gray-900/30 rounded-lg"
                style={{
                  maxWidth: `${gridSize * 196}px`,
                  justifyContent: 'center'
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
                    
                    {card.id && (
                      <div className="absolute text-xs text-red-400 font-mono z-10 bg-gray-900/50 hover:bg-red-500/20 px-1 rounded cursor-pointer border border-red-500/20" style={{ top: '0.25rem', right: '0.5rem' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateGridCard(index, { ...DEFAULT_BINGO_CARD } as BingoCard)
                        }}
                      >
                        <X className="h-4 w-4 inline-block" />
                      </div>
                    )}

                    {card.id ? (
                      <div className="flex flex-col items-center h-full pt-6">
                        <div className={cn(
                          "w-full text-center text-xs border-b border-gray-700 pb-1",
                          DIFFICULTY_STYLES[card.difficulty as Difficulty]
                        )}>
                          {card.difficulty}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-center px-1 text-sm break-words overflow-break-word" style={{ wordBreak: 'break-word' }}>
                          {card.title}
                        </div>
                        <div className="w-full text-center text-xs text-gray-400 border-t border-gray-700 pt-1">
                          {card.tags?.join(', ') || 'No tags'}
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

      {showSaveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-md shadow-lg animate-fade-in">
          Changes saved successfully!
        </div>
      )}
    </div>
  )
}

export default BingoBoardEdit
