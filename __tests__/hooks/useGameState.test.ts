import { renderHook, act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

// Mock types
type MockFn = jest.Mock

// Mock Supabase client
const mockSupabase = {
  from: jest.fn() as MockFn,
  auth: {
    getUser: jest.fn() as MockFn
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis() as MockFn,
    subscribe: jest.fn() as MockFn
  })) as MockFn,
  removeChannel: jest.fn() as MockFn
}

// Mock board cell
const mockBoardCell: BoardCell = {
  text: 'Test Cell',
  colors: [],
  completedBy: [],
  blocked: false,
  isMarked: false,
  cellId: '1'
}

describe('useGameState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as MockFn).mockReturnValue(mockSupabase)
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))
    expect(result.current.gameState).toBeNull()
    expect(result.current.isProcessing).toBeFalsy()
  })

  it('should fetch initial state on mount', async () => {
    const mockInitialState = {
      current_state: [mockBoardCell],
      updated_at: new Date().toISOString(),
      version: 1
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockInitialState })
    }))

    const { result } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )

    // Wait for state update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.gameState).toEqual({
      currentState: [mockBoardCell],
      currentPlayer: 0,
      lastUpdate: mockInitialState.updated_at,
      version: 1
    })
  })

  it('should handle state updates with optimistic updates', async () => {
    const initialState = {
      currentState: [mockBoardCell],
      currentPlayer: 0,
      lastUpdate: new Date().toISOString(),
      version: 1
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: initialState }),
      update: jest.fn().mockResolvedValue({
        data: {
          ...initialState,
          version: 2,
          current_state: [{ ...mockBoardCell, isMarked: true }]
        }
      })
    }))

    const { result } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )

    // Wait for initial state
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, isMarked: true }
      }])
    })

    expect(result.current.gameState?.version).toBe(2)
    if (result.current.gameState?.currentState[0]) {
      expect(result.current.gameState.currentState[0].isMarked).toBe(true)
    }
  })

  it('should handle concurrent updates with version control', async () => {
    const mockState = {
      currentState: [mockBoardCell],
      currentPlayer: 0,
      lastUpdate: new Date().toISOString(),
      version: 1
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: {
          ...mockState,
          version: 3,
          current_state: [{ ...mockBoardCell, text: 'Server Update' }]
        }
      }),
      update: jest.fn().mockRejectedValue(new Error('Conflict'))
    }))

    const { result } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )

    // Wait for initial state
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, text: 'Client Update' }
      }])
    })

    expect(result.current.gameState?.version).toBe(3)
    if (result.current.gameState?.currentState[0]) {
      expect(result.current.gameState.currentState[0].text).toBe('Server Update')
    }
  })

  it('should handle real-time updates through subscription', async () => {
    const { result } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )

    // Wait for initial state
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const mockPayload = {
      new: {
        current_state: [{ ...mockBoardCell, text: 'Real-time Update' }],
        version: 2,
        updated_at: new Date().toISOString()
      }
    }

    await act(async () => {
      const onChangeCallback = mockSupabase.channel().on.mock.calls[0][2]
      onChangeCallback(mockPayload)
    })

    if (result.current.gameState?.currentState[0]) {
      expect(result.current.gameState.currentState[0].text).toBe('Real-time Update')
    }
    expect(result.current.gameState?.version).toBe(2)
  })

  it('should clean up subscription on unmount', () => {
    const { unmount } = renderHook(() => useGameState({ sessionId: 'test-session' }))
    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
}) 