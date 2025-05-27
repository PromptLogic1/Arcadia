import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { BingoCard } from './types'

interface BingoGeneratorState {
  // State
  cardsForSelection: BingoCard[]
  selectedCards: BingoCard[]
  isLoading: boolean
  error: string | null
}

interface BingoGeneratorActions {
  // Actions
  setCardsForSelection: (cards: BingoCard[]) => void
  setSelectedCards: (cards: BingoCard[]) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearCardsForSelection: () => void
  clearSelectedCards: () => void
  reset: () => void
}

type BingoGeneratorStore = BingoGeneratorState & BingoGeneratorActions

const initialState: BingoGeneratorState = {
  cardsForSelection: [],
  selectedCards: [],
  isLoading: false,
  error: null,
}

export const useBingoGeneratorStore = create<BingoGeneratorStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // Actions
      setCardsForSelection: (cards) =>
        set(
          { cardsForSelection: cards },
          false,
          'setCardsForSelection'
        ),

      setSelectedCards: (cards) =>
        set(
          { selectedCards: cards },
          false,
          'setSelectedCards'
        ),

      setIsLoading: (loading) =>
        set(
          { isLoading: loading },
          false,
          'setIsLoading'
        ),

      setError: (error) =>
        set(
          { error },
          false,
          'setError'
        ),

      clearCardsForSelection: () =>
        set(
          { cardsForSelection: [] },
          false,
          'clearCardsForSelection'
        ),

      clearSelectedCards: () =>
        set(
          { selectedCards: [] },
          false,
          'clearSelectedCards'
        ),

      reset: () =>
        set(
          initialState,
          false,
          'reset'
        ),
    }),
    {
      name: 'bingo-generator-store',
    }
  )
)

// Selector hooks for better performance
export const useBingoGenerator = () => {
  const cardsForSelection = useBingoGeneratorStore((state) => state.cardsForSelection)
  const selectedCards = useBingoGeneratorStore((state) => state.selectedCards)
  const isLoading = useBingoGeneratorStore((state) => state.isLoading)
  const error = useBingoGeneratorStore((state) => state.error)

  return {
    cardsForSelection,
    selectedCards,
    isLoading,
    error,
  }
}

export const useBingoGeneratorActions = () => {
  const setCardsForSelection = useBingoGeneratorStore((state) => state.setCardsForSelection)
  const setSelectedCards = useBingoGeneratorStore((state) => state.setSelectedCards)
  const setIsLoading = useBingoGeneratorStore((state) => state.setIsLoading)
  const setError = useBingoGeneratorStore((state) => state.setError)
  const clearCardsForSelection = useBingoGeneratorStore((state) => state.clearCardsForSelection)
  const clearSelectedCards = useBingoGeneratorStore((state) => state.clearSelectedCards)
  const reset = useBingoGeneratorStore((state) => state.reset)

  return {
    setCardsForSelection,
    setSelectedCards,
    setIsLoading,
    setError,
    clearCardsForSelection,
    clearSelectedCards,
    reset,
  }
} 