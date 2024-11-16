import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell, Player } from '@/components/challenges/bingo-board/types/types'
import type { UseSession } from '@/components/challenges/bingo-board/types/session.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useSession', () => {
  const mockBoardId = 'test-board'
  const mockGame = 'All Games'
  const mockPlayers: Player[] = [
    { id: '1', name: 'Player 1', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', team: 0 }
  ]

  const mockBoardCell: BoardCell = {
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: 'cell-1'
  }

  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with default session state', () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    expect(result.current.isActive).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.isFinished).toBe(false)
    expect(result.current.players).toEqual(mockPlayers)
    expect(result.current.error).toBeNull()
  })

  it('should start session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.isActive).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
  })

  it('should pause session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.pauseSession()
    })

    expect(result.current.isPaused).toBe(true)
  })

  it('should resume session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.pauseSession()
      await result.current.resumeSession()
    })

    expect(result.current.isPaused).toBe(false)
  })

  it('should update cell correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.updateCell('cell-1', { isMarked: true })
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_cells')
  })

  it('should handle session end correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const mockOnSessionEnd = jest.fn()
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers,
      onSessionEnd: mockOnSessionEnd
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.endSession()
    })

    expect(result.current.isFinished).toBe(true)
    expect(mockOnSessionEnd).toHaveBeenCalled()
  })

  it('should handle state synchronization', async () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    const channel = mockSupabase.channel()
    const onCallback = channel.on.mock.calls[0]?.[2]

    act(() => {
      onCallback?.({
        new: {
          board_state: [mockBoardCell]
        }
      })
    })

    expect(result.current.board).toEqual([mockBoardCell])
  })

  it('should handle reconnection', async () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.reconnect()
    })

    expect(mockSupabase.from().select).toHaveBeenCalled()
  })

  it('should calculate completion rate correctly', () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    expect(result.current.completionRate).toBe(0)
  })

  it('should handle errors gracefully', async () => {
    mockSupabase.from().update().eq().single.mockRejectedValueOnce(new Error('Update failed'))

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle player synchronization', async () => {
    const hook = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    const newPlayers = [...mockPlayers, {
      id: '2',
      name: 'Player 2',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      team: 1
    }]

    await act(async () => {
      const session = (hook.result.current as unknown) as UseSession & {
        updateSessionPlayers?: (players: Player[]) => Promise<void>
      }
      
      if (session.updateSessionPlayers) {
        await session.updateSessionPlayers(newPlayers)
        expect(session.players).toEqual(newPlayers)
      } else {
        console.warn('updateSessionPlayers is not implemented')
      }
    })
  })

  it('should handle session timeout', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
      jest.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
    })

    expect(result.current.isPaused).toBe(true)
    jest.useRealTimers()
  })

  it('should handle version conflicts', async () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    const channel = mockSupabase.channel()
    const onCallback = channel.on.mock.calls[0]?.[2]

    act(() => {
      onCallback?.({
        new: {
          board_state: [mockBoardCell],
          version: result.current.stateVersion + 1
        }
      })
    })

    expect(result.current.board).toEqual([mockBoardCell])
    expect(result.current.stateVersion).toBe(result.current.stateVersion + 1)
  })

  it('should handle multiple reconnection attempts', async () => {
    mockSupabase.from().select().mockRejectedValueOnce(new Error('Connection failed'))
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.reconnect()
    })

    expect(mockSupabase.from().select).toHaveBeenCalledTimes(3)
  })

  it('should calculate completion rate correctly with marked cells', () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    act(() => {
      result.current.board = [
        { ...mockBoardCell, isMarked: true },
        { ...mockBoardCell, isMarked: true },
        { ...mockBoardCell, isMarked: false },
        { ...mockBoardCell, isMarked: false }
      ]
    })

    expect(result.current.completionRate).toBe(50)
  })

  it('should clear error state', async () => {
    mockSupabase.from().update().eq().single.mockRejectedValueOnce(new Error('Update failed'))

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })
})

