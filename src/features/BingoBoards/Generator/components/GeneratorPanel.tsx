import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wand2, RefreshCw } from 'lucide-react'
import { useGeneratorPanel } from '../../hooks/useGeneratorPanel'
import { CARD_CATEGORIES, GameCategory } from '@/src/store/types/game.types'
import { GENERATOR_CONFIG, GeneratorDifficulty } from '@/src/store/types/generator.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import LoadingSpinner from '@/components/ui/loading-spinner'

interface GeneratorPanelProps {
  gameCategory: GameCategory
  gridSize: number
}

export function GeneratorPanel({ gameCategory, gridSize }: GeneratorPanelProps) {
  const {
    isLoading,
    error,
    selectedCategories,
    difficulty,
    minVotes,
    poolSize,
    handleCategoriesChange,
    handleDifficultyChange,
    handleMinVotesChange,
    handlePoolSizeChange,
    generateBoard,
    reshuffleBoard
  } = useGeneratorPanel(gameCategory)

  const categoryOptions = CARD_CATEGORIES
    .filter(category => category)
    .map(category => ({
      value: category,
      label: category
    }))

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800/95 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-cyan-400">
            Board Generator Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Categories */}
          <div className="space-y-2">
            <Label>Card Categories</Label>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(GENERATOR_CONFIG.DIFFICULTY_LEVELS).map(diff => (
                  <SelectItem key={diff} value={diff}>
                    {diff}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pool Size */}
          <div className="space-y-2">
            <Label>Card Pool Size</Label>
            <Select
              value={poolSize}
              onValueChange={handlePoolSizeChange}
            >
              <SelectTrigger className="bg-gray-800/50 border-cyan-500/20">
                <SelectValue placeholder="Select pool size" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS).map(size => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Votes */}
          <div className="space-y-2">
            <Label>Minimum Votes</Label>
            <Input
              type="number"
              value={minVotes}
              onChange={(e) => handleMinVotesChange(parseInt(e.target.value) || 0)}
              className="bg-gray-800/50 border-cyan-500/20"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => generateBoard(gridSize)}
              disabled={isLoading}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 flex-1"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Board
                </>
              )}
            </Button>
            <Button
              onClick={() => reshuffleBoard(gridSize)}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}