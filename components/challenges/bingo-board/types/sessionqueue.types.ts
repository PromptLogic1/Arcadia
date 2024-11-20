export interface QueueEntry {
  id: string
  session_id: string
  user_id: string
  player_name: string
  color: string
  team: number | null
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at: string | null
  created_at: string
  updated_at: string
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
  updateQueueEntry: (entryId: string, updates: Partial<QueueEntry>) => Promise<void>
  removeFromQueue: (entryId: string) => Promise<void>
  cleanupQueue: () => Promise<void>
  addToQueue: (player: { name: string; color: string; team?: number }) => Promise<void>
  processQueue: () => Promise<void>
  checkQueueStatus: () => Promise<boolean>
}
