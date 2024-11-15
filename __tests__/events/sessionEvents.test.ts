import type { 
  SessionEvent,
  PlayerEvent,
  CellUpdateEvent,
  StateEvent,
  ConnectionEvent 
} from '@/components/challenges/bingo-board/types/events'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'

const _SessionEvent: SessionEvent = {} as SessionEvent

describe('Session Events', () => {
  const mockSessionId = 'test-session'
  const mockTimestamp = Date.now()

  it('should create valid player events', () => {
    const playerEvent: PlayerEvent = {
      type: 'playerJoin',
      timestamp: mockTimestamp,
      sessionId: mockSessionId,
      playerId: 'player-1',
      playerData: {
        name: 'Test Player',
        color: 'bg-blue-500',
        team: 0
      }
    }

    expect(playerEvent.type).toBe('playerJoin')
    expect(playerEvent.playerId).toBeDefined()
    expect(playerEvent.playerData).toBeDefined()
  })

  it('should create valid cell update events', () => {
    const cellEvent: CellUpdateEvent = {
      type: 'cellUpdate',
      timestamp: mockTimestamp,
      sessionId: mockSessionId,
      cellId: 'cell-1',
      playerId: 'player-1',
      updates: {
        text: 'Updated Text',
        isMarked: true,
        version: 2,
        lastUpdated: Date.now()
      }
    }

    expect(cellEvent.type).toBe('cellUpdate')
    expect(cellEvent.updates).toBeDefined()
    expect(cellEvent.updates.version).toBeDefined()
  })

  it('should create valid state sync events', () => {
    const mockState: BoardCell[] = [
      {
        text: 'Test Cell',
        colors: [],
        completedBy: [],
        blocked: false,
        isMarked: false,
        cellId: 'cell-1',
        version: 1,
        lastUpdated: Date.now()
      }
    ]

    const stateEvent: StateEvent = {
      type: 'stateSync',
      timestamp: mockTimestamp,
      sessionId: mockSessionId,
      state: mockState,
      source: 'server',
      version: 1
    }

    expect(stateEvent.type).toBe('stateSync')
    expect(stateEvent.state).toBeInstanceOf(Array)
    expect(stateEvent.source).toBe('server')
  })

  it('should create valid connection events', () => {
    const connectionEvent: ConnectionEvent = {
      type: 'reconnect',
      timestamp: mockTimestamp,
      sessionId: mockSessionId,
      attempt: 1,
      success: true
    }

    expect(connectionEvent.type).toBe('reconnect')
    expect(connectionEvent.attempt).toBeDefined()
    expect(connectionEvent.success).toBeDefined()
  })

  it('should handle conflict resolution events', () => {
    const conflictEvent: StateEvent = {
      type: 'conflict',
      timestamp: mockTimestamp,
      sessionId: mockSessionId,
      state: [],
      source: 'client',
      conflictResolution: {
        winner: 'server',
        reason: 'Server state has higher version number'
      }
    }

    expect(conflictEvent.type).toBe('conflict')
    expect(conflictEvent.conflictResolution).toBeDefined()
    expect(conflictEvent.conflictResolution?.winner).toBe('server')
  })
}) 