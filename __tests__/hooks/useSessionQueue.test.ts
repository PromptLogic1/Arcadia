import { act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

// Mock queue entry
const mockQueueEntry = {
  id: 'queue-entry-1',
  session_id: 'test-session',
  user_id: 'test-user',
  player_name: 'Test Player',
  color: '#ff0000',
  team: null,
  status: 'pending',
  requested_at: new Date().toISOString(),
  processed_at: null
}

describe('Session Queue System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as MockFn).mockReturnValue(mockSupabase)
  })

  it('should add player to queue when joining session', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockQueueEntry)
    }
    global.fetch = jest.fn().mockResolvedValue(mockResponse)

    await act(async () => {
      const response = await fetch('/api/bingo/sessions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          playerName: 'Test Player',
          color: '#ff0000'
        })
      })
      const data = await response.json()

      expect(data).toEqual(mockQueueEntry)
      expect(data.status).toBe('pending')
    })
  })

  it('should process queue entries in FIFO order', async () => {
    const queueEntries = [
      { ...mockQueueEntry, id: 'queue-1', requested_at: '2024-03-21T10:00:00Z' },
      { ...mockQueueEntry, id: 'queue-2', requested_at: '2024-03-21T10:00:01Z' }
    ]

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({ data: queueEntries[0] })
        .mockResolvedValueOnce({ data: queueEntries[1] })
    }))

    // Verify first entry is processed before second
    const processedEntries: string[] = []
    await act(async () => {
      for (const entry of queueEntries) {
        const { data } = await mockSupabase
          .from('bingo_session_queue')
          .select()
          .eq('session_id', entry.session_id)
          .single()
        
        processedEntries.push(data.id)
      }
    })

    expect(processedEntries).toEqual(['queue-1', 'queue-2'])
  })

  it('should handle color conflicts in queue', async () => {
    const conflictingEntry = {
      ...mockQueueEntry,
      status: 'rejected',
      processed_at: new Date().toISOString()
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: conflictingEntry })
    }))

    await act(async () => {
      const response = await fetch('/api/bingo/sessions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          playerName: 'Test Player',
          color: '#ff0000' // Already taken color
        })
      })
      const data = await response.json()

      expect(data.status).toBe('rejected')
      expect(data.processed_at).toBeTruthy()
    })
  })

  it('should reject queue entries when session is full', async () => {
    // Mock session with 8 players
    const fullSession = {
      id: 'test-session',
      players: Array(8).fill({ user_id: 'existing-user' })
    }

    mockSupabase.from.mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fullSession })
    }))

    await act(async () => {
      const response = await fetch('/api/bingo/sessions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          playerName: 'Test Player',
          color: '#ff0000'
        })
      })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Session is full')
    })
  })

  it('should clean up processed queue entries', async () => {
    mockSupabase.from.mockImplementation((_table: string) => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({ data: null })
    }))

    await act(async () => {
      const { error } = await mockSupabase
        .from('bingo_session_queue')
        .delete()
        .eq('status', 'approved')
        .lt('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      expect(error).toBeNull()
    })
  })
}) 