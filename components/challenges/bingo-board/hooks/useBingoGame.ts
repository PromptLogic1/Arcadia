import { useState, useCallback } from 'react'
import type { BoardCell, Player, WinConditions } from '../components/shared/types'
import { wowChallenges } from '../components/shared/constants'

interface WinningLine {
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
  const [boardState, setBoardState] = useState<BoardCell[]>([])
  const [winner, setWinner] = useState<number | null>(null)
  const [boardSize, setBoardSize] = useState<number>(initialSize)
  const [winConditions, setWinConditions] = useState<WinConditions>({
    line: true,
    majority: false,
  })
  const [editingCell, setEditingCell] = useState<number | null>(null)
  const [blockingState, setBlockingState] = useState<BlockingState>({
    isBlockingMode: false,
    playerWithBlock: null,
    earnedFromCell: null
  })

  const getPlayerCounts = useCallback((players: Player[]): PlayerCount[] => {
    try {
      const teamMode = players.some((p: Player) => p.team !== undefined)
      
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

  const determineWinnerByMajority = useCallback((counts: PlayerCount[]): void => {
    try {
      if (!counts.length) {
        setWinner(null)
        return
      }

      const maxCount = Math.max(...counts.map(p => p.count))
      const winners = counts.filter(p => p.count === maxCount)
      
      if (winners.length > 1) {
        setWinner(-1) // Tie
      } else if (winners.length === 1 && winners[0]) {
        setWinner(winners[0].team !== -1 ? winners[0].team : winners[0].id)
      }
    } catch (error) {
      console.error('Error determining winner by majority:', error)
      setWinner(null)
    }
  }, [])

  const checkWinningCondition = useCallback((players: Player[], forceCheck?: boolean) => {
    if (!players.length) return false

    if (forceCheck && winConditions.majority) {
      const playerCounts = getPlayerCounts(players)
      determineWinnerByMajority(playerCounts)
      return false
    }

    const getIndex = (row: number, col: number): number => 
      row * boardSize + col

    const checkLine = (line: WinningLine, playerOrTeam: number, teamMode: boolean): boolean => {
      const isColorInTeam = (color: string): boolean => 
        players.some(p => p.color === color && p.team === playerOrTeam)

      const getCells = (line: WinningLine): BoardCell[] => {
        const cells: BoardCell[] = []
        switch (line.type) {
          case 'horizontal':
            for (let col = 0; col < boardSize; col++) {
              const cell = boardState[getIndex(line.index, col)]
              if (!cell) return cells
              cells.push(cell)
            }
            return cells
          case 'vertical':
            for (let row = 0; row < boardSize; row++) {
              const cell = boardState[getIndex(row, line.index)]
              if (!cell) return cells
              cells.push(cell)
            }
            return cells
          case 'diagonal':
            for (let i = 0; i < boardSize; i++) {
              const cell = boardState[getIndex(i, line.index === 1 ? i : boardSize - 1 - i)]
              if (!cell) return cells
              cells.push(cell)
            }
            return cells
        }
        return cells
      }

      const cells = getCells(line)
      return cells.every(cell => {
        const playerColor = players[playerOrTeam]?.color
        return teamMode 
          ? cell.colors.some(color => isColorInTeam(color))
          : playerColor && cell.colors.includes(playerColor)
      })
    }

    const allLines: WinningLine[] = [
      ...Array.from({ length: boardSize }, (_, i) => ({ type: 'horizontal' as const, index: i })),
      ...Array.from({ length: boardSize }, (_, i) => ({ type: 'vertical' as const, index: i })),
      { type: 'diagonal' as const, index: 1 },
      { type: 'diagonal' as const, index: -1 }
    ]

    if (winConditions.line) {
      const teamMode = players.some(p => p.team !== undefined)
      
      if (teamMode) {
        const teams = Array.from(new Set(players.map(p => p.team).filter((team): team is number => team !== undefined)))
        for (const team of teams) {
          if (allLines.some(line => checkLine(line, team, true))) {
            setWinner(team)
            return true
          }
        }
      } else {
        for (let i = 0; i < players.length; i++) {
          if (allLines.some(line => checkLine(line, i, false))) {
            setWinner(i)
            return true
          }
        }
      }
    }

    if (winConditions.majority && boardState.every(cell => cell.colors.length > 0)) {
      const playerCounts = getPlayerCounts(players)
      determineWinnerByMajority(playerCounts)
    }

    return false
  }, [boardState, boardSize, winConditions, getPlayerCounts, determineWinnerByMajority])

  const generateBoard = useCallback(() => 
    Array.from({ length: boardSize * boardSize }, (_, i) => ({
      text: wowChallenges[Math.floor(Math.random() * wowChallenges.length)] || '',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: i.toString()
    }))
  , [boardSize])

  const resetBoard = useCallback(() => {
    try {
      const newBoard = generateBoard()
      setBoardState(newBoard)
      setWinner(null)
      setEditingCell(null)
    } catch (error) {
      console.error('Error resetting board:', error)
    }
  }, [generateBoard])

  const handleCellChange = useCallback(
    (index: number, value: string): void => {
      try {
        setBoardState((prevBoard) => {
          const newBoard = [...prevBoard]
          const existingCell = newBoard[index]
          if (!existingCell) return prevBoard

          newBoard[index] = {
            ...existingCell,
            text: value.slice(0, 50),
            colors: existingCell.colors || [],
            completedBy: existingCell.completedBy || []
          }
          return newBoard
        })
      } catch (error) {
        console.error('Error changing cell:', error)
      }
    },
    []
  )

  const handleCellClick = useCallback((index: number, updates?: Partial<BoardCell>) => {
    if (!updates) return

    setBoardState(prevState => {
      const newState = [...prevState]
      const currentCell = newState[index]
      if (!currentCell) return prevState

      newState[index] = {
        ...currentCell,
        text: updates.text ?? currentCell.text,
        colors: updates.colors ?? currentCell.colors,
        completedBy: updates.completedBy ?? currentCell.completedBy,
        blocked: updates.blocked ?? currentCell.blocked,
        isMarked: updates.isMarked ?? currentCell.isMarked,
        cellId: currentCell.cellId
      }
      return newState
    })

    checkWinningCondition([])
  }, [checkWinningCondition])

  const cancelBlocking = useCallback(() => {
    setBlockingState({
      isBlockingMode: false,
      playerWithBlock: null,
      earnedFromCell: null
    })
  }, [])

  const updateBoardState = useCallback((index: number, updates: Partial<BoardCell>) => {
    setBoardState(prevState => {
      const newState = [...prevState]
      const currentCell = newState[index]
      if (!currentCell) return prevState

      newState[index] = {
        ...currentCell,
        ...updates,
        text: updates.text ?? currentCell.text,
        colors: updates.colors ?? currentCell.colors,
        completedBy: updates.completedBy ?? currentCell.completedBy,
        blocked: updates.blocked ?? currentCell.blocked,
        isMarked: updates.isMarked ?? currentCell.isMarked,
        cellId: currentCell.cellId
      }
      return newState
    })
  }, [])

  return {
    boardState,
    setBoardState,
    winner,
    setWinner,
    boardSize,
    setBoardSize,
    winConditions,
    setWinConditions,
    editingCell,
    setEditingCell,
    generateBoard,
    resetBoard,
    handleCellChange,
    handleCellClick,
    checkWinningCondition,
    blockingState,
    cancelBlocking,
    updateBoardState,
  }
}