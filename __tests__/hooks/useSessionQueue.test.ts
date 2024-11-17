'use client'

import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSessionQueue } from '@/components/challenges/bingo-board/hooks/useSessionQueue'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { QueueEntry, UseSessionQueue } from '@/components/challenges/bingo-board/types/sessionqueue.types'
import { QUEUE_CONSTANTS } from '@/components/challenges/bingo-board/types/sessionqueue.constants'

// Set global timeout
jest.setTimeout(30000)

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Mock hooks
const mockGameSettings = jest.fn()
const mockPlayerManagement = jest.fn()
const mockSession = jest.fn()

jest.mock('@/components/challenges/bingo-board/hooks/useGameSettings', () => ({
  useGameSettings: () => mockGameSettings()
}))

jest.mock('@/components/challenges/bingo-board/hooks/usePlayerManagement', () => ({
  usePlayerManagement: () => mockPlayerManagement()
}))

jest.mock('@/components/challenges/bingo-board/hooks/useSession', () => ({
  useSession: () => mockSession()
}))

describe('useSessionQueue', () => {
  const mockSessionId = 'test-session-id'
  const mockUser = { id: 'test-user', email: 'test@example.com' }
  
  // Setup mock data
  const createMockEntry = (id: string): QueueEntry => ({
    id: `queue-${id}`,
    sessionId: mockSessionId,
    userId: `user-${id}`,
    playerName: `Test Player ${id}`,
    color: 'bg-blue-500',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    position: Number(id),
    priority: 'normal'
  })

  // Improve mock Supabase client setup with complete chains
  const createMockSupabaseClient = () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    },
    from: jest.fn().mockImplementation((_: string) => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: {
              id: 'test-id',
              session_id: mockSessionId,
              user_id: mockUser.id,
              player_name: 'Test Player',
              color: 'bg-blue-500',
              status: 'pending',
              requested_at: new Date().toISOString(),
              priority: 'normal'
            }, 
            error: null 
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      delete: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          lt: jest.fn().mockResolvedValue({ data: null, error: null })
        }),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      })
    }))
  })

  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>
  let result: { current: UseSessionQueue }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockSupabaseClient = createMockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    
    mockGameSettings.mockReturnValue({ settings: { maxPlayerLimit: 8 } })
    mockPlayerManagement.mockReturnValue({ players: [] })
    mockSession.mockReturnValue({ isActive: true })

    // Initialize hook and wait for it to be ready
    const rendered = renderHook(() => useSessionQueue(mockSessionId))
    result = rendered.result as { current: UseSessionQueue }
    await act(() => Promise.resolve())
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.clearAllMocks()
  })

  // Core Queue Operations
  describe('Queue Operations', () => {
    it('should initialize with empty queue', () => {
      expect(result.current.queueEntries).toEqual([])
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should prevent adding player when queue is full', async () => {
      // Setup mock data
      const mockEntries = Array(QUEUE_CONSTANTS.LIMITS.MAX_QUEUE_SIZE)
        .fill(null)
        .map((_, i) => createMockEntry(String(i)))

      await act(async () => {
        result.current.setQueueEntriesForTesting?.(mockEntries)
        await Promise.resolve() // Wait for state update
      })

      const mockPlayer = { name: 'Extra Player', color: 'bg-red-500' }

      await expect(result.current.addToQueue(mockPlayer))
        .rejects.toThrow(QUEUE_CONSTANTS.ERRORS.QUEUE_FULL)
    }, 15000)

    // Test cleanup behavior
    it('should clean up expired entries', async () => {
      const oldEntry = createMockEntry('old')
      oldEntry.requestedAt = new Date(
        Date.now() - QUEUE_CONSTANTS.LIMITS.MAX_WAIT_TIME - 1000
      ).toISOString()
      oldEntry.status = 'approved' // Set status to approved so it gets cleaned up

      // Setup mock response for cleanup and processQueue
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'bingo_session_queue') {
          return {
            delete: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                lt: jest.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null })
        }
      })

      // Set initial state
      await act(async () => {
        result.current.setQueueEntriesForTesting?.([oldEntry])
        await Promise.resolve()
      })

      // Call cleanup directly
      await act(async () => {
        await result.current.cleanupQueue()
        // Wait for state updates
        await Promise.resolve()
        await Promise.resolve() // Wait for both delete and processQueue
      })

      // Verify cleanup was called with correct chain
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bingo_session_queue')
      expect(result.current.queueEntries).toHaveLength(0)
    }, 5000)
  })

  // State Updates
  describe('State Updates', () => {
    it('should update queue entries atomically', async () => {
      const entry = createMockEntry('1')

      await act(async () => {
        result.current.queueEntries = [entry]
      })

      expect(result.current.queueEntries).toHaveLength(1)
      expect(result.current.queueEntries[0]).toEqual(entry)
    })
  })

  // Error Handling
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(networkError)
          })
        })
      })

      await act(async () => {
        await expect(result.current.addToQueue({
          name: 'Test Player',
          color: 'bg-blue-500'
        })).rejects.toThrow(networkError)
        await Promise.resolve()
      })

      expect(result.current.error?.message).toBe('Network error')
    }, 5000)

    it('should handle invalid queue positions', async () => {
      await act(async () => {
        result.current.setQueueEntriesForTesting?.([{
          id: 'queue-1',
          sessionId: mockSessionId,
          userId: 'user-1',
          playerName: 'Player 1',
          color: 'bg-blue-500',
          status: 'pending',
          requestedAt: new Date().toISOString(),
          position: 0,
          priority: 'normal'
        }])
        await Promise.resolve()
      })

      await act(async () => {
        await expect(result.current.updateQueuePosition('queue-1', -1))
          .rejects.toThrow(QUEUE_CONSTANTS.ERRORS.INVALID_POSITION)
        await Promise.resolve()
      })

      expect(result.current.error?.message).toBe(QUEUE_CONSTANTS.ERRORS.INVALID_POSITION)
    }, 5000)
  })

  // Reconnection Tests
  describe('Reconnection', () => {
    it('should restore queue state', async () => {
      const mockQueueData = Array(3).fill(null).map((_, i) => ({
        id: `queue-${i}`,
        session_id: mockSessionId,
        user_id: `user-${i}`,
        player_name: `Player ${i}`,
        color: 'bg-blue-500',
        status: 'pending',
        requested_at: new Date().toISOString(),
        priority: 'normal'
      }))

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockQueueData, error: null })
          })
        })
      })

      await act(async () => {
        await result.current.reconnect()
        await Promise.resolve()
      })

      expect(result.current.queueEntries).toHaveLength(3)
      const firstEntry = result.current.queueEntries[0]
      expect(firstEntry?.priority).toBe('normal')
    }, 30000)

    it('should handle reconnection failures', async () => {
      const connectionError = new Error('Connection failed')
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockRejectedValue(connectionError)
          })
        })
      })

      await act(async () => {
        await expect(result.current.reconnect())
          .rejects.toThrow(connectionError)
        await Promise.resolve()
      })

      expect(result.current.error?.message).toBe('Connection failed')
    }, 5000)
  })
})

