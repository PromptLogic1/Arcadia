import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import type { SessionEvent } from '@/components/challenges/bingo-board/types/events'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

describe('useSession Event Handling', () => {
  const mockBoardId = 'test-board'
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }

  const mockSupabase = {
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null })
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should handle player join events', async () => {
    const { result: _result } = renderHook(() => useSession({ 
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const playerEvent: SessionEvent = {
      type: 'playerJoin',
      timestamp: Date.now(),
      sessionId: mockBoardId,
      playerId: 'player-1',
      playerData: {
        name: 'Test Player',
        color: 'bg-blue-500',
        team: 0
      }
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: playerEvent })
    })

    expect(_result.current.players?.[0]?.id).toBe('player-1')
  })

  it('should handle cell update events', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const cellEvent: SessionEvent = {
      type: 'cellUpdate',
      timestamp: Date.now(),
      sessionId: mockBoardId,
      cellId: 'cell-1',
      playerId: 'player-1',
      updates: {
        text: 'Updated Text',
        isMarked: true
      }
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: cellEvent })
    })

    expect(_result.current.board?.[0]?.text).toBe('Updated Text')
  })

  it('should handle state sync events', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const mockState = [{
      text: 'Test Cell',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: 'cell-1',
      version: 2,
      lastUpdated: Date.now()
    }]

    const stateSyncEvent: SessionEvent = {
      type: 'stateSync',
      timestamp: Date.now(),
      sessionId: mockBoardId,
      state: mockState,
      source: 'server',
      version: 2
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: stateSyncEvent })
    })

    expect(_result.current.board).toEqual(mockState)
    expect(_result.current.stateVersion).toBe(2)
  })

  it('should handle conflict resolution events', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const serverState = [{
      text: 'Server Version',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: 'cell-1',
      version: 3,
      lastUpdated: Date.now()
    }]

    const conflictEvent: SessionEvent = {
      type: 'conflict',
      timestamp: Date.now(),
      sessionId: mockBoardId,
      state: serverState,
      source: 'server',
      conflictResolution: {
        winner: 'server',
        reason: 'Server has higher version'
      }
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: conflictEvent })
    })

    expect(_result.current.board).toEqual(serverState)
  })

  it('should handle connection events', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const reconnectEvent: SessionEvent = {
      type: 'reconnect',
      timestamp: Date.now(),
      sessionId: mockBoardId,
      attempt: 1,
      success: true
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: reconnectEvent })
    })

    // Should trigger reconnection logic
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_sessions')
  })

  it('should handle timeout events', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    // First set session as active
    await act(async () => {
      await _result.current.startSession()
    })

    const timeoutEvent: SessionEvent = {
      type: 'timeout',
      timestamp: Date.now(),
      sessionId: mockBoardId
    }

    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      broadcastHandler({ payload: timeoutEvent })
    })

    expect(_result.current.isPaused).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
  })

  it('should handle inactivity timeout', async () => {
    jest.useFakeTimers()
    
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    // Start session
    await act(async () => {
      await _result.current.startSession()
    })

    // Fast forward 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000)
    })

    expect(_result.current.isPaused).toBe(true)

    jest.useRealTimers()
  })

  it('should merge states correctly based on version', async () => {
    const { result: _result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    const olderState = [{
      text: 'Old Version',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: 'cell-1',
      version: 1,
      lastUpdated: Date.now() - 1000
    }]

    const newerState = [{
      text: 'New Version',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: 'cell-1',
      version: 2,
      lastUpdated: Date.now()
    }]

    // Try to apply older state after newer state
    await act(async () => {
      const broadcastHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === '*'
      )[2]
      
      // First apply newer state
      broadcastHandler({ 
        payload: {
          type: 'stateSync',
          timestamp: Date.now(),
          sessionId: mockBoardId,
          state: newerState,
          source: 'server',
          version: 2
        }
      })

      // Then try to apply older state
      broadcastHandler({ 
        payload: {
          type: 'stateSync',
          timestamp: Date.now(),
          sessionId: mockBoardId,
          state: olderState,
          source: 'server',
          version: 1
        }
      })
    })

    // Should keep newer state
    expect(_result.current.board?.[0]?.text).toBe('New Version')
    expect(_result.current.stateVersion).toBe(2)
  })
}) 