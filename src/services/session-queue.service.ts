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
  Enums
} from '@/types/database-generated';

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
  async getSessionQueue(sessionId: string): Promise<{
    entries: SessionQueueEntry[];
    error?: string;
  }> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true });

      if (error) {
        return { entries: [], error: error.message };
      }

      return { entries: data || [] };
    } catch (error) {
      return { 
        entries: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch queue entries' 
      };
    }
  },

  /**
   * Add a player to the session queue
   */
  async addToQueue(
    sessionId: string, 
    playerData: PlayerQueueData
  ): Promise<{
    entry: SessionQueueEntry | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { entry: null, error: 'User not authenticated' };
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
        return { entry: null, error: 'User already in queue for this session' };
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
        return { entry: null, error: error.message };
      }

      return { entry: data as SessionQueueEntry };
    } catch (error) {
      return { 
        entry: null, 
        error: error instanceof Error ? error.message : 'Failed to add to queue' 
      };
    }
  },

  /**
   * Update a queue entry
   */
  async updateQueueEntry(
    entryId: string, 
    updates: SessionQueueEntryUpdate
  ): Promise<{
    entry: SessionQueueEntry | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        return { entry: null, error: error.message };
      }

      return { entry: data as SessionQueueEntry };
    } catch (error) {
      return { 
        entry: null, 
        error: error instanceof Error ? error.message : 'Failed to update queue entry' 
      };
    }
  },

  /**
   * Remove a player from the queue
   */
  async removeFromQueue(entryId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('id', entryId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove from queue' 
      };
    }
  },

  /**
   * Accept a player from queue into the session
   */
  async acceptPlayer(
    entryId: string,
    sessionId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get the queue entry
      const { data: queueEntry, error: entryError } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('id', entryId)
        .single();

      if (entryError || !queueEntry) {
        return { success: false, error: 'Queue entry not found' };
      }

      // Check if session has space
      const { count: playerCount, error: countError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (countError) {
        return { success: false, error: 'Failed to check session capacity' };
      }

      if ((playerCount || 0) >= 12) { // MAX_PLAYERS constant
        return { success: false, error: 'Session is full' };
      }

      // Check if color is available
      const { data: colorCheck, error: colorError } = await supabase
        .from('bingo_session_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('color', queueEntry.color)
        .single();

      if (colorError && colorError.code !== 'PGRST116') {
        return { success: false, error: 'Failed to check color availability' };
      }

      if (colorCheck) {
        return { success: false, error: 'Color already taken' };
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
        return { success: false, error: playerError.message };
      }

      // Update queue entry to matched
      const { error: updateError } = await supabase
        .from('bingo_session_queue')
        .update({
          status: 'matched' as QueueStatus,
          processed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept player' 
      };
    }
  },

  /**
   * Reject a player from the queue
   */
  async rejectPlayer(entryId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await this.updateQueueEntry(entryId, {
        status: 'cancelled' as QueueStatus,
        processed_at: new Date().toISOString(),
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject player' 
      };
    }
  },

  /**
   * Cleanup expired queue entries
   */
  async cleanupExpiredEntries(sessionId: string): Promise<{
    success: boolean;
    removedCount: number;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

      const { data, error } = await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('session_id', sessionId)
        .lt('requested_at', cutoffTime.toISOString())
        .in('status', ['matched', 'cancelled'] as QueueStatus[])
        .select();

      if (error) {
        return { success: false, removedCount: 0, error: error.message };
      }

      return { success: true, removedCount: data?.length || 0 };
    } catch (error) {
      return { 
        success: false, 
        removedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to cleanup queue' 
      };
    }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(sessionId: string): Promise<{
    stats: QueueStats;
    error?: string;
  }> {
    try {
      const { entries, error } = await this.getSessionQueue(sessionId);
      
      if (error) {
        return {
          stats: {
            totalEntries: 0,
            waitingEntries: 0,
            processingEntries: 0,
            matchedEntries: 0,
            cancelledEntries: 0,
            averageProcessingTime: 0,
            queueWaitTime: 0,
          },
          error
        };
      }

      const stats: QueueStats = {
        totalEntries: entries.length,
        waitingEntries: entries.filter(e => e.status === 'waiting').length,
        processingEntries: 0, // No separate processing status
        matchedEntries: entries.filter(e => e.status === 'matched').length,
        cancelledEntries: entries.filter(e => e.status === 'cancelled').length,
        averageProcessingTime: 0, // TODO: Calculate based on processed_at - requested_at
        queueWaitTime: 0, // TODO: Calculate based on oldest waiting entry
      };

      return { stats };
    } catch (error) {
      return {
        stats: {
          totalEntries: 0,
          waitingEntries: 0,
          processingEntries: 0,
          matchedEntries: 0,
          cancelledEntries: 0,
          averageProcessingTime: 0,
          queueWaitTime: 0,
        },
        error: error instanceof Error ? error.message : 'Failed to get queue stats'
      };
    }
  },

  /**
   * Get player position in queue
   */
  async getPlayerPosition(
    userId: string, 
    sessionId: string
  ): Promise<{
    position: number;
    error?: string;
  }> {
    try {
      const { entries, error } = await this.getSessionQueue(sessionId);
      
      if (error) {
        return { position: -1, error };
      }

      const waitingEntries = entries
        .filter(e => e.status === 'waiting')
        .sort((a, b) => {
          const dateA = a.requested_at ? new Date(a.requested_at).getTime() : 0;
          const dateB = b.requested_at ? new Date(b.requested_at).getTime() : 0;
          return dateA - dateB;
        });

      const position = waitingEntries.findIndex(e => e.user_id === userId);
      
      return { position: position >= 0 ? position + 1 : -1 };
    } catch (error) {
      return { 
        position: -1, 
        error: error instanceof Error ? error.message : 'Failed to get player position' 
      };
    }
  },

  /**
   * Check if player is in queue
   */
  async isPlayerInQueue(
    userId: string, 
    sessionId: string
  ): Promise<{
    inQueue: boolean;
    entry?: SessionQueueEntry;
    error?: string;
  }> {
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
        return { inQueue: false, error: error.message };
      }

      return { inQueue: !!data, entry: data as SessionQueueEntry || undefined };
    } catch (error) {
      return { 
        inQueue: false, 
        error: error instanceof Error ? error.message : 'Failed to check queue status' 
      };
    }
  },
};