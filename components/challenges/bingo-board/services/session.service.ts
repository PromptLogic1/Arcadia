import type { BaseSessionEvent, LocalSessionEvent } from '../types/session.types'
import type { Player } from '../types/types'

export class SessionService {
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
  ): LocalSessionEvent {
    return {
      type,
      timestamp: Date.now(),
      playerId,
      data,
      sessionId: crypto.randomUUID()
    }
  }

  handlePlayerSync(players: Player[]): LocalSessionEvent {
    return this.createEvent('playerJoin', undefined, { players })
  }

  handleStateSync(state: unknown): LocalSessionEvent {
    return this.createEvent('stateSync', undefined, { state })
  }
} 