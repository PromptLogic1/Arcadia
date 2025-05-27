'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  GameBoardCell,
  GamePlayer,
  GamePhase,
  LastMove,
  MarkedFields,
  GameError,
  BeforeMoveEvent,
  AfterMoveEvent,
  GameEndEvent
} from '@/types'
import { BINGO_GAME_CONSTANTS } from '@/types'
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
  boardState: GameBoardCell[]
  gamePhase: GamePhase
  winner: number | null
  currentPlayer: number
  lastMove: LastMove | null
  markedFields: MarkedFields
  gameError: GameError | null
  
  // Settings
  boardSize: number
  setBoardSize: (size: number) => void
  winConditions: { line: boolean; majority: boolean }
  setWinConditions: (conditions: { line: boolean; majority: boolean }) => void
  
  // Actions & Error Handling
  setBoardState: (state: GameBoardCell[]) => void
  checkWinningCondition: (players: GamePlayer[], timeExpired?: boolean) => boolean
  emitBeforeMove: (event: BeforeMoveEvent) => boolean
  emitAfterMove: (event: AfterMoveEvent) => void
  handleError: (error: Error) => void
  clearError: () => void
  
  // Board Management
  generateBoard: () => void
  resetBoard: () => void
  handleCellChange: (index: number, value: string) => void
  updateBoardState: (index: number, updates: Partial<GameBoardCell>) => void
  setLastMove: (move: LastMove | null) => void
  
  // Marked Fields Management
  setMarkedFields: (fields: MarkedFields) => void
}

/**
 * Hook for managing bingo game state and logic
 * @param initialSize - Initial board size (3-6)
 * @param players - Array of active players
 * @returns Game state and control functions
 */
export const useBingoGame = (initialSize: number, players: GamePlayer[]): UseBingoGameReturn => {
  // Remove the minimum player validation
  if (initialSize < CONSTANTS.MIN_BOARD_SIZE || initialSize > CONSTANTS.MAX_BOARD_SIZE) {
    throw new Error(`Board size must be between ${CONSTANTS.MIN_BOARD_SIZE} and ${CONSTANTS.MAX_BOARD_SIZE}`)
  }

  // Move handleError declaration to the top
  const [gameError, setGameError] = useState<GameError | null>(null)
  
  const handleError = useCallback((error: Error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Game error:', error)
    }
    setGameError({
      type: BINGO_GAME_CONSTANTS.ERROR_TYPES.INVALID_GAME_STATE,
      message: error.message,
      recoverable: true
    })
  }, [])

  // Core States
  const [boardState, setBoardState] = useState<GameBoardCell[]>([])
  const [gamePhase, setGamePhase] = useState<GamePhase>('active')
  const [winner, setWinner] = useState<number | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)
  const [boardSize, setBoardSize] = useState<number>(
    Math.max(
      BINGO_GAME_CONSTANTS.VALIDATION.MIN_BOARD_SIZE,
      Math.min(initialSize, BINGO_GAME_CONSTANTS.VALIDATION.MAX_BOARD_SIZE)
    )
  )
  const [lastMove, setLastMoveState] = useState<LastMove | null>(null)
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
  const session = useSession({ boardId: '', _game: 'World of Warcraft', initialPlayers: [] })
  
  // Remove unused sessionService
  // const sessionService = useMemo(() => new SessionService(), [])

  // Helper Functions
  const getCompletedLinesCount = useCallback((): Record<string, number> => {
    const boardData = boardDataRef.current
    if (!boardData) return {}

    const completedLines: Record<string, number> = {}
    players.forEach(player => {
      if (!player.user_id) return
      completedLines[player.user_id] = 0
      
      // Check rows
      boardData.rows.forEach(row => {
        if (row?.every(cell => cell?.colors?.includes(player.color || ''))) {
          completedLines[player.user_id] = (completedLines[player.user_id] || 0) + 1
        }
      })
      
      // Check columns
      boardData.columns.forEach(col => {
        if (col?.every(cell => cell?.colors?.includes(player.color || ''))) {
          completedLines[player.user_id] = (completedLines[player.user_id] || 0) + 1
        }
      })
      
      // Check diagonals
      boardData.diagonals.forEach(diag => {
        if (diag?.every(cell => cell?.colors?.includes(player.color || ''))) {
          completedLines[player.user_id] = (completedLines[player.user_id] || 0) + 1
        }
      })
    })

    return completedLines
  }, [players])

  // Refs for optimization
  const boardDataRef = useRef<{
    rows: GameBoardCell[][]
    columns: GameBoardCell[][]
    diagonals: GameBoardCell[][]
  } | null>(null)

  // Event Emitters
  const emitBeforeMove = useCallback((event: BeforeMoveEvent) => {
    try {
      if (gamePhase !== 'active') return false
      if (winner !== null) return false
      
      const isValid = event.isValid && 
        players[currentPlayer]?.user_id === event.playerId

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
      
      setLastMoveState(event.move)
      setMarkedFields(event.markedFields)
      trackMove(event.move.playerId, 'mark', event.move.position)
      
      // Update analytics - adapt GamePlayer[] to expected Player[] format
      const adaptedPlayers = players.map(player => ({
        id: player.user_id,
        name: player.player_name || '',
        ...player
      }))
      updateStats(
        adaptedPlayers as any,
        event.markedFields.byPlayer,
        getCompletedLinesCount()
      )
    } catch (error) {
      handleError(error as Error)
    }
  }, [players, trackMove, updateStats, getCompletedLinesCount, handleError, setLastMoveState])

  const emitGameEnd = useCallback((event: GameEndEvent) => {
    try {
      setGamePhase('ended')
      if (event.winner === null) {
        setWinner(-1)
      } else {
        const winnerIndex = players.findIndex(p => p.user_id === event.winner)
        setWinner(winnerIndex !== -1 ? winnerIndex : -1)
      }
      recordWinner(event.winner)
      
      // Update session if available
      if (session && 'updateSessionState' in session && 
          typeof session.updateSessionState === 'function') {
        session.updateSessionState({
          status: 'completed',
          winner_id: event.winner
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
  const checkLineWin = useCallback((cells: GameBoardCell[]): boolean => {
    if (!cells || cells.length !== boardSize) return false
    
    // Get the first marked cell's completed_by player
    const firstMarkedCell = cells.find(cell => cell.is_marked && cell.completed_by && cell.completed_by.length > 0)
    if (!firstMarkedCell) return false
    
    const playerId = firstMarkedCell.completed_by?.[0]
    if (!playerId) return false
    
    // Check if all cells in the line are marked by the same player
    return cells.every(cell => 
      cell.is_marked && 
      cell.completed_by && 
      cell.completed_by.length > 0 && 
      cell.completed_by[0] === playerId
    )
  }, [boardSize])

  const checkWinningCondition = useCallback((currentPlayers: GamePlayer[], timeExpired?: boolean): boolean => {
    try {
      measurePerformance()
      if (!currentPlayers.length || winner !== null) return false

      // Check for line win if enabled
      if (winConditions.line && lastMove) {
        const { row, col } = lastMove
        const boardData = boardDataRef.current
        
        if (!boardData) return false

        // Check horizontal
        const currentRow = boardData.rows[row]
        if (currentRow && checkLineWin(currentRow)) {
          const winningPlayerId = currentRow[0]?.completed_by?.[0]
          if (winningPlayerId) {
            const winnerIndex = currentPlayers.findIndex(p => p.user_id === winningPlayerId)
            if (winnerIndex !== -1) {
              setWinner(winnerIndex)
              emitGameEnd({
                winner: winningPlayerId,
                reason: 'line',
                winningLine: currentRow.map((_, i) => row * boardSize + i)
              })
              return true
            }
          }
        }

        // Check vertical
        const currentCol = boardData.columns[col]
        if (currentCol && checkLineWin(currentCol)) {
          const winningPlayerId = currentCol[0]?.completed_by?.[0]
          if (winningPlayerId) {
            const winnerIndex = currentPlayers.findIndex(p => p.user_id === winningPlayerId)
            if (winnerIndex !== -1) {
              setWinner(winnerIndex)
              emitGameEnd({
                winner: winningPlayerId,
                reason: 'line',
                winningLine: currentCol.map((_, i) => i * boardSize + col)
              })
              return true
            }
          }
        }

        // Check diagonals
        if (row === col || row + col === boardSize - 1) {
          const diag1 = boardData.diagonals[0]
          const diag2 = boardData.diagonals[1]
          
          if (diag1 && checkLineWin(diag1)) {
            const winningPlayerId = diag1[0]?.completed_by?.[0]
            if (winningPlayerId) {
              const winnerIndex = currentPlayers.findIndex(p => p.user_id === winningPlayerId)
              if (winnerIndex !== -1) {
                setWinner(winnerIndex)
                emitGameEnd({
                  winner: winningPlayerId,
                  reason: 'line',
                  winningLine: diag1.map((_, i) => i * (boardSize + 1))
                })
                return true
              }
            }
          }
          
          if (diag2 && checkLineWin(diag2)) {
            const winningPlayerId = diag2[0]?.completed_by?.[0]
            if (winningPlayerId) {
              const winnerIndex = currentPlayers.findIndex(p => p.user_id === winningPlayerId)
              if (winnerIndex !== -1) {
                setWinner(winnerIndex)
                emitGameEnd({
                  winner: winningPlayerId,
                  reason: 'line',
                  winningLine: diag2.map((_, i) => (i + 1) * (boardSize - 1))
                })
                return true
              }
            }
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
          const winnerIndex = currentPlayers.findIndex(p => p.user_id === winners[0])
          if (winnerIndex !== -1) {
            setWinner(winnerIndex)
            emitGameEnd({
              winner: winners[0],
              reason: 'majority'
            })
            return true
          }
        } else if (winners.length > 1 || markedFields.total === boardSize * boardSize) {
          setWinner(-1)
          emitGameEnd({
            winner: null,
            reason: 'tie'
          })
          return false
        }
      }

      return false
    } catch (error) {
      handleError(error as Error)
      return false
    }
  }, [
    boardSize,
    lastMove,
    markedFields,
    winConditions,
    winner,
    emitGameEnd,
    checkLineWin,
    measurePerformance,
    handleError
  ])

  // Cleanup
  useEffect(() => {
    const cleanup = () => {
      setGamePhase('ended')
      setWinner(null)
      setLastMoveState(null)
      setMarkedFields({ total: 0, byPlayer: {} })
      setGameError(null)
      setBoardState([])
      setCurrentPlayer(0)
      boardDataRef.current = null
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
  }, [gamePhase, measurePerformance, setLastMoveState])

  // Board Management Implementations
  const generateBoard = useCallback(() => {
    try {
      const newBoard: GameBoardCell[] = Array(boardSize * boardSize)
        .fill(null)
        .map((_, index) => ({
          cell_id: `cell-${index}-${Date.now()}`,
          text: '',
          colors: [],
          completed_by: [],
          blocked: false,
          is_marked: false,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: null
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
    setLastMoveState(null)
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

  const updateBoardState = useCallback((index: number, updates: Partial<GameBoardCell>) => {
    try {
      setBoardState(prev => {
        const newState = [...prev]
        if (newState[index]) {
          newState[index] = {
            ...newState[index],
            ...updates,
            last_updated: Date.now()
          }
        }
        measurePerformance() // Track performance after state update
        return newState
      })
    } catch (error) {
      handleError(error as Error)
    }
  }, [measurePerformance, handleError])

  const setLastMove = useCallback((move: LastMove | null) => {
    setLastMoveState(move)
  }, [])

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
    updateBoardState,
    setLastMove,
    
    // Marked Fields Management
    setMarkedFields
  }
}