import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePresence } from '@/components/challenges/bingo-board/hooks/usePresence'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PresenceState } from '@/components/challenges/bingo-board/types/presence.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('usePresence', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockPresenceState: PresenceState = {
    user_id: mockUser.id,
    online_at: Date.now(),
    last_seen_at: Date.now(),
    status: 'online'
  }

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation(cb => cb('SUBSCRIBED')),
      track: jest.fn(),
      unsubscribe: jest.fn()
    })),
    removeChannel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with empty presence state', () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))
    expect(_result.current.presenceState).toEqual({})
    expect(_result.current.error).toBeNull()
  })

  it('should track user presence on mount', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSupabase.channel).toHaveBeenCalledWith('presence:test-board')
    expect(mockSupabase.channel().track).toHaveBeenCalledWith(expect.objectContaining({
      user_id: mockUser.id,
      status: 'online'
    }))
  })

  it('should handle presence sync events', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    const channel = mockSupabase.channel()
    const syncCallback = channel.on.mock.calls.find(
      call => call[0] === 'presence' && call[1].event === 'sync'
    )?.[2]

    if (!syncCallback) throw new Error('Sync callback not found')

    act(() => {
      syncCallback({
        [mockUser.id]: [mockPresenceState]
      })
    })

    expect(_result.current.presenceState[mockUser.id]).toEqual(mockPresenceState)
  })

  it('should handle presence join events', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    const channel = mockSupabase.channel()
    const joinCallback = channel.on.mock.calls.find(
      call => call[0] === 'presence' && call[1].event === 'join'
    )?.[2]

    if (!joinCallback) throw new Error('Join callback not found')

    act(() => {
      joinCallback({
        key: mockUser.id,
        newPresences: [mockPresenceState]
      })
    })

    expect(_result.current.presenceState[mockUser.id]).toEqual(mockPresenceState)
  })

  it('should handle presence leave events', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    // First add a presence
    act(() => {
      const newState = { ..._result.current.presenceState }
      newState[mockUser.id] = mockPresenceState
      _result.current.presenceState = newState
    })

    const channel = mockSupabase.channel()
    const leaveCallback = channel.on.mock.calls.find(
      call => call[0] === 'presence' && call[1].event === 'leave'
    )?.[2]

    if (!leaveCallback) throw new Error('Leave callback not found')

    act(() => {
      leaveCallback({
        key: mockUser.id
      })
    })

    expect(_result.current.presenceState[mockUser.id]).toBeUndefined()
  })

  it('should get online users correctly', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    act(() => {
      const newState = { ..._result.current.presenceState }
      newState[mockUser.id] = {
        ...mockPresenceState,
        status: 'online'
      }
      newState['offline-user'] = {
        ...mockPresenceState,
        user_id: 'offline-user',
        status: 'offline'
      }
      _result.current.presenceState = newState
    })

    const onlineUsers = _result.current.getOnlineUsers()
    const onlineUser = onlineUsers[0]
    expect(onlineUsers).toHaveLength(1)
    expect(onlineUser?.user_id).toBe(mockUser.id)
  })

  it('should handle heartbeat updates', async () => {
    jest.useFakeTimers()
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      jest.advanceTimersByTime(30000) // Advance by heartbeat interval
    })

    expect(mockSupabase.channel().track).toHaveBeenCalledWith(
      expect.objectContaining({
        last_seen_at: expect.any(Number)
      })
    )

    jest.useRealTimers()
  })

  it('should handle visibility change to hidden', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockSupabase.channel().track).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'away'
      })
    )
  })

  it('should handle visibility change to visible', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockSupabase.channel().track).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'online'
      })
    )
  })

  it('should handle authentication errors', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'))
    
    const { result: _result } = renderHook(() => usePresence('test-board'))
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(_result.current.error?.message).toBe('Auth error')
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePresence('test-board'))
    
    unmount()
    
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    )
  })
})

