import { renderHook, act } from '@testing-library/react'
import { useSessionQueue } from '@/components/challenges/bingo-board/hooks'
import type { QueueEntry } from '@/components/challenges/bingo-board/components/shared/types'

type MockFn = jest.Mock

interface MockQueueResponse {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at: string | null
  error?: string
}

const mockSupabase = {
  from: jest.fn() as MockFn,
  auth: {
    getUser: jest.fn() as MockFn
  }
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}))

describe('useSessionQueue Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with empty queue', () => {
    const { result } = renderHook(() => useSessionQueue('test-session'))
    expect(result.current.queueEntries).toHaveLength(0)
    expect(result.current.isProcessing).toBeFalsy()
  })

  it('should add entries to queue', async () => {
    const mockEntry: QueueEntry = {
      id: 'entry-1',
      sessionId: 'test-session',
      userId: 'test-user',
      playerName: 'Test Player',
      color: '#ff0000',
      status: 'pending',
      requestedAt: new Date().toISOString()
    }

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({ data: mockEntry }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.addToQueue({
        playerName: 'Test Player',
        color: '#ff0000'
      })
    })

    expect(result.current.queueEntries).toHaveLength(1)
    const entry = result.current.queueEntries[0]
    if (entry) {
      expect(entry.status).toBe('pending')
      expect(entry.playerName).toBe('Test Player')
    }
  })

  it('should process queue in order', async () => {
    const entries: MockQueueResponse[] = [
      { id: 'entry-1', status: 'pending', processed_at: null },
      { id: 'entry-2', status: 'pending', processed_at: null }
    ]

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({ data: entries }),
      update: jest.fn().mockImplementation(async (data) => ({
        data: { ...data, processed_at: new Date().toISOString() }
      }))
    }))

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.processQueue()
    })

    expect(result.current.queueEntries.every((entry: QueueEntry) => 
      entry.status !== 'pending'
    )).toBe(true)
  })

  it('should handle queue conflicts', async () => {
    const mockEntry: MockQueueResponse = {
      id: 'entry-1',
      status: 'rejected',
      processed_at: new Date().toISOString(),
      error: 'Color already taken'
    }

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({ data: mockEntry }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.addToQueue({
        playerName: 'Test Player',
        color: '#ff0000' // Already taken color
      })
    })

    const entry = result.current.queueEntries[0]
    if (entry) {
      expect(entry.status).toBe('rejected')
      expect(entry.error).toBe('Color already taken')
    }
  })

  it('should clean up processed entries', async () => {
    const entries: MockQueueResponse[] = [
      { id: 'entry-1', status: 'approved', processed_at: new Date().toISOString() },
      { id: 'entry-2', status: 'rejected', processed_at: new Date().toISOString() },
      { id: 'entry-3', status: 'pending', processed_at: null }
    ]

    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({ data: entries }),
      delete: jest.fn().mockResolvedValue({ data: null })
    }))

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.cleanupQueue()
    })

    expect(result.current.queueEntries).toHaveLength(1)
    expect(result.current.queueEntries[0]?.status).toBe('pending')
  })
}) 