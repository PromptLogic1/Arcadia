import { renderHook, act } from '@testing-library/react'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'
import { mockSupabaseClient } from '../../jest.setup'

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
  })

  it('should handle concurrent updates', async () => {
    const mockState = {
      currentState: [mockBoardCell],
      currentPlayer: 1,
      version: 1,
      lastUpdate: new Date().toISOString()
    }

    // Mock state updates with version tracking
    let currentVersion = 1
    const stateUpdates = new Map()

    const mockUpdateChain = {
      eq: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(async () => {
          currentVersion++
          const newState = {
            current_state: [{ 
              ...mockBoardCell, 
              ...(currentVersion === 2 ? { isMarked: true } : { colors: ['#ff0000'] })
            }],
            current_player: 1,
            version: currentVersion,
            last_update: new Date().toISOString()
          }
          stateUpdates.set(currentVersion, newState)
          return { data: newState, error: null }
        })
      }))
    }

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnValue(mockUpdateChain),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(async () => {
        const latestState = stateUpdates.get(currentVersion) || {
          current_state: [mockBoardCell],
          current_player: 1,
          version: 1,
          last_update: new Date().toISOString()
        }
        return { data: latestState, error: null }
      })
    }

    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

    const { result } = renderHook(() => useGameState({ 
      sessionId: 'test-session',
      currentState: mockState
    }))

    // First update
    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { isMarked: true }
      }])
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Verify first update
    expect(result.current.gameState?.version).toBe(2)
    expect(result.current.gameState?.currentState[0]?.isMarked).toBe(true)

    // Second update
    await act(async () => {
      await result.current.updateGameState([{
        index: 0,
        cell: { colors: ['#ff0000'] }
      }])
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Verify final state
    expect(result.current.gameState?.version).toBe(3)
    expect(result.current.gameState?.currentState[0]?.colors).toContain('#ff0000')
  })

  it('should handle real-time updates', async () => {
    const initialGameState = {
      current_state: [mockBoardCell],
      current_player: 1,
      version: 1,
      last_update: new Date().toISOString()
    }

    let channelCallback: (payload: any) => void

    const mockChannel = {
      on: jest.fn().mockImplementation((_event: string, _filter: any, callback: any) => {
        channelCallback = callback
        return mockChannel
      }),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    }

    mockSupabaseClient.channel.mockReturnValue(mockChannel)

    const { result } = renderHook(() => useGameState({ 
      sessionId: 'test-session',
      currentState: {
        currentState: [mockBoardCell],
        currentPlayer: 1,
        version: 1,
        lastUpdate: new Date().toISOString()
      }
    }))

    // Simulate real-time update
    await act(async () => {
      if (channelCallback) {
        channelCallback({
          new: {
            ...initialGameState,
            current_state: [{ ...mockBoardCell, isMarked: true }],
            version: 2,
            current_player: 1,
            last_update: new Date().toISOString()
          }
        })
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.gameState?.currentState[0]?.isMarked).toBe(true)
    expect(result.current.gameState?.version).toBe(2)
  })

  it('should clean up subscriptions', async () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    }

    mockSupabaseClient.channel.mockReturnValue(mockChannel)
    mockSupabaseClient.removeChannel.mockImplementation(() => Promise.resolve())

    const { unmount } = renderHook(() => useGameState({ 
      sessionId: 'test-session',
      currentState: {
        currentState: [mockBoardCell],
        currentPlayer: 1,
        version: 1,
        lastUpdate: new Date().toISOString()
      }
    }))

    // Trigger cleanup
    unmount()

    // Wait for cleanup to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(mockSupabaseClient.removeChannel).toHaveBeenCalled()
  })
}) 