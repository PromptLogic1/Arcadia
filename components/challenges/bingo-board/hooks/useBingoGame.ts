import { useState, useCallback, useRef, useEffect } from 'react'
import type { BoardCell, Player, WinConditions } from '../components/shared/types'
import { wowChallenges } from '../components/shared/constants'

interface _WinningLine {
  type: 'horizontal' | 'vertical' | 'diagonal'
  index: number
}

interface PlayerCount {
  id: number
  team: number
  count: number
  color: string
}

interface BlockingState {
  isBlockingMode: boolean
  playerWithBlock: number | null
  earnedFromCell: number | null
}

export const useBingoGame = (initialSize: number, players: Player[]) => {
  // Minimale Boardgröße sicherstellen
  const size = Math.max(1, initialSize)
  const [boardSize, setBoardSize] = useState<number>(size)
  
  // Letzten validen State für Wiederherstellung speichern
  const lastValidState = useRef<BoardCell[]>([])

  const generateBoard = useCallback(() => {
    // Sicherstellen, dass wowChallenges nicht undefined ist
    const challenges = wowChallenges || []
    const randomChallenge = () => {
      if (challenges.length === 0) return ''
      const challenge = challenges[Math.floor(Math.random() * challenges.length)]
      return challenge ? challenge.slice(0, 50) : ''
    }

    return Array.from({ length: boardSize * boardSize }, (_, i) => ({
      text: randomChallenge(),
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: i.toString()
    }))
  }, [boardSize])

  const [boardState, setBoardState] = useState<BoardCell[]>(() => {
    const initial = generateBoard()
    lastValidState.current = initial
    return initial
  })

  const [winner, setWinner] = useState<number | null>(null)
  const [winConditions, setWinConditions] = useState<WinConditions>({
    line: true,
    majority: false,
  })
  const [blockingState, setBlockingState] = useState<BlockingState>({
    isBlockingMode: false,
    playerWithBlock: null,
    earnedFromCell: null
  })

  const validateCell = useCallback((cell: BoardCell): boolean => {
    return (
      typeof cell === 'object' &&
      cell !== null &&
      'text' in cell &&
      'colors' in cell &&
      'completedBy' in cell &&
      'blocked' in cell &&
      'isMarked' in cell &&
      'cellId' in cell &&
      Array.isArray(cell.colors) &&
      Array.isArray(cell.completedBy)
    )
  }, [])

  const validateBoardState = useCallback((state: BoardCell[]): boolean => {
    return (
      Array.isArray(state) &&
      state.length === boardSize * boardSize &&
      state.every(validateCell)
    )
  }, [boardSize, validateCell])

  const handleCellChange = useCallback(
    (index: number, value: string): void => {
      try {
        setBoardState(prevBoard => {
          const newBoard = [...prevBoard]
          if (!newBoard[index]) return prevBoard

          newBoard[index] = {
            ...newBoard[index],
            text: value.slice(0, 50)
          }
          
          if (validateBoardState(newBoard)) {
            lastValidState.current = newBoard
            return newBoard
          }
          return prevBoard
        })
      } catch (error) {
        console.error('Error changing cell:', error)
      }
    },
    [validateBoardState]
  )

  const canCompleteLine = useCallback((cells: BoardCell[]): boolean => {
    const colors = cells.map(cell => cell.colors[0]).filter(Boolean)
    return new Set(colors).size <= 1
  }, [])

  const getPlayerCounts = useCallback((currentPlayers: Player[]): PlayerCount[] => {
    try {
      const teamMode = currentPlayers.some(p => p.team !== undefined)
      
      if (teamMode) {
        const teamCounts = new Map<number, number>()
        boardState.forEach(cell => {
          cell.colors.forEach(color => {
            const player = currentPlayers.find(p => p.color === color)
            if (player?.team !== undefined) {
              teamCounts.set(
                player.team,
                (teamCounts.get(player.team) || 0) + 1
              )
            }
          })
        })
        
        return Array.from(teamCounts.entries()).map(([team, count]) => ({
          id: -1,
          team,
          count,
          color: currentPlayers.find(p => p.team === team)?.color || ''
        }))
      }
      
      return currentPlayers.map((player, id) => ({
        id,
        team: -1,
        count: boardState.reduce((acc, cell) => 
          acc + (cell.colors.includes(player.color) ? 1 : 0), 0
        ),
        color: player.color
      }))
    } catch (error) {
      console.error('Error getting player counts:', error)
      return []
    }
  }, [boardState])

  const isLineWinImpossible = useCallback((): boolean => {
    // Type guard function
    const filterValidCells = (cells: (BoardCell | undefined)[]): BoardCell[] => 
      cells.filter((cell): cell is BoardCell => cell !== undefined)

    // Check if any line can still be completed
    // Horizontal
    for (let row = 0; row < boardSize; row++) {
      const startIndex = row * boardSize
      const rowCells = filterValidCells(boardState.slice(startIndex, startIndex + boardSize))
      if (canCompleteLine(rowCells)) return false
    }

    // Vertical
    for (let col = 0; col < boardSize; col++) {
      const colCells = filterValidCells(
        Array.from({ length: boardSize }, (_, row) => boardState[row * boardSize + col])
      )
      if (canCompleteLine(colCells)) return false
    }

    // Diagonals
    const diagonals = [
      filterValidCells(Array.from({ length: boardSize }, (_, i) => boardState[i * boardSize + i])),
      filterValidCells(Array.from({ length: boardSize }, (_, i) => 
        boardState[i * boardSize + (boardSize - 1 - i)]))
    ]

    return !diagonals.some(canCompleteLine)
  }, [boardSize, boardState, canCompleteLine])

  const checkWinningCondition = useCallback((currentPlayers: Player[], timeExpired?: boolean): boolean => {
    if (!currentPlayers.length || winner !== null) return false

    // Check for line win if enabled
    if (winConditions.line) {
      // Check horizontal lines
      for (let row = 0; row < boardSize; row++) {
        const startIndex = row * boardSize
        const rowCells = boardState.slice(startIndex, startIndex + boardSize)
        const firstColor = rowCells[0]?.colors[0]
        
        if (firstColor) {
          const firstPlayer = currentPlayers.find(p => p.color === firstColor)
          if (!firstPlayer) continue

          if (rowCells.every(cell => cell.colors[0] === firstColor)) {
            setWinner(firstPlayer.team ?? 0)
            return true
          }
        }
      }

      // Similar changes for vertical and diagonal checks...
    }

    // Check for majority win at game end
    if ((timeExpired || boardState.every(cell => cell.isMarked)) && winConditions.majority) {
      const playerCounts = getPlayerCounts(currentPlayers)
      const maxCount = Math.max(...playerCounts.map(p => p.count))
      const winners = playerCounts.filter(p => p.count === maxCount)

      if (winners.length === 1) {
        const winner = winners[0]
        if (winner) {
          setWinner(winner.team ?? 0)
          return true
        }
      }
    }

    // Check for tie conditions
    if (timeExpired || 
        boardState.every(cell => cell.isMarked) ||
        (winConditions.line && !winConditions.majority && isLineWinImpossible())) {
      setWinner(-1)
      return false
    }

    return false
  }, [boardSize, boardState, winner, winConditions, getPlayerCounts, isLineWinImpossible])

  const handleCellClick = useCallback((index: number, updates?: Partial<BoardCell>) => {
    if (!updates || index < 0 || index >= boardState.length || winner !== null) {
      console.error('Invalid cell update attempt')
      return
    }

    setBoardState(prevState => {
      const newState = [...prevState]
      const currentCell = newState[index]
      
      if (!currentCell || currentCell.blocked) return prevState

      newState[index] = {
        ...currentCell,
        colors: updates.colors || currentCell.colors,
        completedBy: updates.completedBy || currentCell.completedBy,
        isMarked: updates.isMarked ?? currentCell.isMarked,
        blocked: updates.blocked ?? currentCell.blocked
      }

      if (validateBoardState(newState)) {
        lastValidState.current = newState
        return newState
      }
      return prevState
    })

    // Check for win conditions immediately after state update
    setTimeout(() => {
      checkWinningCondition(players)
    }, 0)
  }, [boardState.length, validateBoardState, winner, players, checkWinningCondition])

  const resetBoard = useCallback(() => {
    const generateUniqueBoard = (): BoardCell[] => {
      const timestamp = Date.now()
      const uniqueId = Math.random().toString(36).substring(7)
      const usedTexts = new Set<string>()
      const usedIds = new Set<string>()
      
      const board = generateBoard().map((cell, index) => {
        // Garantiere einzigartige Texte und IDs
        const uniqueText = `${cell.text}_${timestamp}_${uniqueId}_${Math.random()}`
        const uniqueCellId = `${index}_${timestamp}_${uniqueId}_${Math.random()}`
        
        if (usedTexts.has(uniqueText) || usedIds.has(uniqueCellId)) {
          const recursiveBoard = generateUniqueBoard()
          return recursiveBoard[index] || {
            text: `New Cell ${index}_${Date.now()}_${Math.random()}`,
            cellId: `${index}_${Date.now()}_${Math.random()}`,
            colors: [],
            completedBy: [],
            blocked: false,
            isMarked: false
          }
        }
        
        usedTexts.add(uniqueText)
        usedIds.add(uniqueCellId)
        
        return {
          text: uniqueText.slice(0, 50),
          cellId: uniqueCellId,
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false
        }
      })

      // Strikte Validierung der Einzigartigkeit
      if (lastValidState.current.length > 0) {
        const isDifferent = board.every((currentCell, i) => {
          if (!currentCell) return false
          const lastCell = lastValidState.current[i]
          return !lastCell || (
            currentCell.text !== lastCell.text &&
            currentCell.cellId !== lastCell.cellId &&
            JSON.stringify(currentCell) !== JSON.stringify(lastCell)
          )
        })
        
        if (!isDifferent) {
          return generateUniqueBoard() // Rekursiv neues Board generieren
        }
      }

      return board as BoardCell[]
    }

    try {
      const newBoard = generateUniqueBoard()
      if (validateBoardState(newBoard)) {
        setBoardState(newBoard)
        lastValidState.current = newBoard
        setWinner(null)
      } else {
        throw new Error('Invalid board generated')
      }
    } catch (error) {
      console.error('Error resetting board:', error)
      const fallbackBoard = generateUniqueBoard()
      setBoardState(fallbackBoard)
      lastValidState.current = fallbackBoard
    }
  }, [generateBoard, validateBoardState])

  const updateBoardState = useCallback((index: number, updates: Partial<BoardCell>) => {
    setBoardState(prevState => {
      const newState = [...prevState]
      if (!newState[index]) return prevState

      newState[index] = {
        ...newState[index],
        ...updates
      }

      if (validateBoardState(newState)) {
        lastValidState.current = newState
        return newState
      }
      return lastValidState.current
    })
  }, [validateBoardState])

  useEffect(() => {
    // Check win conditions when board state changes
    if (boardState.length > 0) {
      checkWinningCondition(players)
    }
  }, [boardState, players, checkWinningCondition])

  return {
    boardState,
    setBoardState: (newState: BoardCell[]) => {
      if (validateBoardState(newState)) {
        lastValidState.current = newState
        setBoardState(newState)
        // Check win conditions after board state update
        setTimeout(() => checkWinningCondition(players), 0)
      } else {
        console.error('Invalid board state detected')
        resetBoard()
      }
    },
    winner,
    setWinner,
    boardSize,
    setBoardSize,
    winConditions,
    setWinConditions,
    blockingState,
    setBlockingState,
    generateBoard,
    resetBoard,
    handleCellChange,
    handleCellClick,
    checkWinningCondition,
    updateBoardState,
  }
}