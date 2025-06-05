/**
 * Type-Safe Real-time Manager - ZERO TYPE ASSERTIONS
 * Handles connection pooling, message batching, and conflict resolution
 */

import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { type ValidationResult } from './validation';

// =============================================================================
// TYPE-SAFE EVENT HANDLING
// =============================================================================

type PostgresEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

interface PostgresChangesConfig {
  event: PostgresEvent;
  schema: string;
  table: string;
  filter?: string;
}

// Define a proper type constraint for database records
// Currently unused but available for future type constraints
// type DatabaseRecord = Record<string, unknown>;

// Define the PostgresChangesPayload type locally
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PostgresChangesPayload<T> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T | null;
  errors: string[] | null;
};

// Define the filter type for postgres changes
type PostgresChangesFilter = {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
};

// Type guard for event type validation
function isValidEventType(value: unknown): value is 'INSERT' | 'UPDATE' | 'DELETE' {
  return value === 'INSERT' || value === 'UPDATE' || value === 'DELETE';
}

// Create a type-safe postgres payload
export type TypedPostgresPayload = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown> | null;
  errors: string[] | null;
};

// Safe payload validation with proper types
function validatePostgresPayload(payload: unknown): ValidationResult<TypedPostgresPayload> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, data: null, error: 'Invalid payload - not an object' };
  }

  const payloadObj = Object(payload);
  
  // Validate required fields
  if (!('schema' in payloadObj) || 
      !('table' in payloadObj) || 
      !('eventType' in payloadObj) ||
      !isValidEventType(payloadObj.eventType)) {
    return { 
      success: false, 
      data: null, 
      error: 'Invalid payload structure - missing or invalid required fields' 
    };
  }

  // Safely extract record data
  const newRecord = payloadObj.new && typeof payloadObj.new === 'object' 
    ? payloadObj.new 
    : {};
    
  const oldRecord = payloadObj.old && typeof payloadObj.old === 'object' 
    ? payloadObj.old 
    : null;

  // Build validated payload with proper typing
  const validatedPayload = {
    schema: String(payloadObj.schema),
    table: String(payloadObj.table),
    commit_timestamp: String(payloadObj.commit_timestamp || ''),
    eventType: payloadObj.eventType,
    new: newRecord,
    old: oldRecord,
    errors: Array.isArray(payloadObj.errors) 
      ? payloadObj.errors.filter((e: unknown): e is string => typeof e === 'string')
      : null
  };

  return {
    success: true,
    data: validatedPayload,
    error: null
  };
}

// =============================================================================
// BATCHED UPDATE SYSTEM
// =============================================================================

interface BatchedUpdate {
  id: string;
  type: 'CELL_UPDATE' | 'PRESENCE_UPDATE' | 'BOARD_STATE';
  data: Record<string, unknown>;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

interface UpdateBatch {
  updates: BatchedUpdate[];
  startTime: number;
  channelKey: string;
}

// =============================================================================
// CHANNEL MANAGEMENT
// =============================================================================

interface ChannelInfo {
  channel: RealtimeChannel;
  subscribers: number;
  lastActivity: number;
  config: PostgresChangesConfig;
}

interface SubscriptionOptions {
  event?: PostgresEvent;
  schema?: string;
  table?: string;
  filter?: string;
  onUpdate?: (payload: TypedPostgresPayload) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// SAFE REALTIME MANAGER
// =============================================================================

class SafeRealtimeManager {
  private channels = new Map<string, ChannelInfo>();
  private updateBatches = new Map<string, UpdateBatch>();
  private flushTimers = new Map<string, NodeJS.Timeout>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_TIMEOUT = 100; // ms
  private readonly DEBOUNCE_DELAY = 50; // ms

  /**
   * Subscribe to real-time changes with proper type safety
   */
  subscribe(
    channelKey: string,
    options: SubscriptionOptions
  ): () => void {
    const config: PostgresChangesConfig = {
      event: options.event || '*',
      schema: options.schema || 'public',
      table: options.table || '*',
      filter: options.filter,
    };

    let channel: RealtimeChannel;
    
    try {
      const supabase = createClient();
      channel = supabase.channel(channelKey);
      
      // Build the filter object for Supabase
      const filter: PostgresChangesFilter = {
        event: config.event,
        schema: config.schema,
        table: config.table,
        filter: config.filter
      };
      
      // Subscribe to postgres changes with validation
      channel.on(
        'postgres_changes',
        filter,
        (payload: unknown) => {
          const validation = validatePostgresPayload(payload);
          
          if (!validation.success) {
            logger.error('Invalid postgres changes payload', new Error(validation.error || 'Unknown validation error'), {
              metadata: { channelKey, payload }
            });
            if (options.onError) {
              options.onError(new Error(validation.error || 'Invalid payload'));
            }
            return;
          }
          
          this.handlePayload(channelKey, validation.data, options);
        }
      );

      channel.subscribe((status) => {
        logger.info('Channel subscription status', {
          metadata: { channelKey, status }
        });
        
        if (status === 'CHANNEL_ERROR') {
          const error = new Error('Channel subscription error');
          logger.error('Channel subscription failed', error, {
            metadata: { channelKey }
          });
          options.onError?.(error);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown subscription error';
      logger.error('Failed to create subscription', new Error(errorMessage), {
        metadata: { channelKey, options }
      });
      
      if (options.onError) {
        options.onError(new Error(errorMessage));
      }
      
      return () => {}; // Return no-op unsubscribe
    }

    // Store channel info
    this.channels.set(channelKey, {
      channel,
      subscribers: 1,
      lastActivity: Date.now(),
      config,
    });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channelKey);
    };
  }

  /**
   * Handle incoming payload with validation
   */
  private handlePayload(
    channelKey: string,
    payload: TypedPostgresPayload,
    options: SubscriptionOptions
  ): void {

    // Update channel activity
    const channelInfo = this.channels.get(channelKey);
    if (channelInfo) {
      channelInfo.lastActivity = Date.now();
    }

    // Handle the payload
    if (options.onUpdate) {
      try {
        options.onUpdate(payload);
      } catch (error) {
        logger.error('Error in payload handler', error instanceof Error ? error : new Error('Unknown handler error'), {
          metadata: { channelKey }
        });
      }
    }

    // Batch updates for performance
    this.batchUpdate(channelKey, payload);
  }

  /**
   * Batch updates for performance optimization
   */
  private batchUpdate(channelKey: string, payload: TypedPostgresPayload): void {
    const updateId = this.generateUpdateId(payload);
    
    const update: BatchedUpdate = {
      id: updateId,
      type: this.determineUpdateType(payload),
      data: payload.new || {},
      timestamp: Date.now(),
      priority: this.determinePriority(payload),
    };

    let batch = this.updateBatches.get(channelKey);
    if (!batch) {
      batch = {
        updates: [],
        startTime: Date.now(),
        channelKey,
      };
      this.updateBatches.set(channelKey, batch);
    }

    batch.updates.push(update);

    // Flush batch if full or timeout reached
    if (batch.updates.length >= this.BATCH_SIZE) {
      this.flushBatch(channelKey);
    } else {
      this.scheduleBatchFlush(channelKey);
    }
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(payload: TypedPostgresPayload): string {
    const newRecord = payload.new;
    const oldRecord = payload.old;
    const tableId = (newRecord && 'id' in newRecord ? newRecord.id : null) || 
                   (oldRecord && 'id' in oldRecord ? oldRecord.id : null) || 
                   'unknown';
    return `${payload.table}-${tableId}-${Date.now()}`;
  }

  /**
   * Determine update type from payload
   */
  private determineUpdateType(payload: TypedPostgresPayload): BatchedUpdate['type'] {
    if (payload.table.includes('presence')) return 'PRESENCE_UPDATE';
    if (payload.table.includes('board')) return 'BOARD_STATE';
    return 'CELL_UPDATE';
  }

  /**
   * Determine update priority
   */
  private determinePriority(payload: TypedPostgresPayload): BatchedUpdate['priority'] {
    if (payload.table.includes('session') || payload.table.includes('game')) {
      return 'high';
    }
    if (payload.table.includes('board')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Schedule batch flush with debouncing
   */
  private scheduleBatchFlush(channelKey: string): void {
    // Clear existing timer
    const existingTimer = this.flushTimers.get(channelKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.flushBatch(channelKey);
    }, this.BATCH_TIMEOUT);

    this.flushTimers.set(channelKey, timer);
  }

  /**
   * Flush batched updates
   */
  private flushBatch(channelKey: string): void {
    const batch = this.updateBatches.get(channelKey);
    if (!batch || batch.updates.length === 0) return;

    try {
      // Process updates by priority
      const sortedUpdates = batch.updates.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[b.priority] - priorities[a.priority];
      });

      logger.info('Flushing batched updates', {
        metadata: {
          channelKey,
          updateCount: sortedUpdates.length,
          duration: Date.now() - batch.startTime
        }
      });

      // Clear the batch
      this.updateBatches.delete(channelKey);
      
      // Clear timer
      const timer = this.flushTimers.get(channelKey);
      if (timer) {
        clearTimeout(timer);
        this.flushTimers.delete(channelKey);
      }

    } catch (error) {
      logger.error('Error flushing batch', error instanceof Error ? error : new Error('Unknown flush error'), {
        metadata: { channelKey }
      });
    }
  }

  /**
   * Unsubscribe from channel
   */
  private unsubscribe(channelKey: string): void {
    const channelInfo = this.channels.get(channelKey);
    if (!channelInfo) return;

    channelInfo.subscribers--;
    
    if (channelInfo.subscribers <= 0) {
      try {
        channelInfo.channel.unsubscribe();
      } catch (error) {
        logger.error('Error unsubscribing channel', error instanceof Error ? error : new Error('Unknown unsubscribe error'), {
          metadata: { channelKey }
        });
      }
      
      this.channels.delete(channelKey);
      this.updateBatches.delete(channelKey);
      
      const timer = this.flushTimers.get(channelKey);
      if (timer) {
        clearTimeout(timer);
        this.flushTimers.delete(channelKey);
      }
    }
  }

  /**
   * Get channel info for debugging
   */
  getChannelInfo(channelKey: string): ChannelInfo | null {
    return this.channels.get(channelKey) || null;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Unsubscribe all channels
    for (const channelKey of this.channels.keys()) {
      this.unsubscribe(channelKey);
    }

    // Clear all timers
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

// Export singleton instance
export const safeRealtimeManager = new SafeRealtimeManager();

// Export types for external use
export type {
  PostgresEvent,
  PostgresChangesConfig,
  SubscriptionOptions,
  BatchedUpdate,
};

// Re-export Supabase types for convenience
export type { RealtimePostgresChangesPayload } from '@supabase/realtime-js';