import type { Page, WebSocketRoute } from '@playwright/test';
import type { Tables } from '@/types/database.types';

/**
 * Type-safe WebSocket event definitions
 */
export type GameWebSocketEvent = 
  | { type: 'session_created'; session: Tables<'bingo_sessions'> }
  | { type: 'session_updated'; sessionId: string; updates: Partial<Tables<'bingo_sessions'>> }
  | { type: 'player_joined'; sessionId: string; player: Tables<'bingo_session_players'> }
  | { type: 'player_left'; sessionId: string; playerId: string }
  | { type: 'player_ready'; sessionId: string; playerId: string; ready: boolean }
  | { type: 'game_started'; sessionId: string; startTime: string }
  | { type: 'cell_marked'; sessionId: string; position: number; playerId: string; color: string }
  | { type: 'cell_unmarked'; sessionId: string; position: number; playerId: string }
  | { type: 'game_completed'; sessionId: string; winnerId: string; pattern: string; duration: number }
  | { type: 'achievement_unlocked'; achievement: { id: string; title: string; points: number; icon: string } }
  | { type: 'achievement_progress'; achievementId: string; progress: number; maxProgress: number }
  | { type: 'speedrun_completed'; time: number; rank: number; boardId: string }
  | { type: 'timer_sync'; serverTime: number; clientTime: number }
  | { type: 'connection_status'; status: 'connected' | 'disconnected' | 'reconnecting' }
  | { type: 'error'; code: string; message: string };

/**
 * Mock WebSocket connection for testing
 */
class MockWebSocketConnection {
  public readonly id: string;
  private eventHandlers = new Map<string, Array<(data: any) => void>>();
  private messageQueue: GameWebSocketEvent[] = [];
  private isConnected = true;

  constructor(private ws: WebSocketRoute) {
    this.id = Math.random().toString(36).substring(2, 11);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.ws.onMessage(message => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.onClose(() => {
      this.isConnected = false;
      this.broadcast({ type: 'connection_status', status: 'disconnected' });
    });
  }

  private handleMessage(data: any) {
    const handlers = this.eventHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data));
  }

  on(eventType: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  broadcast(event: GameWebSocketEvent) {
    if (!this.isConnected) {
      this.messageQueue.push(event);
      return;
    }

    this.ws.send(JSON.stringify(event));
  }

  async waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(eventType, handler);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timer);
        this.off(eventType, handler);
        resolve(data);
      };

      this.on(eventType, handler);
    });
  }

  disconnect() {
    this.isConnected = false;
    this.ws.close();
  }

  reconnect() {
    this.isConnected = true;
    this.broadcast({ type: 'connection_status', status: 'connected' });
    
    // Send queued messages
    while (this.messageQueue.length > 0) {
      const event = this.messageQueue.shift()!;
      this.broadcast(event);
    }
  }
}

/**
 * WebSocket test helper for managing connections and events
 */
export class WebSocketTestHelper {
  private connections = new Map<string, MockWebSocketConnection>();
  private globalHandlers = new Map<string, Array<(data: any) => void>>();

  /**
   * Set up WebSocket routes for testing
   */
  async setupRoutes(page: Page) {
    await page.routeWebSocket('**/ws', ws => {
      const connection = new MockWebSocketConnection(ws);
      
      // Extract session ID from connection or first message
      ws.onMessage(message => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe' && data.sessionId) {
            this.connections.set(data.sessionId, connection);
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    });
  }

  /**
   * Get connection for a specific session
   */
  getConnection(sessionId: string): MockWebSocketConnection | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Simulate a player joining a session
   */
  simulatePlayerJoin(sessionId: string, player: Tables<'bingo_session_players'>) {
    const event: GameWebSocketEvent = {
      type: 'player_joined',
      sessionId,
      player
    };
    
    this.broadcast(sessionId, event);
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate a player leaving a session
   */
  simulatePlayerLeave(sessionId: string, playerId: string) {
    const event: GameWebSocketEvent = {
      type: 'player_left',
      sessionId,
      playerId
    };
    
    this.broadcast(sessionId, event);
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate game start
   */
  simulateGameStart(sessionId: string) {
    const event: GameWebSocketEvent = {
      type: 'game_started',
      sessionId,
      startTime: new Date().toISOString()
    };
    
    this.broadcast(sessionId, event);
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate cell marking
   */
  simulateCellMark(sessionId: string, position: number, playerId: string, color: string) {
    const event: GameWebSocketEvent = {
      type: 'cell_marked',
      sessionId,
      position,
      playerId,
      color
    };
    
    this.broadcast(sessionId, event);
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate game completion
   */
  simulateGameComplete(sessionId: string, winnerId: string, pattern: string, duration: number) {
    const event: GameWebSocketEvent = {
      type: 'game_completed',
      sessionId,
      winnerId,
      pattern,
      duration
    };
    
    this.broadcast(sessionId, event);
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate achievement unlock
   */
  simulateAchievementUnlock(achievement: { id: string; title: string; points: number; icon: string }) {
    const event: GameWebSocketEvent = {
      type: 'achievement_unlocked',
      achievement
    };
    
    // Broadcast to all connections
    this.connections.forEach(conn => conn.broadcast(event));
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate achievement progress update
   */
  simulateAchievementProgress(achievementId: string, progress: number, maxProgress: number) {
    const event: GameWebSocketEvent = {
      type: 'achievement_progress',
      achievementId,
      progress,
      maxProgress
    };
    
    // Broadcast to all connections
    this.connections.forEach(conn => conn.broadcast(event));
    this.notifyGlobalHandlers(event);
  }

  /**
   * Simulate timer sync
   */
  simulateTimerSync(serverTime: number, clientTime: number) {
    const event: GameWebSocketEvent = {
      type: 'timer_sync',
      serverTime,
      clientTime
    };
    
    // Broadcast to all connections
    this.connections.forEach(conn => conn.broadcast(event));
  }

  /**
   * Broadcast event to specific session
   */
  private broadcast(sessionId: string, event: GameWebSocketEvent) {
    const conn = this.connections.get(sessionId);
    if (conn) {
      conn.broadcast(event);
    }
  }

  /**
   * Notify global event handlers
   */
  private notifyGlobalHandlers(event: GameWebSocketEvent) {
    const handlers = this.globalHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));
  }

  /**
   * Register global event handler
   */
  onGlobalEvent(eventType: string, handler: (data: any) => void) {
    if (!this.globalHandlers.has(eventType)) {
      this.globalHandlers.set(eventType, []);
    }
    this.globalHandlers.get(eventType)!.push(handler);
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(sessionId: string, eventType: string, timeout = 5000): Promise<any> {
    const conn = this.connections.get(sessionId);
    if (!conn) {
      throw new Error(`No connection found for session: ${sessionId}`);
    }
    
    return conn.waitForEvent(eventType, timeout);
  }

  /**
   * Simulate network issues
   */
  async simulateNetworkIssues(sessionId: string, duration: number = 2000) {
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    // Disconnect
    conn.disconnect();
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Reconnect
    conn.reconnect();
  }

  /**
   * Clean up connections
   */
  cleanup() {
    this.connections.forEach(conn => conn.disconnect());
    this.connections.clear();
    this.globalHandlers.clear();
  }
}

/**
 * Helper function to create WebSocket test context
 */
export async function createWebSocketContext(page: Page) {
  const helper = new WebSocketTestHelper();
  await helper.setupRoutes(page);
  
  return {
    helper,
    cleanup: () => helper.cleanup()
  };
}