export const QUEUE_CONSTANTS = {
  LIMITS: {
    MAX_QUEUE_SIZE: 8,
    MAX_WAIT_TIME: 300000, // 5 minutes in ms
    CLEANUP_INTERVAL: 60000 // 1 minute in ms
  },

  STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  EVENTS: {
    QUEUE_JOIN: 'queueJoin',
    QUEUE_LEAVE: 'queueLeave',
    QUEUE_UPDATE: 'queueUpdate',
    QUEUE_ERROR: 'queueError'
  },

  ERRORS: {
    QUEUE_FULL: 'Queue is full',
    INVALID_POSITION: 'Invalid queue position',
    DUPLICATE_ENTRY: 'Player already in queue',
    SESSION_FULL: 'Session is full'
  }
} as const
