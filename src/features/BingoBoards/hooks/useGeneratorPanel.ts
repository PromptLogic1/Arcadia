import { useState, useCallback } from 'react'
import { bingoGeneratorService } from '@/src/store/services/bingogenerator-service'
import type { GameCategory, CardCategory } from '@/src/store/types/game.types'
import { CARD_CATEGORIES } from '@/src/store/types/game.types'
import { GENERATOR_CONFIG, GeneratorDifficulty } from '@/src/store/types/generator.types'
import { GeneratorSettings } from '@/src/store/types/generator.types'

interface UseGeneratorPanel {
  isLoading: boolean
  error: string | null
  selectedCategories: CardCategory[]
  difficulty: GeneratorDifficulty
  minVotes: number
  poolSize: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS
  handleCategoriesChange: (selectedCategories: CardCategory[]) => void
  handleDifficultyChange: (difficulty: GeneratorDifficulty) => void
  handleMinVotesChange: (votes: number) => void
  handlePoolSizeChange: (size: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS) => void
  generateBoard: () => Promise<void>
  reshuffleBoard: (gridSize: number) => Promise<void>
}

export function useGeneratorPanel(
  gameCategory: GameCategory, 
  gridSize: number,
  usePublicCards: boolean,
  usePrivateCards: boolean
): UseGeneratorPanel {
  // Local state for generator settings
  const [selectedCategories, setSelectedCategories] = useState<CardCategory[]>([...CARD_CATEGORIES])
  const [difficulty, setDifficulty] = useState<GeneratorDifficulty>('Medium')
  const [minVotes, setMinVotes] = useState(0)
  const [poolSize, setPoolSize] = useState<keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS>('Medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handlers for settings changes
  const handleCategoriesChange = useCallback((categories: CardCategory[]) => {
    console.log('Selected Categories:', categories)
    setSelectedCategories(categories)
  }, [])

  const handleDifficultyChange = useCallback((diff: GeneratorDifficulty) => {
    setDifficulty(diff)
  }, [])

  const handleMinVotesChange = useCallback((votes: number) => {
    setMinVotes(votes)
  }, [])

  const handlePoolSizeChange = useCallback((size: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS) => {
    setPoolSize(size)
  }, [])

  // Generate new board
  const generateBoard = async () => {
    try {
      setIsLoading(true)
      const settings: GeneratorSettings = {
        difficulty,
        cardPoolSize: poolSize,
        minVotes,
        selectedCategories,
        gameCategory,
        cardSource: usePublicCards && usePrivateCards ? 'publicprivate' 
                   : usePublicCards ? 'public'
                   : 'private'
      }

      await bingoGeneratorService.generateBingoBoard(settings, gridSize)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate board')
    } finally {
      setIsLoading(false)
    }
  }

  // Reshuffle existing board
  const reshuffleBoard = useCallback(async (gridSize: number) => {
    await bingoGeneratorService.reshuffleBoard(gridSize)
  }, [])

  return {
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
  }
}
