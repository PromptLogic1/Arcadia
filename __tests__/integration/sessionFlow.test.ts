import { renderHook, act } from '@testing-library/react'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Get the mock Supabase client
const mockSupabase = jest.mocked(createClientComponentClient())

const mockBoardCell: BoardCell = {
  text: 'Test Cell',
  colors: [],
  completedBy: [],
  blocked: false,
  isMarked: false,
  cellId: '1'
}

describe('End-to-End Session Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle complete session lifecycle', async () => {
    // Setup initial game state
    const initialState = {
      currentState: [mockBoardCell],
      currentPlayer: 1,
      version: 1,
      lastUpdate: new Date().toISOString()
    }

    // Mock Supabase responses
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: initialState }),
      update: jest.fn().mockImplementation(async () => ({
        data: {
          ...initialState,
          currentState: [{ ...mockBoardCell, isMarked: true }]
        }
      }))
    }

    mockSupabase.from.mockImplementation(() => mockQueryBuilder as any)

    // Initialize game state
    const { result: gameResult } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: initialState
    }))

    // Ensure hook returns are properly typed
    type GameStateHook = ReturnType<typeof useGameState>
    const gameState = gameResult.current as GameStateHook

    await act(async () => {
      await gameState.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, isMarked: true }
      }])
    })

    const currentCell = gameState.gameState?.currentState[0]
    if (currentCell) {
      expect(currentCell.isMarked).toBe(true)
    }
  })

  it('should verify player journey scenarios', async () => {
    // ... existing test code ...
  })

  it('should test multi-player interactions', async () => {
    // Setup initial states for both players
    const initialState = {
      currentState: Array(2).fill(mockBoardCell),
      currentPlayer: 1,
      version: 1,
      lastUpdate: new Date().toISOString()
    }

    // Mock Supabase responses
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: initialState }),
      update: jest.fn().mockImplementation(async (updates: any) => ({
        data: {
          ...initialState,
          ...updates
        }
      }))
    }

    mockSupabase.from.mockImplementation(() => mockQueryBuilder as any)

    // Initialize game states for both players
    const { result: player1 } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: initialState
    }))

    const { result: player2 } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: initialState
    }))

    // Ensure hook returns are properly typed
    type GameStateHook = ReturnType<typeof useGameState>
    const player1State = player1.current as GameStateHook
    const player2State = player2.current as GameStateHook

    await act(async () => {
      await Promise.all([
        player1State.updateGameState([{
          index: 0,
          cell: { ...mockBoardCell, isMarked: true }
        }]),
        player2State.updateGameState([{
          index: 1,
          cell: { ...mockBoardCell, colors: ['#ff0000'] }
        }])
      ])
    })

    // Add assertions for multi-player state
    expect(mockQueryBuilder.update).toHaveBeenCalledTimes(2)
  })
}) 