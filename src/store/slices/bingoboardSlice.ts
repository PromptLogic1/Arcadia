import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BingoBoard } from '../types/bingoboard.types'

interface BingoBoardState {
  boards: BingoBoard[]
  selectedBoard: BingoBoard['id'] | null
  isLoading: boolean
  error: string | null
}

const initialState: BingoBoardState = {
  boards: [],
  selectedBoard: null,
  isLoading: false,
  error: null
}

export const bingoBoardSlice = createSlice({
  name: 'bingoBoard',
  initialState,
  reducers: {
    setBingoBoards: (state, action: PayloadAction<BingoBoard[]>) => {
      state.boards = action.payload
      state.error = null
    },
    setSelectedBoard: (state, action: PayloadAction<BingoBoard['id'] | null>) => {
      state.selectedBoard = action.payload
      state.error = null
    },
    clearSelectedBoard: (state) => {
      state.selectedBoard = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearBingoBoards: (state) => {
      state.boards = []
      state.selectedBoard = null
      state.error = null
    }
  }
})

export const {
  setBingoBoards,
  setSelectedBoard,
  clearSelectedBoard,
  setLoading,
  setError,
  clearBingoBoards
} = bingoBoardSlice.actions

export default bingoBoardSlice.reducer 