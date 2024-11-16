'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BoardCell, Player } from '../types/types'
import type { 
  GamePhase, 
  LastMove, 
  MarkedFields, 
  GameError,
  BeforeMoveEvent,
  AfterMoveEvent,
  GameEndEvent
} from '../types/bingogame.types'
import { BINGO_GAME_CONSTANTS } from '../types/bingogame.constants'
import { useGameAnalytics } from './useGameAnalytics'
import { useSession } from './useSession'

// Add constants
const CONSTANTS = {
  CLEANUP_DELAY: 300, // ms
  MIN_PLAYERS: 2,
  MAX_BOARD_SIZE: 6,
  PERFORMANCE_CHECK_INTERVAL: 1000, // ms
  MAX_RETRIES: 3,
  MIN_BOARD_SIZE: 3
} as const

// Add return type interface
interface UseBingoGameReturn {
  // States
  boardState: BoardCell[]
  gamePhase: GamePhase
  winner: number | null
  currentPlayer: number
  lastMove: LastMove
  markedFields: MarkedFields
  gameError: GameError | null
  
  // Settings
  boardSize: number
  setBoardSize: (size: number) => void
  winConditions: { line: boolean; majority: boolean }
  setWinConditions: (conditions: { line: boolean; majority: boolean }) => void
  
  // Actions & Error Handling
  setBoardState: (state: BoardCell[]) => void
  checkWinningCondition: (players: Player[], timeExpired?: boolean) => boolean
  emitBeforeMove: (event: BeforeMoveEvent) => boolean
  emitAfterMove: (event: AfterMoveEvent) => void
  handleError: (error: Error) => void
  clearError: () => void
  
  // Board Management
  generateBoard: () => void
  resetBoard: () => void
  handleCellChange: (index: number, value: string) => void
  updateBoardState: (index: number, updates: Partial<BoardCell>) => void
}

/**
 * Hook for managing bingo game state and logic
 * @param initialSize - Initial board size (3-6)
 * @param players - Array of active players
 * @returns Game state and control functions
 */
export const useBingoGame = (initialSize: number, players: Player[]): UseBingoGameReturn => {
  // Validate inputs
  if (players.length < CONSTANTS.MIN_PLAYERS) {
    throw new Error(`Minimum ${CONSTANTS.MIN_PLAYERS} players required`)
  }

  if (initialSize < CONSTANTS.MIN_BOARD_SIZE || initialSize > CONSTANTS.MAX_BOARD_SIZE) {
    throw new Error(`Board size must be between ${CONSTANTS.MIN_BOARD_SIZE} and ${CONSTANTS.MAX_BOARD_SIZE}`)
  }

  // Move handleError declaration to the top
  const [gameError, setGameError] = useState<GameError | null>(null)
  
  const handleError = useCallback((error: Error) => {
    console.error('Game error:', error)
    setGameError({
      type: BINGO_GAME_CONSTANTS.ERROR_TYPES.INVALID_GAME_STATE,
      message: error.message,
      recoverable: true
    })
  }, [])

  // Core States
  const [boardState, setBoardState] = useState<BoardCell[]>([])
  const [gamePhase, setGamePhase] = useState<GamePhase>('active')
  const [winner, setWinner] = useState<number | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)
  const [boardSize, setBoardSize] = useState<number>(
    Math.max(
      BINGO_GAME_CONSTANTS.VALIDATION.MIN_BOARD_SIZE,
      Math.min(initialSize, BINGO_GAME_CONSTANTS.VALIDATION.MAX_BOARD_SIZE)
    )
  )
  const [lastMove, setLastMove] = useState<LastMove>(null)
  const [markedFields, setMarkedFields] = useState<MarkedFields>({
    total: 0,
    byPlayer: {}
  })
  const [winConditions, setWinConditions] = useState({
    line: true,
    majority: false
  })

  // Services & External Hooks
  const { updateStats, trackMove, recordWinner, measurePerformance } = useGameAnalytics()
  const session = useSession({ boardId: '', _game: 'All Games', initialPlayers: [] })
  
  // Remove unused sessionService
  // const sessionService = useMemo(() => new SessionService(), [])

  // Helper Functions
  const getCompletedLinesCount = useCallback((): Record<string, number> => {
    const boardData = boardDataRef.current
    if (!boardData) return {}

    const completedLines: Record<string, number> = {}
    players.forEach(player => {
      if (!player.id) return
      completedLines[player.id] = 0
      
      // Check rows
      boardData.rows.forEach(row => {
        if (row?.every(cell => cell?.colors?.includes(player.color))) {
          completedLines[player.id] = (completedLines[player.id] || 0) + 1
        }
      })
      
      // Check columns
      boardData.columns.forEach(col => {
        if (col?.every(cell => cell?.colors?.includes(player.color))) {
          completedLines[player.id] = (completedLines[player.id] || 0) + 1
        }
      })
      
      // Check diagonals
      boardData.diagonals.forEach(diag => {
        if (diag?.every(cell => cell?.colors?.includes(player.color))) {
          completedLines[player.id] = (completedLines[player.id] || 0) + 1
        }
      })
    })

    return completedLines
  }, [players])

  // Refs for optimization
  const boardDataRef = useRef<{
    rows: BoardCell[][]
    columns: BoardCell[][]
    diagonals: BoardCell[][]
  }>()

  // Event Emitters
  const emitBeforeMove = useCallback((event: BeforeMoveEvent) => {
    try {
      if (gamePhase !== 'active') return false
      if (winner !== null) return false
      
      const isValid = event.isValid && 
        players[currentPlayer]?.id === event.playerId

      if (!isValid) {
        setGameError({
          type: BINGO_GAME_CONSTANTS.ERROR_TYPES.INVALID_MOVE,
          message: 'Invalid move attempt',
          recoverable: true
        })
      }

      return isValid
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [gamePhase, winner, players, currentPlayer, handleError])

  const emitAfterMove = useCallback((event: AfterMoveEvent) => {
    try {
      if (!event.move) return
      
      setLastMove(event.move)
      setMarkedFields(event.markedFields)
      trackMove(event.move.playerId, 'mark', event.move.position)
      
      // Update analytics
      updateStats(
        players,
        event.markedFields.byPlayer,
        getCompletedLinesCount()
      )
    } catch (error) {
      handleError(error as Error)
    }
  }, [players, trackMove, updateStats, getCompletedLinesCount, handleError])

  const emitGameEnd = useCallback((event: GameEndEvent) => {
    try {
      setGamePhase('ended')
      setWinner(event.winner === -1 ? -1 : players.findIndex(p => p.id === event.winner))
      recordWinner(event.winner === -1 ? null : event.winner)
      
      // Update session if available
      if (session && 'updateSessionState' in session && 
          typeof session.updateSessionState === 'function') {
        session.updateSessionState({
          status: 'completed',
          winner_id: event.winner === -1 ? null : event.winner
        })
      }
    } catch (error) {
      handleError(error as Error)
    }
  }, [players, recordWinner, session, handleError])

  // Board Data Structure Optimization
  useEffect(() => {
    boardDataRef.current = {
      rows: Array(boardSize).fill(null).map((_, row) => 
        boardState.slice(row * boardSize, (row + 1) * boardSize)
      ),
      columns: Array(boardSize).fill(null).map((_, col) => 
        boardState.filter((_, index) => index % boardSize === col)
      ),
      diagonals: [
        boardState.filter((_, index) => index % (boardSize + 1) === 0),
        boardState.filter((_, index) => 
          index > 0 && 
          index < boardSize * boardSize - 1 && 
          index % (boardSize - 1) === 0
        )
      ]
    }
  }, [boardState, boardSize, handleError])

  // Win Condition Checking
  const checkLineWin = useCallback((cells: BoardCell[]): boolean => {
    const colors = cells.map(cell => cell.colors[0]).filter(Boolean)
    return new Set(colors).size <= 1 && colors.length === boardSize
  }, [boardSize])

  const checkWinningCondition = useCallback((currentPlayers: Player[], timeExpired?: boolean): boolean => {
    try {
      measurePerformance() // Track performance before check
      if (!currentPlayers.length || winner !== null) return false

      // Check for line win if enabled
      if (winConditions.line && lastMove) {
        const { row, col } = lastMove
        const boardData = boardDataRef.current
        
        if (!boardData) return false

        // Check horizontal
        const currentRow = boardData.rows[row]
        if (currentRow && checkLineWin(currentRow)) {
          emitGameEnd({
            winner: lastMove.playerId,
            reason: 'line',
            winningLine: currentRow.map((_, i) => row * boardSize + i)
          })
          return true
        }

        // Check vertical
        const currentCol = boardData.columns[col]
        if (currentCol && checkLineWin(currentCol)) {
          emitGameEnd({
            winner: lastMove.playerId,
            reason: 'line',
            winningLine: currentCol.map((_, i) => i * boardSize + col)
          })
          return true
        }

        // Check diagonals
        if ((row === col || row + col === boardSize - 1)) {
          const diag1 = boardData.diagonals[0]
          const diag2 = boardData.diagonals[1]
          
          if ((diag1 && checkLineWin(diag1)) || (diag2 && checkLineWin(diag2))) {
            emitGameEnd({
              winner: lastMove.playerId,
              reason: 'line'
            })
            return true
          }
        }
      }

      // Check for majority win or tie
      if ((timeExpired || markedFields.total === boardSize * boardSize) && 
          winConditions.majority) {
        const maxMarked = Math.max(...Object.values(markedFields.byPlayer))
        const winners = Object.entries(markedFields.byPlayer)
          .filter(([_, count]) => count === maxMarked)
          .map(([playerId]) => playerId)

        if (winners.length === 1 && winners[0]) {
          emitGameEnd({
            winner: winners[0],
            reason: 'majority'
          })
          return true
        } else {
          emitGameEnd({
            winner: -1,
            reason: 'tie'
          })
          return false
        }
      }

      measurePerformance() // Track performance after check
      return false
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [boardSize, lastMove, markedFields, winConditions, winner, emitGameEnd, checkLineWin, measurePerformance, handleError])

  // Cleanup
  useEffect(() => {
    const cleanup = () => {
      setGamePhase('ended')
      setWinner(null)
      setLastMove(null)
      setMarkedFields({ total: 0, byPlayer: {} })
      setGameError(null)
      setBoardState([])
      setCurrentPlayer(0)
      boardDataRef.current = undefined
      measurePerformance() // Track final performance
    }

    // Add performance check interval
    const performanceInterval = setInterval(() => {
      if (gamePhase === 'active') {
        measurePerformance()
      }
    }, CONSTANTS.PERFORMANCE_CHECK_INTERVAL)

    return () => {
      clearInterval(performanceInterval)
      // Add delay to ensure all state updates complete
      setTimeout(cleanup, CONSTANTS.CLEANUP_DELAY)
    }
  }, [gamePhase, measurePerformance])

  // Board Management Implementations
  const generateBoard = useCallback(() => {
    try {
      const newBoard: BoardCell[] = Array(boardSize * boardSize)
        .fill(null)
        .map((_, index) => ({
          text: '',
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: `cell-${index}-${Date.now()}`
        }))
      setBoardState(newBoard)
      measurePerformance() // Track performance after generation
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardSize, measurePerformance, handleError])

  const resetBoard = useCallback(() => {
    generateBoard()
    setGamePhase('active')
    setWinner(null)
    setLastMove(null)
    setMarkedFields({ total: 0, byPlayer: {} })
    setGameError(null)
    setCurrentPlayer(0)
  }, [generateBoard])

  const handleCellChange = useCallback((index: number, value: string) => {
    setBoardState(prev => {
      const newState = [...prev]
      if (newState[index]) {
        newState[index] = {
          ...newState[index],
          text: value
        }
      }
      return newState
    })
  }, [])

  const updateBoardState = useCallback((index: number, updates: Partial<BoardCell>) => {
    try {
      setBoardState(prev => {
        const newState = [...prev]
        if (newState[index]) {
          newState[index] = {
            ...newState[index],
            ...updates,
            lastUpdated: Date.now()
          }
        }
        measurePerformance() // Track performance after state update
        return newState
      })
    } catch (error) {
      handleError(error as Error)
    }
  }, [measurePerformance, handleError])

  return {
    // States
    boardState,
    gamePhase,
    winner,
    currentPlayer,
    lastMove,
    markedFields,
    gameError,
    
    // Settings
    boardSize,
    setBoardSize,
    winConditions,
    setWinConditions,
    
    // Actions
    setBoardState,
    checkWinningCondition,
    emitBeforeMove,
    emitAfterMove,
    
    // Error Handling
    handleError,
    clearError: () => setGameError(null),
    
    // Board Management
    generateBoard,
    resetBoard,
    handleCellChange,
    updateBoardState
  }
}