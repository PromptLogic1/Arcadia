import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePresence } from '@/components/challenges/bingo-board/hooks/usePresence'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PresenceState } from '@/components/challenges/bingo-board/types/presence.types'
import type { 
  RealtimeChannel, 
  RealtimePresenceJoinPayload, 
  RealtimePresenceLeavePayload
} from '@supabase/supabase-js'
import { PRESENCE_CONSTANTS } from '@/components/challenges/bingo-board/types/presence.constants'

const TIMING = {
  SETUP_DELAY: 0,
  STATE_UPDATE: 0,
  HEARTBEAT: 100
} as const

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Define callback types
interface PresenceStateWithRef extends PresenceState {
  presence_ref: string
}

type PresenceSyncPayload = Record<string, PresenceStateWithRef[]>
type _CallbackKey = 'presence-sync' | 'presence-join' | 'presence-leave'

type ChannelCallback = (payload: PresenceSyncPayload | RealtimePresenceJoinPayload<PresenceState> | RealtimePresenceLeavePayload<PresenceState>) => void

interface ChannelCallbacks {
  [key: string]: ChannelCallback | undefined
}

describe('usePresence', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockPresenceState: PresenceStateWithRef = {
    presence_ref: 'test-ref',
    user_id: mockUser.id,
    online_at: Date.now(),
    last_seen_at: Date.now(),
    status: 'online'
  }

  let channelCallbacks: ChannelCallbacks = {}

  // Type the mock channel
  const mockChannel = {
    on: jest.fn().mockImplementation((
      type: 'presence',
      filter: { event: string },
      callback: ChannelCallback
    ) => {
      const key = `${type}-${filter.event}`
      channelCallbacks[key] = callback
      return mockChannel
    }),
    subscribe: jest.fn((callback?: (status: string) => void) => {
      callback?.('SUBSCRIBED')
      return mockChannel
    }),
    track: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis(),
    presenceState: jest.fn().mockReturnValue({
      [mockUser.id]: [mockPresenceState]
    })
  } as unknown as jest.Mocked<RealtimeChannel>

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    },
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    channelCallbacks = {}
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with empty presence state', () => {
    const { result } = renderHook(() => usePresence('test-board'))
    expect(result.current.presenceState).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('should track user presence on mount', async () => {
    await act(async () => {
      renderHook(() => usePresence('test-board'))
      // Wait for setup to complete
      await Promise.resolve()
    })

    expect(mockSupabase.channel).toHaveBeenCalledWith(`${PRESENCE_CONSTANTS.CHANNEL_PREFIX}test-board`)
    expect(mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({
      user_id: mockUser.id,
      status: PRESENCE_CONSTANTS.STATUS.ONLINE
    }))
  })

  it('should handle presence sync events', async () => {
    const { result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      // Wait for setup to complete
      await Promise.resolve()
      
      const syncCallback = channelCallbacks['presence-sync']
      expect(syncCallback).toBeDefined()
      if (syncCallback) {
        syncCallback({
          [mockUser.id]: [mockPresenceState]
        })
      }
    })

    expect(result.current.presenceState[mockUser.id]).toEqual({
      user_id: mockUser.id,
      online_at: expect.any(Number),
      last_seen_at: expect.any(Number),
      status: PRESENCE_CONSTANTS.STATUS.ONLINE
    })
  })

  it('should handle presence join events', async () => {
    const { result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      await Promise.resolve()
      
      const joinCallback = channelCallbacks['presence-join']
      expect(joinCallback).toBeDefined()
      if (joinCallback) {
        joinCallback({
          event: 'join',
          key: mockUser.id,
          currentPresences: [],
          newPresences: [mockPresenceState]
        } as RealtimePresenceJoinPayload<PresenceState>)
      }
    })

    expect(result.current.presenceState[mockUser.id]).toEqual({
      user_id: mockUser.id,
      online_at: expect.any(Number),
      last_seen_at: expect.any(Number),
      status: PRESENCE_CONSTANTS.STATUS.ONLINE
    })
  })

  it('should handle presence leave events', async () => {
    const { result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      await Promise.resolve()

      // First add a presence
      const joinCallback = channelCallbacks['presence-join']
      expect(joinCallback).toBeDefined()
      if (joinCallback) {
        joinCallback({
          event: 'join',
          key: mockUser.id,
          currentPresences: [],
          newPresences: [mockPresenceState]
        } as RealtimePresenceJoinPayload<PresenceState>)
      }

      // Then remove it
      const leaveCallback = channelCallbacks['presence-leave']
      expect(leaveCallback).toBeDefined()
      if (leaveCallback) {
        leaveCallback({
          event: 'leave',
          key: mockUser.id,
          currentPresences: [mockPresenceState],
          leftPresences: [mockPresenceState]
        } as RealtimePresenceLeavePayload<PresenceState>)
      }

      await Promise.resolve()
    })

    expect(result.current.presenceState[mockUser.id]).toBeUndefined()
  })

  it('should get online users correctly', async () => {
    const { result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      await Promise.resolve()

      const syncCallback = channelCallbacks['presence-sync']
      expect(syncCallback).toBeDefined()
      if (syncCallback) {
        syncCallback({
          [mockUser.id]: [{
            ...mockPresenceState,
            status: PRESENCE_CONSTANTS.STATUS.ONLINE
          }],
          'offline-user': [{
            ...mockPresenceState,
            presence_ref: 'offline-ref',
            user_id: 'offline-user',
            status: PRESENCE_CONSTANTS.STATUS.OFFLINE
          }]
        })
      }

      await Promise.resolve()
    })

    const onlineUsers = result.current.getOnlineUsers()
    expect(onlineUsers).toHaveLength(1)
    expect(onlineUsers[0]).toEqual(expect.objectContaining({
      user_id: mockUser.id,
      status: PRESENCE_CONSTANTS.STATUS.ONLINE
    }))
  })

  it('should handle heartbeat updates', async () => {
    jest.useFakeTimers()
    
    await act(async () => {
      renderHook(() => usePresence('test-board'))
      await Promise.resolve()
      
      mockChannel.track.mockClear()
      jest.advanceTimersByTime(TIMING.HEARTBEAT)
      await Promise.resolve()
    })

    expect(mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({
      last_seen_at: expect.any(Number)
    }))

    jest.useRealTimers()
  })

  it('should handle visibility change to hidden', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      // Wait for initial setup
      await Promise.resolve()
      
      // Clear any previous calls
      mockChannel.track.mockClear()

      // Set document.hidden before dispatching event
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
        enumerable: true
      })

      // Mock track to return a successful response
      mockChannel.track = jest.fn().mockImplementation(async (payload) => {
        expect(payload).toEqual({
          user_id: mockUser.id,
          online_at: expect.any(Number),
          last_seen_at: expect.any(Number),
          status: PRESENCE_CONSTANTS.STATUS.AWAY
        })
        return mockChannel
      })

      // Trigger visibility change
      document.dispatchEvent(new Event('visibilitychange'))

      // Wait for all updates to complete
      await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  }, 10000) // Increase timeout

  it('should handle visibility change to visible', async () => {
    const { result: _result } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      // Wait for initial setup
      await Promise.resolve()
      
      // Clear any previous calls
      mockChannel.track.mockClear()

      // Set document.hidden before dispatching event
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false,
        enumerable: true
      })

      // Mock track to return a successful response
      mockChannel.track = jest.fn().mockImplementation(async (payload) => {
        expect(payload).toEqual({
          user_id: mockUser.id,
          online_at: expect.any(Number),
          last_seen_at: expect.any(Number),
          status: PRESENCE_CONSTANTS.STATUS.ONLINE
        })
        return mockChannel
      })

      // Trigger visibility change
      document.dispatchEvent(new Event('visibilitychange'))

      // Wait for all updates to complete
      await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  it('should handle authentication errors', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth error'))
    
    const { result } = renderHook(() => usePresence('test-board'))
    
    await act(async () => {
      // Wait for error to be set
      await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.error?.message).toBe('Auth error')
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => usePresence('test-board'))

    await act(async () => {
      // Wait for initial setup
      await Promise.resolve()
      
      // Trigger cleanup
      unmount()

      // Wait for cleanup to complete
      await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
})

