import { renderHook, act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
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

// Mock session data
const mockSession = {
  id: 'test-session-id',
  board_id: 'test-board-id',
  status: 'active',
  currentState: [] as BoardCell[],
  winner_id: null,
  players: []
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

describe('useSession Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    ;(createClientComponentClient as MockFn).mockReturnValue(mockSupabase)
  })

  it('should create a new session successfully', async () => {
    // Mock successful session creation
    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockResolvedValue({ data: mockSession, error: null })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.createSession('Player 1', '#ff0000')
    })

    // Verify session was created
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions')
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.error).toBeNull()
  })

  it('should prevent duplicate active sessions', async () => {
    // Mock existing active session
    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      try {
        await result.current.createSession('Player 1', '#ff0000')
      } catch (error) {
        expect((error as Error).message).toBe('An active session already exists for this board')
      }
    })

    expect(result.current.error).toBe('An active session already exists for this board')
  })

  it('should join an existing session successfully', async () => {
    // Mock successful session join
    const mockPlayer = {
      session_id: mockSession.id,
      user_id: 'test-user-id',
      player_name: 'Player 2',
      color: '#00ff00'
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession }),
      insert: jest.fn().mockResolvedValue({ data: mockPlayer, error: null })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession(mockSession.id, 'Player 2', '#00ff00')
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_players')
    expect(result.current.error).toBeNull()
  })

  it('should prevent joining full sessions', async () => {
    // Mock full session (8 players)
    const fullSession = {
      ...mockSession,
      players: Array(8).fill({ user_id: 'test-user' })
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fullSession })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      try {
        await result.current.joinSession(mockSession.id, 'Player 9', '#0000ff')
      } catch (error) {
        expect((error as Error).message).toBe('Session is full')
      }
    })

    expect(result.current.error).toBe('Session is full')
  })

  it('should handle session state updates', async () => {
    const newState = [mockBoardCell]
    
    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession }),
      update: jest.fn().mockResolvedValue({ data: { ...mockSession, currentState: newState }, error: null })
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.updateSessionState(newState)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions')
    expect(result.current.session?.currentState).toEqual(newState)
    expect(result.current.error).toBeNull()
  })
}) 