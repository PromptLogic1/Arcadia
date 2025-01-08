import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { bingoBoardService as services } from '../store/services/bingoboard-service'
import { 
  selectBingoBoards,
  selectSelectedBoard,
  selectBingoBoardLoading,
  selectBingoBoardError
} from '../store/selectors'
import {
  setSelectedBoard,
  clearSelectedBoard
} from '../store/slices/bingoboardSlice'
import {
  BingoBoard,
  CreateBingoBoardDTO
} from '../store/types/bingoboard.types'

export const useBingoBoards = () => {
  const dispatch = useAppDispatch()
  
  // Selectors
  const boards = useAppSelector(selectBingoBoards)
  const selectedBoardId = useAppSelector(selectSelectedBoard)
  const isLoading = useAppSelector(selectBingoBoardLoading)
  const error = useAppSelector(selectBingoBoardError)

  // Get selected board data
  const selectedBoard = selectedBoardId 
    ? boards.find(board => board.id === selectedBoardId)
    : null

  // Board selection actions
  const selectBoard = useCallback((boardId: string) => {
    dispatch(setSelectedBoard(boardId))
  }, [dispatch])

  const clearBoard = useCallback(() => {
    dispatch(clearSelectedBoard())
  }, [dispatch])

  // Initialize boards
  const initializeBoards = useCallback(async () => {
    return services.initializeBoards()
  }, [])

  // Get board by ID
  const getBoardById = useCallback(async (boardId: string): Promise<BingoBoard | null> => {
    return services.getBoardById(boardId)
  }, [])

  // Create new board
  const createBoard = useCallback(async (boardData: CreateBingoBoardDTO) => {
    try {
      const newBoard = await services.createBoard(boardData)
      if (!newBoard) {
        throw new Error('Failed to create board')
      }
      return newBoard
    } catch (error) {
      throw error
    }
  }, [])

  // Update board
  const updateBoard = useCallback(async (boardId: string, updates: BingoBoard) => {
    return services.updateBoard(boardId, updates)
  }, [])

  // Delete board
  const deleteBoard = useCallback(async (boardId: string) => {
    return services.deleteBoard(boardId)
  }, [])

  // Vote for board
  const voteBoard = useCallback(async (boardId: string) => {
    return services.voteBoard(boardId)
  }, [])

  // Clone board
  const cloneBoard = useCallback(async (boardId: string) => {
    return services.cloneBoard(boardId)
  }, [])

  return {
    // State
    boards,
    selectedBoard,
    selectedBoardId,
    isLoading,
    error,

    // Selection actions
    selectBoard,
    clearBoard,

    // Board operations
    initializeBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
    voteBoard,
    cloneBoard,
  }
} 