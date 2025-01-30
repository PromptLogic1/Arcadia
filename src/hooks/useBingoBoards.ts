import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '@/src/store/hooks'
import { bingoBoardService } from '@/src/store/services/bingoboard-service'
import type { BingoBoard, CreateBingoBoardDTO } from '@/src/store/types/bingoboard.types'
import {
  selectBoards,
  selectCurrentBoard,
  selectIsLoading,
  selectError
} from '@/src/store/selectors/bingoboardSelectors'

export function useBingoBoards() {
  const _dispatch = useAppDispatch()
  
  // Selectors
  const boards = useSelector(selectBoards)
  const currentBoard = useSelector(selectCurrentBoard)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

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
    currentBoard,
    isLoading,
    error,

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