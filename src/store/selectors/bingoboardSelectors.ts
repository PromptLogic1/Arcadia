import { RootState } from '../store'

export const selectBoards = (state: RootState) => state.bingoBoard.boards
export const selectCurrentBoard = (state: RootState) => state.bingoBoard.currentBoard
export const selectIsLoading = (state: RootState) => state.bingoBoard.isLoading
export const selectError = (state: RootState) => state.bingoBoard.error
