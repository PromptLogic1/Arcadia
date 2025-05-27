import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wand2, X } from 'lucide-react'
import { useGeneratorPanel } from '../../hooks/useGeneratorPanel'
import { GameCategory } from '@/src/types'
import { GENERATOR_CONFIG } from '@/src/store/types/generator.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useState } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { Checkbox } from "@/components/ui/checkbox"

interface GeneratorPanelProps {
  gameCategory: GameCategory
  gridSize: number
}

const ErrorFeedback = ({ error }: { error: string }) => {
  // Extract useful information from error stack
  const errorMessage = error.includes('No cards available') 
    ? 'No cards found with current settings'
    : error.includes('Not enough cards')
    ? error
    : 'Failed to generate board'

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mt-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <X className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-400">
            Generation Failed
          </h3>
          <div className="mt-2 text-sm text-red-400/90">
            <p>{errorMessage}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-red-400/70">
              <li>Try selecting different categories</li>
              <li>Adjust difficulty settings</li>
              <li>Include both public and private cards</li>
              <li>Reduce minimum votes requirement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GeneratorPanel({ gameCategory, gridSize }: GeneratorPanelProps) {
  const [localCategories, setLocalCategories] = useState<CardCategory[]>([])
  const [usePrivateCards, setUsePrivateCards] = useState(true)
  const [usePublicCards, setUsePublicCards] = useState(true)
  const [useAllCategories, setUseAllCategories] = useState(true)
  const generatorPanel = useGeneratorPanel(
    gameCategory, 
    gridSize,
    usePublicCards,
    usePrivateCards
  )

  const handleCategorySelect = (category: string) => {
    if (!useAllCategories) {
      const newCategories = localCategories.includes(category as CardCategory)
        ? localCategories.filter(c => c !== category)
        : [...localCategories, category as CardCategory]
      
      setLocalCategories(newCategories)
      generatorPanel.handleCategoriesChange(newCategories)
    }
  }

  const handleAllCategoriesChange = (checked: boolean) => {
    setUseAllCategories(checked)
    if (checked) {
      setLocalCategories([])
      generatorPanel.handleCategoriesChange([...CARD_CATEGORIES])
    } else {
      setLocalCategories([])
      generatorPanel.handleCategoriesChange([])
    }
  }

  return (
    <Card className="bg-gray-800/30 border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-cyan-400">
          Board Generator Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card Categories Section */}
        <div className="space-y-2">
          <Label>Card Categories</Label>
          
          {/* Use All Categories Checkbox */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox 
              id="all-categories"
              checked={useAllCategories}
              onCheckedChange={handleAllCategoriesChange}
            />
            <label
              htmlFor="all-categories"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Use All Categories
            </label>
          </div>

          {/* Only show category selection when not using all categories */}
          {!useAllCategories && (
            <>
              <Select
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-cyan-500/20">
                  {CARD_CATEGORIES.map(category => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      className="hover:bg-cyan-500/20 focus:bg-cyan-500/20"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Categories Display */}
              {!useAllCategories && localCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {localCategories.map(category => (
                    <Badge 
                      key={category}
                      variant="secondary" 
                      className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    >
                      {category}
                      <button
                        className="ml-1 hover:text-cyan-300"
                        onClick={() => handleCategorySelect(category)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rest of your existing controls */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select
            value={generatorPanel.difficulty}
            onValueChange={generatorPanel.handleDifficultyChange}
          >
            <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-cyan-500/20">
              {Object.keys(GENERATOR_CONFIG.DIFFICULTY_LEVELS).map(diff => (
                <SelectItem 
                  key={diff} 
                  value={diff}
                  className="hover:bg-cyan-500/20 focus:bg-cyan-500/20"
                >
                  {diff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pool Size */}
        <div className="space-y-2">
          <Label>Pool Size</Label>
          <Select
            value={generatorPanel.poolSize}
            onValueChange={generatorPanel.handlePoolSizeChange}
          >
            <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
              <SelectValue placeholder="Select pool size" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-cyan-500/20">
              {Object.keys(GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS).map(size => (
                <SelectItem 
                  key={size} 
                  value={size}
                  className="hover:bg-cyan-500/20 focus:bg-cyan-500/20"
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Minimum Votes */}
        <div className="space-y-2">
          <Label>Minimum Votes</Label>
          <Input
            type="number"
            value={generatorPanel.minVotes}
            onChange={(e) => generatorPanel.handleMinVotesChange(parseInt(e.target.value) || 0)}
            className="bg-gray-800/50 border-cyan-500/20"
            min={0}
          />
        </div>

        {/* Card Sources */}
        <div className="space-y-3 pt-2">
          <Label>Card Sources</Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="private-cards"
                checked={usePrivateCards}
                onCheckedChange={(checked) => setUsePrivateCards(checked as boolean)}
              />
              <label
                htmlFor="private-cards"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use Private Cards
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="public-cards"
                checked={usePublicCards}
                onCheckedChange={(checked) => setUsePublicCards(checked as boolean)}
              />
              <label
                htmlFor="public-cards"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use Public Cards
              </label>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generatorPanel.generateBoard}
          disabled={
            generatorPanel.isLoading || 
            (!useAllCategories && localCategories.length === 0) || 
            (!usePrivateCards && !usePublicCards)
          }
          className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          {generatorPanel.isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Board
            </>
          )}
        </Button>

        {generatorPanel.error && <ErrorFeedback error={generatorPanel.error} />}
      </CardContent>
    </Card>
  )
}