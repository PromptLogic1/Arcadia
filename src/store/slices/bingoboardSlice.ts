import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BingoBoard } from '../types/bingoboard.types'
import { UUID } from 'crypto'

interface BingoBoardState {
  boards: BingoBoard[]
  selectedBoardId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: BingoBoardState = {
  boards: [],
  selectedBoardId: null,
  isLoading: false,
  error: null
}

const bingoBoardSlice = createSlice({
  name: 'bingoBoard',
  initialState,
  reducers: {
    setBingoBoards: (state, action: PayloadAction<BingoBoard[]>) => {
      state.boards = action.payload
    },
    setSelectedBoardId: (state, action: PayloadAction<string>) => {
      state.selectedBoardId = action.payload
    },
    clearSelectedBoard: (state) => {
      state.selectedBoardId = null
    },
    addBoard: (state, action: PayloadAction<BingoBoard>) => {
      state.boards.push(action.payload)
    },
    removeBoard: (state, action: PayloadAction<string>) => {
      state.boards = state.boards.filter(board => board.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    updateBoardLayoutId: (state, action: PayloadAction<{
      boardId: UUID,
      position: number,
      newCardId: UUID
    }>) => {
      const board = state.boards.find(b => b.id === action.payload.boardId)
      if (board) {
        const newLayout = [...board.board_layoutbingocards]
        newLayout[action.payload.position] = action.payload.newCardId
        board.board_layoutbingocards = newLayout
      }
    }
  }
})

export const {
  setBingoBoards,
  setSelectedBoardId,
  clearSelectedBoard,
  addBoard,
  removeBoard,
  setLoading,
  setError,
  updateBoardLayoutId
} = bingoBoardSlice.actions

export default bingoBoardSlice.reducer 