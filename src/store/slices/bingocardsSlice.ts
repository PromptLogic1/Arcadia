import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BingoCard } from '../types/bingocard.types'

interface BingoCardsState {
  cards: BingoCard[]
  publiccards: BingoCard[]
  gridcards: BingoCard[],
  selectedCardId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: BingoCardsState = {
  cards: [],
  publiccards: [],
  gridcards: [],
  selectedCardId: null,
  isLoading: false,
  error: null,

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
    setBingoGridCards: (state, action: PayloadAction<BingoCard[]>) => {
      state.gridcards = action.payload
    },
    clearBingoGridCards: (state) => {
      state.gridcards = []
    },
    setGridCards: (state, action: PayloadAction<BingoCard[]>) => {
      state.gridcards = action.payload
    },
    setPublicCards: (state, action: PayloadAction<BingoCard[]>) => {
      state.publiccards = action.payload
    },
    clearPublicCards: (state) => {
      state.publiccards = []
    },
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
  setBingoGridCards,
  clearBingoGridCards,
  setGridCards,
  setPublicCards,
  clearPublicCards
} = bingoCardsSlice.actions

export default bingoCardsSlice.reducer 