import { RootState } from '../store'
import type { BingoBoard } from '../types/bingoboard.types'

// Base selectors
export const selectBingoBoardState = (state: RootState) => state.bingoBoard

// Derived selectors
export const selectBoards = (state: RootState): BingoBoard[] => 
  selectBingoBoardState(state).boards

export const selectSelectedBoardId = (state: RootState): string | null => 
  selectBingoBoardState(state).selectedBoardId

export const selectIsLoading = (state: RootState): boolean => 
  selectBingoBoardState(state).isLoading

export const selectError = (state: RootState): string | null => 
  selectBingoBoardState(state).error

// Computed selectors
export const selectSelectedBoard = (state: RootState): BingoBoard | null => {
  const boards = selectBoards(state)
  const selectedId = selectSelectedBoardId(state)
  return selectedId ? boards.find(board => board.id === selectedId) ?? null : null
}
