import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

type MockFn = jest.Mock

interface MockSession {
  id: string
  board_id: string
  status: 'active' | 'completed' | 'cancelled'
  current_state: BoardCell[]
  winner_id: string | null
  players: Array<{
    user_id: string
    player_name: string
    color: string
    team: number | null
  }>
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

const mockSession: MockSession = {
  id: 'test-session-id',
  board_id: 'test-board-id',
  status: 'active',
  current_state: [],
  winner_id: null,
  players: []
}

const mockBoardCell: BoardCell = {
  text: 'Test Cell',
  colors: [],
  completedBy: [],
  blocked: false,
  isMarked: false,
  cellId: '1'
}

describe('useSession Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useSession('test-board-id'))
    expect(result.current.loading).toBe(true)
    expect(result.current.session).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should fetch session data on mount', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.session).toBeTruthy()
    expect(result.current.error).toBeNull()
  })

  it('should handle session creation', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: null }) // No existing session
        .mockResolvedValueOnce({ data: mockSession }), // Created session
      insert: jest.fn().mockResolvedValue({ data: mockSession })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.createSession('Test Player', '#ff0000')
    })

    expect(result.current.session).toEqual(mockSession)
    expect(result.current.error).toBeNull()
  })

  it('should prevent duplicate active sessions', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      try {
        await result.current.createSession('Test Player', '#ff0000')
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('active session already exists')
      }
    })
  })

  it('should handle session state updates', async () => {
    const updatedState = [mockBoardCell]
    
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { ...mockSession, current_state: updatedState }
      }),
      update: jest.fn().mockResolvedValue({ 
        data: { ...mockSession, current_state: updatedState }
      })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.updateSessionState(updatedState)
    })

    expect(result.current.session?.currentState).toEqual(updatedState)
    expect(result.current.error).toBeNull()
  })

  it('should handle session completion', async () => {
    const winnerId = 'test-winner'
    
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { ...mockSession, status: 'completed', winner_id: winnerId }
      }),
      update: jest.fn().mockResolvedValue({ 
        data: { ...mockSession, status: 'completed', winner_id: winnerId }
      })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.updateSessionState([mockBoardCell], winnerId)
    })

    expect(result.current.session?.status).toBe('completed')
    expect(result.current.session?.winnerId).toBe(winnerId)
  })

  it('should clean up subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useSession('test-board-id'))
    unmount()
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
}) 