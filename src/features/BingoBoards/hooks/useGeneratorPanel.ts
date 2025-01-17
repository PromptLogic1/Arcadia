import { useState, useCallback } from 'react'
import { bingoGeneratorService } from '@/src/store/services/bingogenerator-service'
import { useSelector } from 'react-redux'
import { selectIsLoading, selectError } from '@/src/store/selectors/bingogeneratorSelectors'
import type { GameCategory, CardCategory} from '@/src/store/types/game.types'
import { GENERATOR_CONFIG, GeneratorDifficulty } from '@/src/store/types/generator.types'
import { GeneratorSettings } from '@/src/store/types/generator.types'

interface UseGeneratorPanel {
  isLoading: boolean
  error: string | null
  selectedCategories: CardCategory[]
  difficulty: GeneratorDifficulty
  minVotes: number
  poolSize: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS
  handleCategoriesChange: (categories: CardCategory[]) => void
  handleDifficultyChange: (difficulty: GeneratorDifficulty) => void
  handleMinVotesChange: (votes: number) => void
  handlePoolSizeChange: (size: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS) => void
  generateBoard: (gridSize: number) => Promise<void>
  reshuffleBoard: (gridSize: number) => Promise<void>
}

export function useGeneratorPanel(gameCategory: GameCategory): UseGeneratorPanel {
  // Local state for generator settings
  const [selectedCategories, setSelectedCategories] = useState<CardCategory[]>([])
  const [difficulty, setDifficulty] = useState<GeneratorDifficulty>('MEDIUM')
  const [minVotes, setMinVotes] = useState(0)
  const [poolSize, setPoolSize] = useState<keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS>('MEDIUM')

  // Redux state
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  // Handlers for settings changes
  const handleCategoriesChange = useCallback((categories: CardCategory[]) => {
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
  const generateBoard = useCallback(async (gridSize: number) => {
    const settings: GeneratorSettings = {
      difficulty,
      cardPoolSize: poolSize,
      minVotes,
      selectedCategories,
      gameCategory,
      publicCards: 'all'
    }

    await bingoGeneratorService.generateBingoBoard(settings, gridSize)
  }, [difficulty, poolSize, minVotes, selectedCategories, gameCategory])

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
