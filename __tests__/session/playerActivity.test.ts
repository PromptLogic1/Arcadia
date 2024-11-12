import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

// Define types for channel events
interface ChannelEvent {
  event: 'disconnect' | 'reconnect' | 'presence'
  session: string
}

// Mock session state
const mockSessionState = {
  id: 'test-session',
  status: 'active',
  current_state: [],
  players: [],
  version: 1,
  last_update: new Date().toISOString(),
  last_active_at: new Date().toISOString()
}

// Create mock query builder with proper state tracking
const createMockQueryBuilder = (initialState = mockSessionState) => {
  let currentState = { ...initialState }
  
  const queryBuilder = {
    update: jest.fn().mockImplementation((data) => {
      currentState = { ...currentState, ...data }
      return queryBuilder
    }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => 
      Promise.resolve({ data: currentState, error: null })
    )
  }
  return { queryBuilder, getCurrentState: () => currentState }
}

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user' } }, 
      error: null 
    })
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((callback) => {
      mockSupabase._subscriptionCallback = callback
      return { unsubscribe: jest.fn() }
    })
  })),
  removeChannel: jest.fn(),
  _subscriptionCallback: null as null | ((payload: ChannelEvent) => void)
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}))

describe('Player Activity System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase._subscriptionCallback = null
  })

  it('should track player connections', async () => {
    const { queryBuilder, getCurrentState } = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
    })

    expect(queryBuilder.update).toHaveBeenCalled()
    expect(getCurrentState().status).toBe('active')
  })

  it('should handle disconnections gracefully', async () => {
    const { queryBuilder, getCurrentState } = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result, unmount } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
      if (mockSupabase._subscriptionCallback) {
        mockSupabase._subscriptionCallback({ 
          event: 'disconnect', 
          session: 'test-session' 
        })
      }
      unmount()
    })

    expect(getCurrentState().status).toBe('disconnected')
    expect(getCurrentState().last_active_at).toBeTruthy()
  })

  it('should handle reconnection process', async () => {
    const { queryBuilder, getCurrentState } = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result, rerender } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
      if (mockSupabase._subscriptionCallback) {
        mockSupabase._subscriptionCallback({ 
          event: 'reconnect', 
          session: 'test-session' 
        })
      }
      rerender()
    })

    expect(getCurrentState().status).toBe('connected')
  })

  it('should update last_active timestamp', async () => {
    const { queryBuilder, getCurrentState } = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSession('test-board-id'))

    const timestamps: string[] = []

    await act(async () => {
      // Simulate multiple actions
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
      timestamps.push(getCurrentState().last_active_at)
      
      await result.current.updateSessionState([{ text: 'Update 1' } as BoardCell])
      timestamps.push(getCurrentState().last_active_at)
      
      await result.current.updateSessionState([{ text: 'Update 2' } as BoardCell])
      timestamps.push(getCurrentState().last_active_at)
    })

    expect(timestamps.length).toBeGreaterThan(1)
    timestamps.reduce((prev, curr) => {
      const prevDate = new Date(prev).getTime()
      const currDate = new Date(curr).getTime()
      expect(currDate).toBeGreaterThanOrEqual(prevDate)
      return curr
    })
  })
}) 