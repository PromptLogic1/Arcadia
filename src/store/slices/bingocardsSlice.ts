import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BingoCard } from '../types/bingocard.types'
import { UUID } from 'crypto'

interface GridCard extends BingoCard {
  isEdited?: boolean      // Optional machen
  isNew?: boolean         // Optional machen
  originalId?: UUID      // Bereits optional
}

interface BingoCardsState {
  cards: BingoCard[]
  selectedCardId: string | null
  isLoading: boolean
  error: string | null
  grid: {
    cards: GridCard[]
    size: number | null
    isDirty: boolean
  }
}

const initialState: BingoCardsState = {
  cards: [],
  selectedCardId: null,
  isLoading: false,
  error: null,
  grid: {
    cards: [],
    size: null,
    isDirty: false
  }
}

const bingoCardsSlice = createSlice({
  name: 'bingoCards',
  initialState,
  reducers: {
    setBingoCards: (state, action: PayloadAction<BingoCard[]>) => {
      state.cards = action.payload
    },
    setSelectedCardId: (state, action: PayloadAction<string>) => {
      state.selectedCardId = action.payload
    },
    clearSelectedCard: (state) => {
      state.selectedCardId = null
    },
    addCard: (state, action: PayloadAction<BingoCard>) => {
      state.cards.push(action.payload)
    },
    removeCard: (state, action: PayloadAction<string>) => {
      state.cards = state.cards.filter(card => card.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    updateCard: (state, action: PayloadAction<{ index: number, card: BingoCard }>) => {
      state.cards[action.payload.index] = action.payload.card
    },
    clearCards: (state) => {
      state.cards = []
    },
    initializeGrid: (state, action: PayloadAction<{ size: number, cards: BingoCard[] }>) => {
      state.grid.size = action.payload.size
      state.grid.cards = action.payload.cards.map(card => ({
        ...card,
        isEdited: false,
        isNew: false
      }))
      state.grid.isDirty = false
    },
    updateGridCard: (state, action: PayloadAction<{ index: number, content: string }>) => {
      const card = state.grid.cards[action.payload.index]
      if (!card) return // Early return wenn keine Karte gefunden

      if (card.id === '') {
        state.grid.cards[action.payload.index] = {
          ...card,
          card_content: action.payload.content,
          isNew: true,
          isEdited: true
        }
      } else {
        state.grid.cards[action.payload.index] = {
          ...card,
          card_content: action.payload.content,
          isEdited: true,
          originalId: card.id as UUID
        }
      }
      state.grid.isDirty = true
    },
    clearGrid: (state) => {
      state.grid = initialState.grid
    }
  }
})

export const {
  setBingoCards,
  setSelectedCardId,
  clearSelectedCard,
  addCard,
  removeCard,
  setLoading,
  setError,
  updateCard,
  clearCards,
  initializeGrid,
  updateGridCard,
  clearGrid
} = bingoCardsSlice.actions

export default bingoCardsSlice.reducer 