/**
 * Session Queue Service
 *
 * Service layer for managing player queue in specific bingo sessions.
 * Uses bingo_session_queue table for session-specific player management.
 */

import { createClient } from '@/lib/supabase';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/types/database-generated';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { log } from '@/lib/logger';

export type SessionQueueEntry = Tables<'bingo_session_queue'>;
export type SessionQueueEntryInsert = TablesInsert<'bingo_session_queue'>;
export type SessionQueueEntryUpdate = TablesUpdate<'bingo_session_queue'>;
export type QueueStatus = Enums<'queue_status'>;

export interface PlayerQueueData {
  playerName: string;
  color: string;
  team?: number;
}

export interface QueueStats {
  totalEntries: number;
  waitingEntries: number;
  processingEntries: number;
  matchedEntries: number;
  cancelledEntries: number;
  averageProcessingTime: number;
  queueWaitTime: number;
}

export const sessionQueueService = {
  /**
   * Get all queue entries for a session
   */
  async getSessionQueue(
    sessionId: string
  ): Promise<ServiceResponse<SessionQueueEntry[]>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true });

      if (error) {
        log.error('Failed to fetch queue entries', error, {
          metadata: {
            service: 'session-queue',
            method: 'getSessionQueue',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data || []);
    } catch (error) {
      log.error(
        'Unexpected error fetching queue entries',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'getSessionQueue',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Add a player to the session queue
   */
  async addToQueue(
    sessionId: string,
    playerData: PlayerQueueData
  ): Promise<ServiceResponse<SessionQueueEntry>> {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return createServiceError('User not authenticated');
      }

      // Check if user is already in queue for this session
      const { data: existingEntry } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .single();

      if (existingEntry) {
        return createServiceError('User already in queue for this session');
      }

      const queueEntry: SessionQueueEntryInsert = {
        session_id: sessionId,
        user_id: user.id,
        player_name: playerData.playerName,
        color: playerData.color,
        team: playerData.team ?? null,
        status: 'waiting',
        requested_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .insert(queueEntry)
        .select()
        .single();

      if (error) {
        log.error('Failed to add to queue', error, {
          metadata: {
            service: 'session-queue',
            method: 'addToQueue',
            sessionId,
            userId: user.id,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Unexpected error adding to queue',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'addToQueue',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update a queue entry
   */
  async updateQueueEntry(
    entryId: string,
    updates: SessionQueueEntryUpdate
  ): Promise<ServiceResponse<SessionQueueEntry>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update queue entry', error, {
          metadata: {
            service: 'session-queue',
            method: 'updateQueueEntry',
            entryId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Unexpected error updating queue entry',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'updateQueueEntry',
            entryId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Remove a player from the queue
   */
  async removeFromQueue(entryId: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('id', entryId);

      if (error) {
        log.error('Failed to remove from queue', error, {
          metadata: {
            service: 'session-queue',
            method: 'removeFromQueue',
            entryId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error removing from queue',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'removeFromQueue',
            entryId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Accept a player from queue into the session
   */
  async acceptPlayer(
    entryId: string,
    sessionId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();

      // Get the queue entry
      const { data: queueEntry, error: entryError } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('id', entryId)
        .single();

      if (entryError || !queueEntry) {
        return createServiceError('Queue entry not found');
      }

      // Check if session has space
      const { count: playerCount, error: countError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (countError) {
        log.error('Failed to check session capacity', countError, {
          metadata: {
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId,
          },
        });
        return createServiceError('Failed to check session capacity');
      }

      if ((playerCount || 0) >= 12) {
        // MAX_PLAYERS constant
        return createServiceError('Session is full');
      }

      // Check if color is available
      const { data: colorCheck, error: colorError } = await supabase
        .from('bingo_session_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('color', queueEntry.color)
        .single();

      if (colorError && colorError.code !== 'PGRST116') {
        log.error('Failed to check color availability', colorError, {
          metadata: {
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId,
          },
        });
        return createServiceError('Failed to check color availability');
      }

      if (colorCheck) {
        return createServiceError('Color already taken');
      }

      // Add player to session
      const { error: playerError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: sessionId,
          user_id: queueEntry.user_id || '',
          display_name: queueEntry.player_name,
          color: queueEntry.color,
          team: queueEntry.team,
          joined_at: new Date().toISOString(),
        });

      if (playerError) {
        log.error('Failed to add player to session', playerError, {
          metadata: {
            service: 'session-queue',
            method: 'acceptPlayer',
            sessionId,
            userId: queueEntry.user_id,
          },
        });
        return createServiceError(playerError.message);
      }

      // Update queue entry to matched
      const { error: updateError } = await supabase
        .from('bingo_session_queue')
        .update({
          status: 'matched',
          processed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (updateError) {
        log.error('Failed to update queue entry status', updateError, {
          metadata: {
            service: 'session-queue',
            method: 'acceptPlayer',
            entryId,
          },
        });
        return createServiceError(updateError.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error accepting player',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'acceptPlayer',
            entryId,
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Reject a player from the queue
   */
  async rejectPlayer(entryId: string): Promise<ServiceResponse<void>> {
    try {
      const result = await this.updateQueueEntry(entryId, {
        status: 'cancelled',
        processed_at: new Date().toISOString(),
      });

      if (result.error) {
        return createServiceError(result.error);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error rejecting player',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'rejectPlayer',
            entryId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Cleanup expired queue entries
   */
  async cleanupExpiredEntries(
    sessionId: string
  ): Promise<ServiceResponse<number>> {
    try {
      const supabase = createClient();

      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('session_id', sessionId)
        .lt('requested_at', cutoffTime.toISOString())
        .in('status', ['matched', 'cancelled'])
        .select();

      if (error) {
        log.error('Failed to cleanup queue', error, {
          metadata: {
            service: 'session-queue',
            method: 'cleanupExpiredEntries',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data?.length || 0);
    } catch (error) {
      log.error(
        'Unexpected error cleaning up queue',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'cleanupExpiredEntries',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(sessionId: string): Promise<ServiceResponse<QueueStats>> {
    try {
      const entriesResult = await this.getSessionQueue(sessionId);

      if (entriesResult.error) {
        return createServiceError(entriesResult.error);
      }

      const entries = entriesResult.data || [];

      const stats: QueueStats = {
        totalEntries: entries.length,
        waitingEntries: entries.filter(e => e.status === 'waiting').length,
        processingEntries: 0, // No separate processing status
        matchedEntries: entries.filter(e => e.status === 'matched').length,
        cancelledEntries: entries.filter(e => e.status === 'cancelled').length,
        averageProcessingTime: 0, // TODO: Calculate based on processed_at - requested_at
        queueWaitTime: 0, // TODO: Calculate based on oldest waiting entry
      };

      return createServiceSuccess(stats);
    } catch (error) {
      log.error(
        'Unexpected error getting queue stats',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'getQueueStats',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get player position in queue
   */
  async getPlayerPosition(
    userId: string,
    sessionId: string
  ): Promise<ServiceResponse<number>> {
    try {
      const entriesResult = await this.getSessionQueue(sessionId);

      if (entriesResult.error) {
        return createServiceError(entriesResult.error);
      }

      const entries = entriesResult.data || [];

      const waitingEntries = entries
        .filter(e => e.status === 'waiting')
        .sort((a, b) => {
          const dateA = a.requested_at ? new Date(a.requested_at).getTime() : 0;
          const dateB = b.requested_at ? new Date(b.requested_at).getTime() : 0;
          return dateA - dateB;
        });

      const position = waitingEntries.findIndex(e => e.user_id === userId);

      return createServiceSuccess(position >= 0 ? position + 1 : -1);
    } catch (error) {
      log.error(
        'Unexpected error getting player position',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'getPlayerPosition',
            userId,
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Check if player is in queue
   */
  async isPlayerInQueue(
    userId: string,
    sessionId: string
  ): Promise<ServiceResponse<{ inQueue: boolean; entry?: SessionQueueEntry }>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (error && error.code !== 'PGRST116') {
        log.error('Failed to check queue status', error, {
          metadata: {
            service: 'session-queue',
            method: 'isPlayerInQueue',
            userId,
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess({
        inQueue: !!data,
        entry: data || undefined,
      });
    } catch (error) {
      log.error(
        'Unexpected error checking queue status',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'session-queue',
            method: 'isPlayerInQueue',
            userId,
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
