import { renderHook, act } from '@testing-library/react'
import { useSessionQueue } from '@/components/challenges/bingo-board/hooks'
import type { QueueEntry } from '@/components/challenges/bingo-board/components/shared/types'

// Improve mock implementation with proper chaining
const createMockQueryBuilder = () => {
  const queryBuilder = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  }
  return queryBuilder
}

const mockSupabase = {
  from: jest.fn(() => createMockQueryBuilder()),
  auth: {
    getUser: jest.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user' } }, 
      error: null 
    })
  }
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}))

describe('useSessionQueue Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mock implementations for each test
    const queryBuilder = createMockQueryBuilder()
    mockSupabase.from.mockReturnValue(queryBuilder)
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

    const queryBuilder = createMockQueryBuilder()
    queryBuilder.single.mockResolvedValueOnce({ data: mockEntry, error: null })
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.addToQueue({
        playerName: 'Test Player',
        color: '#ff0000'
      })
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_queue')
    expect(queryBuilder.insert).toHaveBeenCalled()
    expect(queryBuilder.single).toHaveBeenCalled()
  })

  it('should process queue in order', async () => {
    const mockEntries = [
      { id: 'entry-1', status: 'pending', requestedAt: new Date().toISOString() },
      { id: 'entry-2', status: 'pending', requestedAt: new Date().toISOString() }
    ]

    const queryBuilder = createMockQueryBuilder()
    queryBuilder.order.mockResolvedValueOnce({ data: mockEntries, error: null })
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.processQueue()
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_queue')
    expect(queryBuilder.select).toHaveBeenCalled()
    expect(queryBuilder.order).toHaveBeenCalled()
  })

  it('should handle queue conflicts', async () => {
    const errorMessage = 'Color already taken'
    const queryBuilder = createMockQueryBuilder()
    queryBuilder.single.mockResolvedValueOnce({ 
      data: null, 
      error: new Error(errorMessage)
    })
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      try {
        await result.current.addToQueue({
          playerName: 'Test Player',
          color: '#ff0000'
        })
        fail('Expected error to be thrown')
      } catch (error: unknown) {
        const actualError = error instanceof Error ? error : new Error(String(error))
        expect(actualError.message).toContain(errorMessage)
      }
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_queue')
    expect(queryBuilder.insert).toHaveBeenCalled()
    expect(queryBuilder.single).toHaveBeenCalled()
  })

  it('should clean up processed entries', async () => {
    const queryBuilder = createMockQueryBuilder()
    queryBuilder.neq.mockResolvedValueOnce({ data: null, error: null })
    mockSupabase.from.mockReturnValue(queryBuilder)

    const { result } = renderHook(() => useSessionQueue('test-session'))

    await act(async () => {
      await result.current.cleanupQueue()
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_queue')
    expect(queryBuilder.delete).toHaveBeenCalled()
    expect(queryBuilder.neq).toHaveBeenCalled()
  })
}) 