import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  CardCategory, 
  CARD_CATEGORIES, 
  Difficulty, 
  DIFFICULTIES
} from '@/src/store/types/game.types'
import { X } from 'lucide-react'
import { useState } from "react"
import { bingoCardService } from "@/src/store/services/bingocard-service"

interface FilterBingoCardsProps {
  onFilter: (filters: FilterOptions) => void
  onClear: () => void
}

// Helper type to add 'all' to our existing types
type WithAllCardCategory<T extends string> = T | 'All Categories'
type WithAllDifficulty<T extends string> = T | 'All Difficulties'

// Update interface to use enhanced types
export interface FilterOptions {
  cardType?: WithAllCardCategory<CardCategory>
  difficulty?: WithAllDifficulty<Difficulty>
}

export function FilterBingoCards({ onFilter, onClear }: FilterBingoCardsProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleFilter = async () => {
    try {
      setIsLoading(true)
      // Only call filterPublicCards if we have actual filters set
      if (filters.cardType || filters.difficulty) {
        await bingoCardService.filterPublicCards(filters)
      } else {
        // If no filters are set, just load all cards
        await bingoCardService.initializePublicCards()
      }
      onFilter(filters)
    } catch (error) {
      console.error('Error applying filters:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleClear = async () => {
    try {
      setIsLoading(true)
      setFilters({
        cardType: 'All Categories',
        difficulty: 'All Difficulties'
      })
      await bingoCardService.initializePublicCards()
      onClear()
    } catch (error) {
      console.error('Error clearing filters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-gray-800/30 rounded-lg mb-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Select
            defaultValue="All Categories"
            value={filters.cardType}
            onValueChange={(value: WithAllCardCategory<CardCategory>) => 
              setFilters(prev => ({ ...prev, cardType: value }))
            }
            disabled={isLoading}
          >
            <SelectTrigger className="bg-gray-800/50 border-cyan-500/50">
              <SelectValue placeholder="Card Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-cyan-500">
              <SelectItem value="All Categories">All Types</SelectItem>
              {CARD_CATEGORIES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            defaultValue="All Difficulties"
            value={filters.difficulty}
            onValueChange={(value: WithAllDifficulty<Difficulty>) => 
              setFilters(prev => ({ ...prev, difficulty: value }))
            }
            disabled={isLoading}
          >
            <SelectTrigger className="bg-gray-800/50 border-cyan-500/50">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-cyan-500">
              <SelectItem value="All Difficulties">All Difficulties</SelectItem>
              {DIFFICULTIES.map((difficulty) => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="gap-1"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleFilter}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Apply Filters'}
        </Button>
      </div>
    </div>
  )
} 