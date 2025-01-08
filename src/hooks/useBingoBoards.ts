import { useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { bingoBoardService as services } from '../store/services/bingoboard-service'
import { 
  selectBingoBoards,
  selectSelectedBoard,
  selectBingoBoardLoading,
  selectBingoBoardError
} from '../store/selectors'
import { CreateBingoBoardDTO, UpdateBingoBoardDTO } from '../store/types/bingoboard.types'

export const useBingoBoards = () => {
  const dispatch = useAppDispatch()
  
  // Selectors
  const boards = useAppSelector(selectBingoBoards)
  const selectedBoard = useAppSelector(selectSelectedBoard)
  const isLoading = useAppSelector(selectBingoBoardLoading)
  const error = useAppSelector(selectBingoBoardError)

  // Service methods wrapped in hooks
  const createBoard = useCallback(async (boardData: CreateBingoBoardDTO) => {
    return services.createBoard(boardData)
  }, [])

  const updateBoard = useCallback(async (boardId: string, updates: UpdateBingoBoardDTO) => {
    return services.updateBoard(boardId, updates)
  }, [])

  return {
    boards,
    selectedBoard,
    isLoading,
    error,
    createBoard,
    updateBoard,
  }
} 