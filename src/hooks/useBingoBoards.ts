import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@/src/store/hooks'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import type { BingoBoard, CreateBingoBoardDTO } from '@/src/store/types/bingoboard.types'
import {
  selectBoards,
  selectSelectedBoard,
  selectIsLoading,
  selectError
} from '@/src/store/selectors/bingoboardSelectors'
import {
  setSelectedBoardId,
  clearSelectedBoard
} from '@/src/store/slices/bingoboardSlice'

export function useBingoBoards() {
  const dispatch = useAppDispatch()
  
  // Selectors
  const boards = useSelector(selectBoards)
  const selectedBoard = useSelector(selectSelectedBoard)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  // Board selection
  const selectBoard = useCallback((boardId: string) => {
    dispatch(setSelectedBoardId(boardId))
  }, [dispatch])

  const clearBoard = useCallback(() => {
    dispatch(clearSelectedBoard())
  }, [dispatch])

  // Service methods
  const initializeBoards = useCallback(async () => {
    return bingoBoardService.initializeBoards()
  }, [])

  const createBoard = useCallback(async (boardData: CreateBingoBoardDTO) => {
    return bingoBoardService.createBoard(boardData)
  }, [])

  const getBoardById = useCallback(async (boardId: string) => {
    return bingoBoardService.getBoardById(boardId)
  }, [])

  const updateBoard = useCallback(async (boardId: string, updates: Partial<BingoBoard>) => {
    return bingoBoardService.updateBoard(boardId,  updates as BingoBoard )
  }, [])

  const deleteBoard = useCallback(async (boardId: string) => {
    return bingoBoardService.deleteBoard(boardId)
  }, [])

  const voteBoard = useCallback(async (boardId: string) => {
    return bingoBoardService.voteBoard(boardId)
  }, [])

  const cloneBoard = useCallback(async (boardId: string) => {
    return bingoBoardService.cloneBoard(boardId)
  }, [])

  return {
    // State
    boards,
    selectedBoard,
    isLoading,
    error,

    // Actions
    selectBoard,
    clearBoard,

    // Service methods
    initializeBoards,
    createBoard,
    getBoardById,
    updateBoard,
    deleteBoard,
    voteBoard,
    cloneBoard
  }
} 