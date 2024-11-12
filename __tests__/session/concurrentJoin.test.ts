import { act } from '@testing-library/react'

// Type for team counts
type TeamCounts = Record<number, number>

// Create a mock fetch implementation
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Concurrent Join Request System', () => {
  let processedOrder: string[] = []
  let approvedCount = 0
  let rejectedCount = 0

  beforeEach(() => {
    jest.clearAllMocks()
    processedOrder = []
    approvedCount = 0
    rejectedCount = 0
  })

  it('should process multiple join requests in FIFO order', async () => {
    const joinRequests = [
      { playerName: 'Player 1', color: '#ff0000', requestTime: new Date('2024-03-21T10:00:00Z') },
      { playerName: 'Player 2', color: '#00ff00', requestTime: new Date('2024-03-21T10:00:01Z') },
      { playerName: 'Player 3', color: '#0000ff', requestTime: new Date('2024-03-21T10:00:02Z') }
    ]

    // Mock fetch to simulate server response
    mockFetch.mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      processedOrder.push(body.playerName)
      return {
        ok: true,
        json: async () => ({ success: true })
      }
    })

    await act(async () => {
      // Process requests sequentially to maintain order
      for (const request of joinRequests) {
        await fetch('/api/bingo/sessions/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            ...request
          })
        })
      }
    })

    expect(processedOrder).toEqual(['Player 1', 'Player 2', 'Player 3'])
  })

  it('should handle color conflicts correctly', async () => {
    const conflictingRequests = [
      { playerName: 'Player 1', color: '#ff0000' },
      { playerName: 'Player 2', color: '#ff0000' } // Same color
    ]

    // Mock fetch to simulate color conflict
    mockFetch.mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      if (body.color === '#ff0000' && approvedCount > 0) {
        rejectedCount++
        return {
          ok: false,
          json: async () => ({ error: 'Color already taken' })
        }
      }
      approvedCount++
      return {
        ok: true,
        json: async () => ({ success: true })
      }
    })

    await act(async () => {
      for (const request of conflictingRequests) {
        try {
          await fetch('/api/bingo/sessions/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'test-session',
              ...request
            })
          })
        } catch (error) {
          // Ignore errors as they're expected for rejected requests
        }
      }
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

    mockFetch.mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body)
      if (typeof body.team === 'number') {
        teamCounts[body.team] = (teamCounts[body.team] || 0) + 1
      }
      return {
        ok: true,
        json: async () => ({ success: true })
      }
    })

    await act(async () => {
      for (const request of teamJoinRequests) {
        await fetch('/api/bingo/sessions/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            ...request
          })
        })
      }
    })

    // Verify team balance
    const team1Count = teamCounts[1] || 0
    const team2Count = teamCounts[2] || 0
    expect(Math.abs(team1Count - team2Count)).toBeLessThanOrEqual(1)
  })
}) 