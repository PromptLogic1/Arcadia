import { renderHook, act } from '@testing-library/react'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

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

// Define types for mock query builder
type SupabaseFrom = ReturnType<SupabaseClient<Database>['from']>

interface MockQueryBuilder {
  select: jest.Mock
  eq: jest.Mock
  single: jest.Mock<Promise<PostgrestSingleResponse<Database['public']['Tables']['bingo_sessions']['Row']>>>
  update: jest.Mock
  url?: string
  headers?: Record<string, string>
}

interface GameStateDB {
  currentState: BoardCell[]
  version: number
  lastUpdate: string
  current_player: number
}

describe('End-to-End Session Flow', () => {
  // Add timeout for long-running tests
  jest.setTimeout(10000)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup any subscriptions or pending operations
    jest.clearAllTimers()
  })

  it('should handle complete session lifecycle', async () => {
    // Setup initial game state
    const initialState: GameStateDB = {
      currentState: [mockBoardCell],
      version: 1,
      lastUpdate: new Date().toISOString(),
      current_player: 1
    }

    let currentGameState = { ...initialState }

    // Mock Supabase responses with proper typing
    const mockQueryBuilder: MockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ data: initialState, error: null }))
        .mockImplementation(() => Promise.resolve({ 
          data: currentGameState, 
          error: null 
        })),
      update: jest.fn().mockImplementation((updates) => {
        // Update the current game state with the marked cell
        currentGameState = {
          ...currentGameState,
          ...updates,
          version: currentGameState.version + 1,
          lastUpdate: new Date().toISOString(),
          currentState: updates.currentState || currentGameState.currentState
        }

        return {
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: currentGameState,
            error: null 
          })
        }
      })
    }

    mockSupabase.from.mockImplementation(() => mockQueryBuilder as unknown as SupabaseFrom)

    // Initialize game state
    const { result, rerender } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: {
        ...initialState,
        currentPlayer: initialState.current_player
      }
    }))

    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, isMarked: true }
      }])
    })

    // Force a re-render to ensure state is updated
    rerender()

    console.log('Current game state:', currentGameState)
    console.log('Hook game state:', result.current.gameState)

    const currentCell = result.current.gameState?.currentState[0]
    if (currentCell) {
      expect(currentCell.isMarked).toBe(true)
    } else {
      fail('Current cell is undefined')
    }
  }, 10000) // Add timeout for individual test

  it('should verify player journey scenarios', async () => {
    // ... existing test code ...
  }, 10000)

  it('should test multi-player interactions', async () => {
    // Setup initial states for both players
    const initialState = {
      currentState: Array(2).fill(mockBoardCell),
      version: 1,
      lastUpdate: new Date().toISOString(),
      current_player: 1
    }

    // Mock Supabase responses with proper typing
    const mockQueryBuilder: MockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: initialState, error: null }),
      update: jest.fn().mockImplementation((updates: Partial<typeof initialState>) => ({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...initialState, ...updates },
          error: null
        })
      }))
    }

    mockSupabase.from.mockImplementation(() => mockQueryBuilder as unknown as SupabaseFrom)

    // Initialize game states for both players
    const { result: player1 } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: {
        ...initialState,
        currentPlayer: initialState.current_player
      }
    }))

    const { result: player2 } = renderHook(() => useGameState({
      sessionId: 'test-session',
      currentState: {
        ...initialState,
        currentPlayer: initialState.current_player
      }
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
  }, 10000)
})