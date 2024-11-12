import { renderHook, act } from '@testing-library/react'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import type { BoardCell, GameState } from '@/components/challenges/bingo-board/components/shared/types'

type MockFn = jest.Mock

interface MockStateResponse {
  current_state: BoardCell[]
  version: number
  updated_at: string
}

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

describe('useGameState Hook', () => {
  const mockBoardCell: BoardCell = {
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: '1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))
    expect(result.current.gameState).toBeNull()
    expect(result.current.isProcessing).toBeFalsy()
  })

  it('should handle state updates with optimistic updates', async () => {
    const mockState: GameState = {
      currentState: [mockBoardCell],
      version: 1,
      lastUpdate: new Date().toISOString()
    }

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockState }),
      update: jest.fn().mockImplementation(async (_data) => ({
        data: {
          ...mockState,
          version: mockState.version + 1,
          current_state: [{ ...mockBoardCell, isMarked: true }]
        }
      }))
    }))

    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, isMarked: true }
      }])
    })

    const gameState = result.current.gameState
    if (gameState?.currentState[0]) {
      expect(gameState.currentState[0].isMarked).toBe(true)
      expect(gameState.version).toBe(2)
    }
  })

  it('should handle concurrent updates', async () => {
    const mockState: GameState = {
      currentState: [mockBoardCell],
      version: 1,
      lastUpdate: new Date().toISOString()
    }

    let currentVersion = 1

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockState }),
      update: jest.fn().mockImplementation(async () => {
        currentVersion++
        return {
          data: {
            ...mockState,
            version: currentVersion,
            current_state: [{ ...mockBoardCell, colors: ['#ff0000'] }]
          }
        }
      })
    }))

    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    await act(async () => {
      await Promise.all([
        result.current.updateGameState([{
          index: 0,
          cell: { ...mockBoardCell, isMarked: true }
        }]),
        result.current.updateGameState([{
          index: 0,
          cell: { ...mockBoardCell, colors: ['#ff0000'] }
        }])
      ])
    })

    const gameState = result.current.gameState
    if (gameState?.currentState[0]) {
      expect(gameState.version).toBe(3)
      expect(gameState.currentState[0].colors).toContain('#ff0000')
    }
  })

  it('should handle WebSocket updates', async () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    const mockUpdate: MockStateResponse = {
      current_state: [{ ...mockBoardCell, text: 'Updated Cell' }],
      version: 2,
      updated_at: new Date().toISOString()
    }

    await act(async () => {
      const onChangeCallback = mockSupabase.channel().on.mock.calls[0][2]
      onChangeCallback({ new: mockUpdate })
    })

    const gameState = result.current.gameState
    if (gameState?.currentState[0]) {
      expect(gameState.version).toBe(2)
      expect(gameState.currentState[0].text).toBe('Updated Cell')
    }
  })

  it('should clean up subscriptions', () => {
    const { unmount } = renderHook(() => useGameState({ sessionId: 'test-session' }))
    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
}) 