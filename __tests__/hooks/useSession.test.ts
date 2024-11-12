import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
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

const createMockQueryBuilder = (mockData: any = null) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null })
  }),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: mockData, error: null })
})

describe('useSession Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock responses
    mockSupabaseClient.from.mockImplementation(() => createMockQueryBuilder())
    global.fetch = jest.fn()
  })

  it('should initialize with loading state', async () => {
    const { result } = renderHook(() => useSession('test-board-id'))
    
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBeNull()
    expect(result.current.error).toBeNull()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  it('should fetch session data on mount', async () => {
    const mockSession = {
      id: 'test-session',
      board_id: 'test-board-id',
      status: 'active',
      current_state: [mockBoardCell],
      winner_id: null,
      players: []
    }

    mockSupabaseClient.from.mockImplementation(() => createMockQueryBuilder(mockSession))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.session).toBeTruthy()
    expect(result.current.error).toBeNull()
  })

  it('should handle session creation', async () => {
    const mockNewSession = {
      id: 'new-session',
      board_id: 'test-board-id',
      status: 'active',
      current_state: [mockBoardCell],
      winner_id: null,
      players: []
    }

    // Set up initial mock for checking existing sessions
    mockSupabaseClient.from.mockImplementation(() => ({
      ...createMockQueryBuilder(),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    }))

    // Mock fetch response for session creation
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNewSession)
      })
    )

    const { result } = renderHook(() => useSession('test-board-id'))

    let fetchCompleted = false

    await act(async () => {
      // Wait for initial fetch
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Create session
      const createPromise = result.current.createSession('Test Player', '#ff0000')
      
      // Immediately update mock to return the new session
      mockSupabaseClient.from.mockImplementation(() => ({
        ...createMockQueryBuilder(mockNewSession),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockNewSession, error: null })
            })
          })
        })
      }))

      await createPromise
      fetchCompleted = true

      // Wait for state updates to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Verify session was created
    expect(fetchCompleted).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith('/api/bingo/sessions', expect.any(Object))
    expect(result.current.session).toBeTruthy()
    expect(result.current.session?.id).toBe('new-session')
    expect(result.current.error).toBeNull()
  })

  it('should handle session state updates', async () => {
    const updatedState = [mockBoardCell]
    const mockSessionData = {
      id: 'test-session',
      board_id: 'test-board-id',
      status: 'active',
      current_state: updatedState,
      winner_id: null,
      players: []
    }

    mockSupabaseClient.from.mockImplementation(() => createMockQueryBuilder(mockSessionData))

    // Mock fetch response for state update
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
    )

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
      await result.current.updateSessionState(updatedState)
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.session?.currentState).toEqual(updatedState)
    expect(result.current.error).toBeNull()
  })

  it('should handle session completion', async () => {
    const winnerId = 'test-winner'
    const mockSession = {
      id: 'test-session',
      board_id: 'test-board-id',
      status: 'completed',
      current_state: [mockBoardCell],
      winner_id: winnerId,
      players: []
    }

    mockSupabaseClient.from.mockImplementation(() => createMockQueryBuilder(mockSession))

    // Mock fetch response for session completion
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
    )

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
      await result.current.updateSessionState([mockBoardCell], winnerId)
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.session?.status).toBe('completed')
    expect(result.current.session?.winnerId).toBe(winnerId)
  })

  it('should clean up subscriptions on unmount', async () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    }

    mockSupabaseClient.channel.mockReturnValue(mockChannel)

    const { unmount } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      unmount()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSupabaseClient.removeChannel).toHaveBeenCalled()
  })
}) 