import { renderHook, act } from '@testing-library/react'
import { usePresence } from '@/components/challenges/bingo-board/hooks/usePresence'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PresenceState } from '@/components/challenges/bingo-board/types/presence.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('usePresence', () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    track: jest.fn(),
    presenceState: jest.fn()
  }

  const mockSupabase = {
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize presence tracking', async () => {
    const { result } = renderHook(() => usePresence('test-board'))

    expect(mockSupabase.channel).toHaveBeenCalledWith('presence:test-board')
    expect(mockChannel.on).toHaveBeenCalledTimes(3) // sync, join, leave
    expect(mockChannel.subscribe).toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('should update presence state on sync', async () => {
    const mockPresence: PresenceState = {
      user_id: 'user-1',
      online_at: Date.now(),
      last_seen_at: Date.now(),
      status: 'online'
    }

    const mockState = {
      'user-1': [mockPresence]
    }

    mockChannel.presenceState.mockReturnValue(mockState)

    const { result } = renderHook(() => usePresence('test-board'))

    // Simulate presence sync
    await act(async () => {
      const syncHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === 'sync'
      )[2]
      syncHandler()
    })

    expect(result.current.presenceState['user-1']).toEqual(mockPresence)
  })

  it('should handle join events', async () => {
    const mockPresence: PresenceState = {
      user_id: 'user-1',
      online_at: Date.now(),
      last_seen_at: Date.now(),
      status: 'online'
    }

    const { result } = renderHook(() => usePresence('test-board'))

    // Simulate join event
    await act(async () => {
      const joinHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === 'join'
      )[2]
      joinHandler({ key: 'user-1', newPresences: [mockPresence] })
    })

    expect(result.current.presenceState['user-1']).toEqual(mockPresence)
  })

  it('should handle leave events', async () => {
    const mockPresence: PresenceState = {
      user_id: 'user-1',
      online_at: Date.now(),
      last_seen_at: Date.now(),
      status: 'online'
    }

    const { result } = renderHook(() => usePresence('test-board'))

    // First add a presence
    await act(async () => {
      const joinHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === 'join'
      )[2]
      joinHandler({ key: 'user-1', newPresences: [mockPresence] })
    })

    // Then simulate leave event
    await act(async () => {
      const leaveHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === 'leave'
      )[2]
      leaveHandler({ key: 'user-1' })
    })

    expect(result.current.presenceState['user-1']).toBeUndefined()
  })

  it('should handle visibility change', async () => {
    renderHook(() => usePresence('test-board'))

    // Simulate visibility change
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockChannel.track).toHaveBeenCalled()
    expect(mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({
      status: expect.any(String)
    }))
  })

  it('should handle errors gracefully', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'))

    const { result } = renderHook(() => usePresence('test-board'))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to track presence')
  })

  it('should return online users correctly', async () => {
    const mockPresences = {
      'user-1': [{
        user_id: 'user-1',
        online_at: Date.now(),
        last_seen_at: Date.now(),
        status: 'online'
      }],
      'user-2': [{
        user_id: 'user-2',
        online_at: Date.now(),
        last_seen_at: Date.now(),
        status: 'away'
      }]
    }

    mockChannel.presenceState.mockReturnValue(mockPresences)

    const { result } = renderHook(() => usePresence('test-board'))

    // Simulate presence sync
    await act(async () => {
      const syncHandler = mockChannel.on.mock.calls.find(
        call => call[1].event === 'sync'
      )[2]
      syncHandler()
    })

    const onlineUsers = result.current.getOnlineUsers()
    expect(onlineUsers).toHaveLength(1)
    expect(onlineUsers[0]?.user_id).toBe('user-1')
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      unmount()
    })

    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
}) 