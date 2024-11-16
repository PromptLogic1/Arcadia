import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { useBingoGame } from '@/components/challenges/bingo-board/hooks/useBingoGame'
import { generateMockPlayer, generateMockBoardCell } from '../test-utils'
import type { Player } from '@/components/challenges/bingo-board/types/types'
import { useGameAnalytics } from '@/components/challenges/bingo-board/hooks/useGameAnalytics'

// Mock useGameAnalytics hook
jest.mock('@/components/challenges/bingo-board/hooks/useGameAnalytics', () => ({
  useGameAnalytics: jest.fn().mockReturnValue({
    updateStats: jest.fn(),
    trackMove: jest.fn(),
    recordWinner: jest.fn(),
    measurePerformance: jest.fn()
  })
}))

describe('useBingoGame', () => {
  let mockPlayers: Player[]

  beforeEach(() => {
    mockPlayers = [
      generateMockPlayer({ 
        id: 'player-1',
        hoverColor: 'hover:bg-blue-600'
      }),
      generateMockPlayer({ 
        id: 'player-2', 
        team: 1,
        hoverColor: 'hover:bg-red-600'
      })
    ]
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    expect(result.current.boardSize).toBe(3)
    expect(result.current.winner).toBeNull()
    expect(result.current.gamePhase).toBe('active')
    expect(result.current.currentPlayer).toBe(0)
    expect(result.current.winConditions).toEqual({
      line: true,
      majority: false
    })
  })

  it('should generate board with correct size', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
    })

    expect(result.current.boardState.length).toBe(9) // 3x3 board
    result.current.boardState.forEach(cell => {
      expect(cell).toHaveProperty('cellId')
      expect(cell).toHaveProperty('text')
      expect(cell).toHaveProperty('colors')
      expect(cell).toHaveProperty('completedBy')
      expect(cell).toHaveProperty('blocked')
      expect(cell).toHaveProperty('isMarked')
    })
  })

  it('should handle cell changes correctly', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
      result.current.handleCellChange(0, 'New Text')
    })

    const cell = result.current.boardState[0]
    expect(cell?.text).toBe('New Text')
  })

  it('should detect horizontal winning condition', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
      // Set up winning condition (horizontal line)
      result.current.setBoardState([
        ...Array(3).fill(generateMockBoardCell({ colors: ['bg-blue-500'] })),
        ...Array(6).fill(generateMockBoardCell())
      ])
    })

    const hasWinner = result.current.checkWinningCondition(mockPlayers)
    expect(hasWinner).toBe(true)
    expect(result.current.winner).not.toBeNull()
  })

  it('should detect vertical winning condition', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
      // Set up winning condition (vertical line)
      const board = Array(9).fill(null).map((_, i) => 
        i % 3 === 0 ? generateMockBoardCell({ colors: ['bg-blue-500'] }) : generateMockBoardCell()
      )
      result.current.setBoardState(board)
    })

    const hasWinner = result.current.checkWinningCondition(mockPlayers)
    expect(hasWinner).toBe(true)
    expect(result.current.winner).not.toBeNull()
  })

  it('should handle invalid moves correctly', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    const invalidEvent = {
      isValid: false,
      playerId: 'invalid-player',
      position: 0
    }

    const isValid = result.current.emitBeforeMove(invalidEvent)
    expect(isValid).toBe(false)
    expect(result.current.gameError).toBeTruthy()
  })

  it('should track moves correctly', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))
    const player = mockPlayers[0]

    if (!player) {
      throw new Error('Mock player not initialized')
    }

    act(() => {
      result.current.emitAfterMove({
        move: {
          playerId: player.id,
          position: 0,
          row: 0,
          col: 0
        },
        markedFields: {
          total: 1,
          byPlayer: { [player.id]: 1 }
        },
        nextPlayer: player.id
      })
    })

    expect(result.current.lastMove).toBeTruthy()
    expect(result.current.markedFields.total).toBe(1)
  })

  it('should handle board size changes', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.setBoardSize(4)
      result.current.generateBoard()
    })

    expect(result.current.boardSize).toBe(4)
    expect(result.current.boardState.length).toBe(16) // 4x4 board
  })

  it('should handle game reset', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
      result.current.handleCellChange(0, 'Test')
      result.current.resetBoard()
    })

    const cell = result.current.boardState[0]
    expect(cell?.text).toBe('')
    expect(result.current.winner).toBeNull()
    expect(result.current.gamePhase).toBe('active')
    expect(result.current.lastMove).toBeNull()
  })

  it('should handle diagonal winning condition', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))

    act(() => {
      result.current.generateBoard()
      // Set up winning condition (diagonal line)
      const board = Array(9).fill(null).map((_, i) => 
        i % 4 === 0 ? generateMockBoardCell({ colors: ['bg-blue-500'] }) : generateMockBoardCell()
      )
      result.current.setBoardState(board)
    })

    const hasWinner = result.current.checkWinningCondition(mockPlayers)
    expect(hasWinner).toBe(true)
    expect(result.current.winner).not.toBeNull()
  })

  it('should handle majority win condition', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))
    const player = mockPlayers[0]

    if (!player) {
      throw new Error('Mock player not initialized')
    }

    act(() => {
      result.current.setWinConditions({ line: false, majority: true })
      result.current.generateBoard()
      
      const board = Array(9).fill(null).map((_, i) => 
        i < 5 ? generateMockBoardCell({ 
          colors: ['bg-blue-500'],
          completedBy: [player.id]
        }) : generateMockBoardCell()
      )
      result.current.setBoardState(board)
    })

    const hasWinner = result.current.checkWinningCondition(mockPlayers, true)
    expect(hasWinner).toBe(true)
    expect(result.current.winner).toBe(0)
  })

  it('should handle tie condition correctly', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))
    const [player1, player2] = mockPlayers

    if (!player1 || !player2) {
      throw new Error('Mock players not initialized')
    }

    act(() => {
      result.current.setWinConditions({ line: true, majority: true })
      result.current.generateBoard()
      
      const board = Array(9).fill(null).map((_, i) => 
        generateMockBoardCell({ 
          colors: [i % 2 === 0 ? 'bg-blue-500' : 'bg-red-500'],
          completedBy: [i % 2 === 0 ? player1.id : player2.id]
        })
      )
      result.current.setBoardState(board)
    })

    const hasWinner = result.current.checkWinningCondition(mockPlayers, true)
    expect(hasWinner).toBe(false)
    expect(result.current.winner).toBe(-1)
  })

  it('should validate board size constraints', () => {
    expect(() => {
      renderHook(() => useBingoGame(2, mockPlayers)) // Too small
    }).toThrow()

    expect(() => {
      renderHook(() => useBingoGame(7, mockPlayers)) // Too large
    }).toThrow()
  })

  it('should handle performance measurement', () => {
    const { result } = renderHook(() => useBingoGame(3, mockPlayers))
    const mockMeasurePerformance = jest.mocked(useGameAnalytics).mock.results[0]?.value.measurePerformance

    act(() => {
      result.current.generateBoard()
      for (let i = 0; i < 5; i++) {
        result.current.handleCellChange(i, `Cell ${i}`)
      }
    })

    expect(mockMeasurePerformance).toHaveBeenCalled()
  })
})

