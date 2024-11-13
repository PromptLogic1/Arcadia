import { useState, useCallback, useRef } from 'react'
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

export const useBingoGame = (initialSize: number) => {
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

  const handleCellClick = useCallback((index: number, updates?: Partial<BoardCell>) => {
    if (!updates || index < 0 || index >= boardState.length) {
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
  }, [boardState.length, validateBoardState])

  const getPlayerCounts = useCallback((players: Player[]): PlayerCount[] => {
    try {
      const teamMode = players.some(p => p.team !== undefined)
      
      if (teamMode) {
        const teamCounts = new Map<number, number>()
        boardState.forEach(cell => {
          cell.colors.forEach(color => {
            const player = players.find(p => p.color === color)
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
          color: players.find(p => p.team === team)?.color || ''
        }))
      }
      
      return players.map((player, id) => ({
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

  const checkWinningCondition = useCallback((players: Player[], _forceCheck?: boolean): boolean => {
    if (!players.length) return false

    // Helper function to check if all cells belong to same team
    const allCellsSameTeam = (cells: (BoardCell | undefined)[], team: number): boolean => {
      return cells.every(cell => {
        const cellColor = cell?.colors[0]
        if (!cellColor) return false
        const cellPlayer = players.find(p => p.color === cellColor)
        return cellPlayer?.team === team
      })
    }

    // Helper function for horizontal lines
    const checkHorizontalLine = (row: number): boolean => {
      const startIndex = row * boardSize
      const rowCells = boardState.slice(startIndex, startIndex + boardSize)
      const firstColor = rowCells[0]?.colors[0]
      
      if (!firstColor) return false

      const firstPlayer = players.find(p => p.color === firstColor)
      if (!firstPlayer) return false

      // Check for single player win
      if (typeof firstPlayer.team === 'undefined') {
        if (rowCells.every(cell => cell.colors[0] === firstColor)) {
          setWinner(0)  // Always 0 for single player
          return true
        }
      } 
      // Check for team win
      else {
        if (allCellsSameTeam(rowCells, firstPlayer.team)) {
          setWinner(firstPlayer.team)
          return true
        }
      }

      return false
    }

    // Helper function for vertical lines
    const checkVerticalLine = (col: number): boolean => {
      const colCells = Array.from(
        { length: boardSize },
        (_, row) => boardState[row * boardSize + col]
      )
      const firstColor = colCells[0]?.colors[0]
      
      if (!firstColor) return false

      const firstPlayer = players.find(p => p.color === firstColor)
      if (!firstPlayer) return false

      if (typeof firstPlayer.team === 'number') {
        if (allCellsSameTeam(colCells, firstPlayer.team)) {
          setWinner(firstPlayer.team)
          return true
        }
      } else if (colCells.every(cell => cell?.colors[0] === firstColor)) {
        setWinner(0)
        return true
      }

      return false
    }

    // Helper function for diagonal lines
    const checkDiagonalLine = (direction: 1 | -1): boolean => {
      const cells = Array.from({ length: boardSize }, (_, i) => {
        const row = i
        const col = direction === 1 ? i : boardSize - 1 - i
        return boardState[row * boardSize + col]
      })
      
      const firstColor = cells[0]?.colors[0]
      if (!firstColor) return false

      const firstPlayer = players.find(p => p.color === firstColor)
      if (!firstPlayer) return false

      if (typeof firstPlayer.team === 'number') {
        if (allCellsSameTeam(cells, firstPlayer.team)) {
          setWinner(firstPlayer.team)
          return true
        }
      } else if (cells.every(cell => cell?.colors[0] === firstColor)) {
        setWinner(0)
        return true
      }

      return false
    }

    // 1. Check for draw first
    const playerCounts = getPlayerCounts(players)
    const activePlayers = playerCounts.filter(p => p.count > 0)
    
    if (activePlayers.length >= 2) {
      const counts = activePlayers.map(p => p.count)
      if (counts.length > 0 && new Set(counts).size === 1) {
        setWinner(-1)
        return true
      }
    }

    // 2. Check for horizontal wins
    for (let row = 0; row < boardSize; row++) {
      if (checkHorizontalLine(row)) return true
    }

    // 3. Check for vertical wins
    for (let col = 0; col < boardSize; col++) {
      if (checkVerticalLine(col)) return true
    }

    // 4. Check for diagonal wins
    if (checkDiagonalLine(1)) return true  // Main diagonal
    if (checkDiagonalLine(-1)) return true // Anti-diagonal

    // 5. Check for disconnect
    if (players.length === 1) {
      setWinner(null)
      return false
    }

    return false
  }, [boardSize, boardState, getPlayerCounts])

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

  return {
    boardState,
    setBoardState: (newState: BoardCell[]) => {
      if (validateBoardState(newState)) {
        lastValidState.current = newState
        setBoardState(newState)
      } else {
        console.error('Invalid board state detected')
        resetBoard() // Statt lastValidState ein neues Board generieren
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