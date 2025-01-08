import { RootState } from '../store'

// Auth Selectors
export const selectAuth = (state: RootState) => state.auth
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthUser = (state: RootState) => state.auth.authUser
export const selectUserData = (state: RootState) => state.auth.userdata
export const selectUserRole = (state: RootState) => state.auth.userdata?.role

// Bingo Board Selectors
export const selectBingoBoards = (state: RootState) => state.bingoBoard.boards
export const selectSelectedBoardId = (state: RootState) => state.bingoBoard.selectedBoardId
export const selectBingoBoardLoading = (state: RootState) => state.bingoBoard.isLoading
export const selectBingoBoardError = (state: RootState) => state.bingoBoard.error 