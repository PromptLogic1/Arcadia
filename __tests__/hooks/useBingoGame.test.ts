import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { useBingoGame } from '@/components/challenges/bingo-board/hooks/useBingoGame'
import { generateMockPlayer, generateMockBoardCell } from '../utils/test-utils'
import { BINGO_GAME_CONSTANTS as _BINGO_GAME_CONSTANTS } from '@/components/challenges/bingo-board/types/bingogame.constants'
import '../mocks/hooks.mock'

describe('useBingoGame', () => {
  const getMockPlayers = () => {
    const player1 = generateMockPlayer({ id: 'player-1' })
    const player2 = generateMockPlayer({ id: 'player-2', team: 1 })
    return [player1, player2]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with correct default values', async () => {
      const { result } = renderHook(() => useBingoGame(3, getMockPlayers()))

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.boardSize).toBe(3)
      expect(result.current.winner).toBeNull()
      expect(result.current.gamePhase).toBe('active')
      expect(result.current.currentPlayer).toBe(0)
      expect(result.current.winConditions).toEqual({
        line: true,
        majority: false
      })
    })

    it('should validate board size constraints', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useBingoGame(2, getMockPlayers()))
      }).toThrow('Board size must be between 3 and 6')

      expect(() => {
        renderHook(() => useBingoGame(7, getMockPlayers()))
      }).toThrow('Board size must be between 3 and 6')

      console.error = originalError;
    })
  })

  describe('Board Management', () => {
    it('should generate board correctly', async () => {
      const { result } = renderHook(() => useBingoGame(3, getMockPlayers()))

      await act(async () => {
        result.current.generateBoard()
      })

      expect(result.current.boardState).toHaveLength(9)
      result.current.boardState.forEach(cell => {
        expect(cell).toHaveProperty('cellId')
        expect(cell).toHaveProperty('text')
        expect(cell).toHaveProperty('colors')
        expect(cell).toHaveProperty('completedBy')
      })
    })

    it('should handle cell changes', async () => {
      const { result } = renderHook(() => useBingoGame(3, getMockPlayers()))

      await act(async () => {
        result.current.generateBoard()
        result.current.handleCellChange(0, 'New Text')
      })

      expect(result.current.boardState[0]?.text).toBe('New Text')
    })

    it('should reset board state', async () => {
      const { result } = renderHook(() => useBingoGame(3, getMockPlayers()))

      await act(async () => {
        result.current.generateBoard()
        result.current.handleCellChange(0, 'Test')
        result.current.resetBoard()
      })

      expect(result.current.winner).toBeNull()
      expect(result.current.gamePhase).toBe('active')
      expect(result.current.lastMove).toBeNull()
      expect(result.current.boardState[0]?.text).toBe('')
    })
  })

  describe('Game Logic', () => {
    it('should detect horizontal winning condition', async () => {
      const players = getMockPlayers()
      const firstPlayerId = players[0]?.id
      if (!firstPlayerId) throw new Error('Player ID is required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        // Set up a horizontal winning line
        const board = Array(9).fill(null).map((_, i) => 
          i < 3 ? generateMockBoardCell({ 
            colors: ['bg-blue-500'],
            completedBy: [firstPlayerId],
            isMarked: true
          }) : generateMockBoardCell()
        )
        result.current.setBoardState(board)
        // Set last move to trigger win check
        result.current.setLastMove({
          position: 2, // Last cell in the winning line
          row: 0,     // First row
          col: 2,     // Last column
          playerId: firstPlayerId
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let hasWinner: boolean | undefined
      await act(async () => {
        hasWinner = result.current.checkWinningCondition(players)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(hasWinner).toBe(true)
      expect(result.current.winner).toBe(0)
    })

    it('should detect vertical winning condition', async () => {
      const players = getMockPlayers()
      const firstPlayerId = players[0]?.id
      if (!firstPlayerId) throw new Error('Player ID is required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        // Set up a vertical winning line
        const board = Array(9).fill(null).map((_, i) => 
          i % 3 === 0 ? generateMockBoardCell({ 
            colors: ['bg-blue-500'],
            completedBy: [firstPlayerId],
            isMarked: true
          }) : generateMockBoardCell()
        )
        result.current.setBoardState(board)
        // Set last move to trigger win check
        result.current.setLastMove({
          position: 6, // Last cell in the winning line
          row: 2,     // Last row
          col: 0,     // First column
          playerId: firstPlayerId
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let hasWinner: boolean | undefined
      await act(async () => {
        hasWinner = result.current.checkWinningCondition(players)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(hasWinner).toBe(true)
      expect(result.current.winner).toBe(0)
    })

    it('should detect diagonal winning condition', async () => {
      const players = getMockPlayers()
      const firstPlayerId = players[0]?.id
      if (!firstPlayerId) throw new Error('Player ID is required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        // Set up a diagonal winning line (top-left to bottom-right)
        const board = Array(9).fill(null).map((_, i) => 
          i % 4 === 0 ? generateMockBoardCell({ 
            colors: ['bg-blue-500'],
            completedBy: [firstPlayerId],
            isMarked: true
          }) : generateMockBoardCell()
        )
        result.current.setBoardState(board)
        // Set last move to trigger win check
        result.current.setLastMove({
          position: 8, // Last cell in diagonal
          row: 2,     // Last row
          col: 2,     // Last column
          playerId: firstPlayerId
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let hasWinner: boolean | undefined
      await act(async () => {
        hasWinner = result.current.checkWinningCondition(players)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(hasWinner).toBe(true)
      expect(result.current.winner).toBe(0)
    })

    it('should handle majority win condition', async () => {
      const players = getMockPlayers()
      const firstPlayerId = players[0]?.id
      if (!firstPlayerId) throw new Error('Player ID is required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        // Set up majority win (5 cells marked by player 1)
        const board = Array(9).fill(null).map((_, i) => 
          i < 5 ? generateMockBoardCell({ 
            colors: ['bg-blue-500'],
            completedBy: [firstPlayerId],
            isMarked: true
          }) : generateMockBoardCell()
        )
        result.current.setBoardState(board)
        result.current.setWinConditions({ line: false, majority: true })
        result.current.setMarkedFields({
          total: 5,
          byPlayer: { [firstPlayerId]: 5 }
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let hasWinner: boolean | undefined
      await act(async () => {
        hasWinner = result.current.checkWinningCondition(players, true)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(hasWinner).toBe(true)
      expect(result.current.winner).toBe(0)
    })

    it('should handle tie condition', async () => {
      const players = getMockPlayers()
      const [player1, player2] = players
      if (!player1?.id || !player2?.id) throw new Error('Player IDs are required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        // Set up tie condition (equal number of cells marked by both players)
        const board = Array(9).fill(null).map((_, i) => 
          generateMockBoardCell({ 
            colors: [i % 2 === 0 ? 'bg-blue-500' : 'bg-red-500'],
            completedBy: [i % 2 === 0 ? player1.id : player2.id],
            isMarked: true
          })
        )
        result.current.setBoardState(board)
        result.current.setWinConditions({ line: false, majority: true })
        result.current.setMarkedFields({
          total: 9,
          byPlayer: { 
            [player1.id]: 4,
            [player2.id]: 4
          }
        })
        // Set last move to trigger win check
        result.current.setLastMove({
          position: 8,
          row: 2,
          col: 2,
          playerId: player2.id
        })
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let hasWinner: boolean | undefined
      await act(async () => {
        hasWinner = result.current.checkWinningCondition(players, true)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(hasWinner).toBe(false)
      expect(result.current.winner).toBe(-1)
    })

    it('should validate moves correctly', async () => {
      const players = getMockPlayers()
      const firstPlayerId = players[0]?.id
      if (!firstPlayerId) throw new Error('Player ID is required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
      })

      const validMove = result.current.emitBeforeMove({
        position: 0,
        playerId: firstPlayerId,
        isValid: true
      })

      expect(validMove).toBe(true)
    })

    it('should track moves correctly', async () => {
      const players = getMockPlayers()
      const [player1, player2] = players
      if (!player1?.id || !player2?.id) throw new Error('Player IDs are required')

      const { result } = renderHook(() => useBingoGame(3, players))

      await act(async () => {
        result.current.generateBoard()
        result.current.emitAfterMove({
          move: {
            playerId: player1.id,
            position: 0,
            row: 0,
            col: 0
          },
          markedFields: {
            total: 1,
            byPlayer: { [player1.id]: 1 }
          },
          nextPlayer: player2.id
        })
      })

      expect(result.current.lastMove).toBeTruthy()
      expect(result.current.markedFields.total).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle and clear errors', async () => {
      const { result } = renderHook(() => useBingoGame(3, getMockPlayers()))

      await act(async () => {
        result.current.handleError(new Error('Test error'))
      })

      expect(result.current.gameError).toBeTruthy()
      expect(result.current.gameError?.message).toBe('Test error')

      await act(async () => {
        result.current.clearError()
      })

      expect(result.current.gameError).toBeNull()
    })
  })
})

