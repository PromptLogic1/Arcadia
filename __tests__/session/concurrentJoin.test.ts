import { act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type MockFn = jest.Mock

// Type for team counts
type TeamCounts = Record<number, number>

const mockSupabase = {
  from: jest.fn() as MockFn,
  auth: {
    getUser: jest.fn() as MockFn
  }
}

describe('Concurrent Join Request System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as MockFn).mockReturnValue(mockSupabase)
  })

  it('should process multiple join requests in FIFO order', async () => {
    const joinRequests = [
      { playerName: 'Player 1', color: '#ff0000', requestTime: new Date('2024-03-21T10:00:00Z') },
      { playerName: 'Player 2', color: '#00ff00', requestTime: new Date('2024-03-21T10:00:01Z') },
      { playerName: 'Player 3', color: '#0000ff', requestTime: new Date('2024-03-21T10:00:02Z') }
    ]

    const processedOrder: string[] = []

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        processedOrder.push(data.player_name)
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    await act(async () => {
      // Simulate concurrent joins
      await Promise.all(joinRequests.map(request => 
        fetch('/api/bingo/sessions/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            ...request
          })
        })
      ))
    })

    expect(processedOrder).toEqual(['Player 1', 'Player 2', 'Player 3'])
  })

  it('should handle color conflicts correctly', async () => {
    const conflictingRequests = [
      { playerName: 'Player 1', color: '#ff0000' },
      { playerName: 'Player 2', color: '#ff0000' } // Same color
    ]

    let approvedCount = 0
    let rejectedCount = 0

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        if (data.color === '#ff0000' && approvedCount > 0) {
          rejectedCount++
          return { error: { message: 'Color already taken' } }
        }
        approvedCount++
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    await act(async () => {
      await Promise.all(conflictingRequests.map(request => 
        fetch('/api/bingo/sessions/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            ...request
          })
        })
      ))
    })

    expect(approvedCount).toBe(1)
    expect(rejectedCount).toBe(1)
  })

  it('should balance team assignments', async () => {
    const teamJoinRequests = [
      { playerName: 'Player 1', color: '#ff0000', team: 1 },
      { playerName: 'Player 2', color: '#00ff00', team: 1 },
      { playerName: 'Player 3', color: '#0000ff', team: 2 }
    ]

    const teamCounts: TeamCounts = { 1: 0, 2: 0 }

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data: { team: number }) => {
        if (typeof data.team === 'number' && teamCounts[data.team] !== undefined) {
          teamCounts[data.team] = (teamCounts[data.team] || 0) + 1
        }
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    await act(async () => {
      await Promise.all(teamJoinRequests.map(request => 
        fetch('/api/bingo/sessions/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            ...request
          })
        })
      ))
    })

    // Verify team balance
    const team1Count = teamCounts[1] || 0
    const team2Count = teamCounts[2] || 0
    expect(Math.abs(team1Count - team2Count)).toBeLessThanOrEqual(1)
  })
}) 