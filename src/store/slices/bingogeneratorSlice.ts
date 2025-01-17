import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BingoCard } from '../types/bingocard.types'

interface BingoGeneratorState {
    cardsforselection: BingoCard[]
    selectedCards: BingoCard[]
    isLoading: boolean
    error: string | null
}

const initialState: BingoGeneratorState = {
    cardsforselection: [],
    selectedCards: [],
    isLoading: false,
    error: null
}

const bingogeneratorSlice = createSlice({
    name: 'bingogenerator',
    initialState,
    reducers: {
        setCardsForSelection: (state, action: PayloadAction<BingoCard[]>) => {
            state.cardsforselection = action.payload
        },
        setSelectedCards: (state, action: PayloadAction<BingoCard[]>) => {
            state.selectedCards = action.payload
        },
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        clearCardsForSelection: (state) => {
            state.cardsforselection = []
        },
        clearSelectedCards: (state) => {
            state.selectedCards = []
        }
    }
})

export const {
    setCardsForSelection,
    setSelectedCards,
    setIsLoading,
    setError,
    clearCardsForSelection,
    clearSelectedCards
} = bingogeneratorSlice.actions

export default bingogeneratorSlice.reducer

