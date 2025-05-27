import type { BaseSessionEvent, SessionEvent } from '../types/session.types'
import type { Player } from '../types/types'

export class SessionService {
  private boardId: string

  constructor(boardId: string) {
    this.boardId = boardId
  }

  validateEvent(event: BaseSessionEvent): boolean {
    return (
      typeof event.type === 'string' &&
      typeof event.timestamp === 'number' &&
      (!event.playerId || typeof event.playerId === 'string') &&
      (!event.version || typeof event.version === 'number')
    )
  }

  createEvent(
    type: BaseSessionEvent['type'],
    playerId?: string,
    data?: unknown
  ): SessionEvent {
    return {
      id: crypto.randomUUID(),
      board_id: this.boardId,
      type,
      timestamp: Date.now(),
      player_id: playerId,
      data,
      version: Date.now()
    }
  }

  handlePlayerSync(players: Player[]): SessionEvent {
    return this.createEvent('playerJoin', undefined, { players })
  }

  handleStateSync(state: unknown): SessionEvent {
    return this.createEvent('stateSync', undefined, { state })
  }
} 