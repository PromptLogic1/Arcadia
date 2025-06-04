/**
 * Optimized Real-time Manager for Gaming Performance
 * Handles connection pooling, message batching, and conflict resolution
 */

import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface BatchedUpdate {
  id: string;
  type: 'CELL_UPDATE' | 'PRESENCE_UPDATE' | 'BOARD_STATE';
  data: Record<string, unknown>;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

interface ChannelSubscription {
  callback: (payload: Record<string, unknown>) => void;
  filter?: string;
  event?: string;
}

interface RealtimeMetrics {
  messageLatency: number;
  connectionUptime: number;
  reconnectionCount: number;
  messagesSent: number;
  messagesReceived: number;
}

class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>();
  private subscriptions = new Map<string, Set<ChannelSubscription>>();
  private updateQueue: BatchedUpdate[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private metrics: RealtimeMetrics = {
    messageLatency: 0,
    connectionUptime: Date.now(),
    reconnectionCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };
  private supabase = createClient();

  private static instance: RealtimeManager;
  
  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  /**
   * Subscribe to real-time updates with automatic batching
   */
  subscribe(
    channelKey: string,
    callback: (payload: Record<string, unknown>) => void,
    options: {
      event?: string;
      filter?: string;
      table?: string;
      schema?: string;
    } = {}
  ): () => void {
    const channel = this.getOrCreateChannel(channelKey);
    const subscription: ChannelSubscription = {
      callback,
      filter: options.filter,
      event: options.event,
    };

    // Add subscription to tracking
    if (!this.subscriptions.has(channelKey)) {
      this.subscriptions.set(channelKey, new Set());
    }
    const subscriptionsSet = this.subscriptions.get(channelKey);
    if (subscriptionsSet) {
      subscriptionsSet.add(subscription);
    }

    // Set up the actual Supabase subscription
    if (options.table) {
      channel.on(
        'postgres_changes' as any,
        {
          event: (options.event as 'INSERT' | 'UPDATE' | 'DELETE' | '*') || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter,
        },
        (payload: Record<string, unknown>) => {
          this.metrics.messagesReceived++;
          this.handleBatchedUpdate(channelKey, payload, callback);
        }
      );
    } else if (options.event?.startsWith('presence:')) {
      // Presence subscription - subscribe to presence events
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence state
          const presenceState = channel.presenceState();
          this.metrics.messagesReceived++;
          callback({ event: 'sync', state: presenceState });
        }
      });
    } else {
      // Custom broadcast event subscription
      channel.on('broadcast', { event: options.event || 'custom' }, (payload: Record<string, unknown>) => {
        this.metrics.messagesReceived++;
        callback(payload);
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(channelKey)?.delete(subscription);
      if (this.subscriptions.get(channelKey)?.size === 0) {
        this.removeChannel(channelKey);
      }
    };
  }

  /**
   * Send optimized update with batching for non-critical updates
   */
  sendUpdate(
    channelKey: string,
    update: Omit<BatchedUpdate, 'id' | 'timestamp'>,
    immediate = false
  ): void {
    const batchedUpdate: BatchedUpdate = {
      ...update,
      id: `${channelKey}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    if (immediate || update.priority === 'high') {
      this.flushUpdate(channelKey, batchedUpdate);
    } else {
      this.updateQueue.push(batchedUpdate);
      this.scheduleBatchFlush();
    }
  }

  /**
   * Get or create a channel with automatic subscription management
   */
  private getOrCreateChannel(channelKey: string): RealtimeChannel {
    if (!this.channels.has(channelKey)) {
      const channel = this.supabase.channel(channelKey);
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeManager] Connected to channel: ${channelKey}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeManager] Error in channel: ${channelKey}`);
          this.metrics.reconnectionCount++;
        }
      });

      this.channels.set(channelKey, channel);
    }

    const channel = this.channels.get(channelKey);
    if (!channel) {
      throw new Error(`Channel ${channelKey} not found`);
    }
    return channel;
  }

  /**
   * Handle batched updates to reduce re-render frequency
   */
  private handleBatchedUpdate(
    channelKey: string,
    payload: Record<string, unknown>,
    callback: (payload: Record<string, unknown>) => void
  ): void {
    // For high-frequency updates, we can debounce them
    const updateKey = `${channelKey}-${payload.table}-${(payload.new as Record<string, unknown>)?.id || 'unknown'}`;
    
    // Simple debouncing - can be enhanced based on update type
    if (this.shouldBatchUpdate(payload)) {
      this.debounce(updateKey, () => callback(payload), 50);
    } else {
      callback(payload);
    }
  }

  /**
   * Determine if an update should be batched based on type and frequency
   */
  private shouldBatchUpdate(payload: Record<string, unknown>): boolean {
    // Batch cell updates but not game completion or critical state changes
    if (payload.table === 'bingo_sessions' && (payload.new as Record<string, unknown>)?.status === 'completed') {
      return false; // Never batch game completion
    }
    
    if (payload.eventType === 'UPDATE' && payload.table === 'bingo_sessions') {
      return true; // Batch board state updates
    }

    return false;
  }

  /**
   * Debounce utility for batching rapid updates
   */
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  private debounce(key: string, callback: () => void, delay: number): void {
    if (this.debounceTimers.has(key)) {
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
      }
    }

    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Schedule batch flush for non-critical updates
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.flushBatchedUpdates();
      this.batchTimeout = null;
    }, 100); // 100ms batch window
  }

  /**
   * Flush all batched updates
   */
  private flushBatchedUpdates(): void {
    if (this.updateQueue.length === 0) return;

    // Group updates by channel and type for optimization
    const groupedUpdates = this.groupUpdatesByChannel(this.updateQueue);
    
    for (const [channelKey, updates] of groupedUpdates) {
      this.sendBatchedUpdates(channelKey, updates);
    }

    this.updateQueue = [];
  }

  /**
   * Group updates by channel for efficient batching
   */
  private groupUpdatesByChannel(updates: BatchedUpdate[]): Map<string, BatchedUpdate[]> {
    const grouped = new Map<string, BatchedUpdate[]>();
    
    for (const update of updates) {
      // Extract channel key from update context (this is simplified)
      const channelKey = this.extractChannelKey(update);
      if (!grouped.has(channelKey)) {
        grouped.set(channelKey, []);
      }
      const updates = grouped.get(channelKey);
      if (updates) {
        updates.push(update);
      }
    }

    return grouped;
  }

  /**
   * Extract channel key from update (to be implemented based on update structure)
   */
  private extractChannelKey(_update: BatchedUpdate): string {
    // This is a simplified implementation
    // In practice, you'd determine the channel based on update.data
    return 'default';
  }

  /**
   * Send batched updates to a specific channel
   */
  private sendBatchedUpdates(channelKey: string, updates: BatchedUpdate[]): void {
    const channel = this.channels.get(channelKey);
    if (!channel) return;

    // Send compressed batch
    const batchPayload = {
      type: 'BATCH_UPDATE',
      updates: updates.map(u => ({
        type: u.type,
        data: u.data,
        timestamp: u.timestamp,
      })),
      batchSize: updates.length,
    };

    channel.send({
      type: 'broadcast',
      event: 'batch_update',
      payload: batchPayload,
    });

    this.metrics.messagesSent++;
  }

  /**
   * Flush a single update immediately
   */
  private flushUpdate(channelKey: string, updateData: BatchedUpdate): void {
    const channel = this.channels.get(channelKey);
    if (!channel) return;

    channel.send({
      type: 'broadcast',
      event: updateData.type.toLowerCase(),
      payload: updateData.data,
    });

    this.metrics.messagesSent++;
  }

  /**
   * Remove a channel and clean up subscriptions
   */
  private removeChannel(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelKey);
      this.subscriptions.delete(channelKey);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): RealtimeMetrics {
    return {
      ...this.metrics,
      connectionUptime: Date.now() - this.metrics.connectionUptime,
    };
  }

  /**
   * Cleanup all channels and timers
   */
  cleanup(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Remove all channels
    for (const [channelKey] of this.channels) {
      this.removeChannel(channelKey);
    }

    // Flush any remaining updates
    this.flushBatchedUpdates();
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance();

// Export types for consumers
export type { BatchedUpdate, RealtimeMetrics };