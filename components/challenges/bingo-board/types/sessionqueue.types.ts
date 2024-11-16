import type { Player } from './types'

export interface QueueEntry {
  id: string
  sessionId: string
  userId: string
  playerName: string
  color: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  position?: number
  error?: string
}

export interface QueueEvent {
  type: 'queueJoin' | 'queueLeave' | 'queueUpdate' | 'queueError'
  entry: QueueEntry
  timestamp: number
}

export interface UseSessionQueue {
  // States
  queueEntries: QueueEntry[]
  isProcessing: boolean
  error: Error | null

  // Queue Operations
  addToQueue: (player: Pick<Player, 'name' | 'color'>) => Promise<void>
  removeFromQueue: (entryId: string) => Promise<void>
  processQueue: () => Promise<void>
  updateQueuePosition: (entryId: string, newPosition: number) => Promise<void>

  // Status Management
  checkQueueStatus: () => Promise<boolean>
  validateQueueSize: () => boolean
  cleanupQueue: () => Promise<void>
}
