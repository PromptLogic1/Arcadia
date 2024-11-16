export const PRESENCE_CONSTANTS = {
  HEARTBEAT_INTERVAL: 30000,
  CHANNEL_PREFIX: 'presence:',
  STATUS: {
    ONLINE: 'online',
    AWAY: 'away',
    OFFLINE: 'offline'
  } as const
} as const 