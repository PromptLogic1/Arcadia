import type { Player } from './types'

export interface QueueEntry {
  id: string
  sessionId: string
  userId: string
  playerName: string
  color: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  position: number
  priority?: 'high' | 'normal' | 'low'
}

export interface QueueEntryWithError extends QueueEntry {
  error?: string
}

export interface QueueEvent {
  type: 'queueJoin' | 'queueLeave' | 'queueUpdate' | 'queueError'
  entry: QueueEntry
  timestamp: number
}

export interface UseSessionQueue {
  queueEntries: QueueEntry[]
  isProcessing: boolean
  error: Error | null
  addToQueue: (player: Pick<Player, 'name' | 'color'>) => Promise<void>
  removeFromQueue: (entryId: string) => Promise<void>
  processQueue: () => Promise<void>
  updateQueuePosition: (entryId: string, newPosition: number) => Promise<void>
  checkQueueStatus: () => Promise<boolean>
  validateQueueSize: () => boolean
  cleanupQueue: () => Promise<void>
  reconnect: () => Promise<void>
  updateQueueEntry: (entryId: string, updates: Partial<QueueEntryWithError>) => Promise<void>
  setQueueEntriesForTesting?: (entries: QueueEntry[]) => void
}
