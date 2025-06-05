/**
 * Queue Service
 *
 * Manages bingo game queue system using bingo_queue_entries table.
 * Handles player matchmaking and queue processing.
 */

import { createClient } from '@/lib/supabase';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/database-generated';

export type QueueEntry = Tables<'bingo_queue_entries'>;
export type QueueEntryInsert = TablesInsert<'bingo_queue_entries'>;
export type QueueEntryUpdate = TablesUpdate<'bingo_queue_entries'>;

export interface QueuePreferences {
  preferredGameTypes?: string[];
  preferredDifficulties?: string[];
  maxPlayers?: number;
  allowSpectators?: boolean;
}

export interface JoinQueueData {
  user_id: string;
  board_id?: string;
  preferences?: QueuePreferences;
}

export interface MatchResult {
  session_id: string;
  matched_players: string[];
  board_id: string;
}

export const queueService = {
  /**
   * Join the matchmaking queue
   */
  async joinQueue(
    data: JoinQueueData
  ): Promise<{ entry: QueueEntry | null; error?: string }> {
    const supabase = createClient();

    try {
      // Check if user is already in queue
      const { data: existingEntry } = await supabase
        .from('bingo_queue_entries')
        .select('*')
        .eq('user_id', data.user_id)
        .eq('status', 'waiting')
        .single();

      if (existingEntry) {
        return { entry: existingEntry, error: 'User already in queue' };
      }

      // Create new queue entry
      const { data: newEntry, error } = await supabase
        .from('bingo_queue_entries')
        .insert([
          {
            user_id: data.user_id,
            board_id: data.board_id || null,
            preferences: data.preferences
              ? JSON.stringify(data.preferences)
              : null,
            status: 'waiting',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { entry: newEntry };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to join queue';
      return { entry: null, error: message };
    }
  },

  /**
   * Leave the queue
   */
  async leaveQueue(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('bingo_queue_entries')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'waiting');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave queue';
      return { success: false, error: message };
    }
  },

  /**
   * Get current queue status for a user
   */
  async getQueueStatus(
    userId: string
  ): Promise<{ entry: QueueEntry | null; error?: string }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('bingo_queue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw error;
      }

      return { entry: data };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get queue status';
      return { entry: null, error: message };
    }
  },

  /**
   * Get all waiting queue entries (for matchmaking)
   */
  async getWaitingEntries(): Promise<{
    entries: QueueEntry[];
    error?: string;
  }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('bingo_queue_entries')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { entries: data || [] };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get waiting entries';
      return { entries: [], error: message };
    }
  },

  /**
   * Mark queue entries as matched
   */
  async markAsMatched(
    userIds: string[],
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('bingo_queue_entries')
        .update({
          status: 'matched',
          matched_session_id: sessionId,
          matched_at: new Date().toISOString(),
        })
        .in('user_id', userIds)
        .eq('status', 'waiting');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to mark as matched';
      return { success: false, error: message };
    }
  },

  /**
   * Clean up expired queue entries (older than 10 minutes)
   */
  async cleanupExpiredEntries(): Promise<{ cleaned: number; error?: string }> {
    const supabase = createClient();

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('bingo_queue_entries')
        .delete()
        .eq('status', 'waiting')
        .lt('created_at', tenMinutesAgo)
        .select();

      if (error) throw error;

      return { cleaned: data?.length || 0 };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cleanup expired entries';
      return { cleaned: 0, error: message };
    }
  },

  /**
   * Simple matchmaking algorithm
   * Matches players based on preferences and board compatibility
   */
  async findMatches(
    maxMatches = 5
  ): Promise<{ matches: MatchResult[]; error?: string }> {
    const supabase = createClient();

    try {
      // Get all waiting entries
      const { entries, error: entriesError } = await this.getWaitingEntries();
      if (entriesError) throw new Error(entriesError);

      const matches: MatchResult[] = [];
      const processedUsers = new Set<string>();

      // Simple matchmaking: group by board_id if specified
      const boardGroups = new Map<string, QueueEntry[]>();
      const generalQueue: QueueEntry[] = [];

      for (const entry of entries) {
        if (processedUsers.has(entry.user_id || '')) continue;

        if (entry.board_id) {
          if (!boardGroups.has(entry.board_id)) {
            boardGroups.set(entry.board_id, []);
          }
          boardGroups.get(entry.board_id)?.push(entry);
        } else {
          generalQueue.push(entry);
        }
      }

      // Match players with specific board preferences
      for (const [boardId, groupEntries] of boardGroups) {
        if (groupEntries.length >= 2 && matches.length < maxMatches) {
          // Create session for this board
          const { data: session, error: sessionError } = await supabase
            .from('bingo_sessions')
            .insert([
              {
                board_id: boardId,
                host_id: groupEntries[0]?.user_id || '',
                status: 'waiting',
                settings: {
                  max_players: 4,
                  auto_start: false,
                  allow_spectators: true,
                  require_approval: false,
                  time_limit: null,
                  password: null,
                },
              },
            ])
            .select()
            .single();

          if (sessionError) continue;

          // Take up to 4 players
          const matchedPlayers = groupEntries.slice(0, 4);
          const playerIds = matchedPlayers
            .map(e => e.user_id)
            .filter((id): id is string => Boolean(id));

          // Mark as matched
          await this.markAsMatched(playerIds, session.id);

          matches.push({
            session_id: session.id,
            matched_players: playerIds,
            board_id: boardId,
          });

          playerIds.forEach(id => processedUsers.add(id));
        }
      }

      // Match remaining players from general queue
      if (generalQueue.length >= 2 && matches.length < maxMatches) {
        // Get a random public board for general matchmaking
        const { data: publicBoards } = await supabase
          .from('public_boards')
          .select('id')
          .eq('is_public', true)
          .limit(1);

        if (publicBoards && publicBoards.length > 0) {
          const boardId = publicBoards[0]?.id;

          // Create session
          const { data: session, error: sessionError } = await supabase
            .from('bingo_sessions')
            .insert([
              {
                board_id: boardId,
                host_id: generalQueue[0]?.user_id || '',
                status: 'waiting',
                settings: {
                  max_players: 4,
                  auto_start: false,
                  allow_spectators: true,
                  require_approval: false,
                  time_limit: null,
                  password: null,
                },
              },
            ])
            .select()
            .single();

          if (!sessionError) {
            const matchedPlayers = generalQueue.slice(0, 4);
            const playerIds = matchedPlayers
              .map(e => e.user_id)
              .filter((id): id is string => Boolean(id));

            await this.markAsMatched(playerIds, session.id);

            matches.push({
              session_id: session.id,
              matched_players: playerIds,
              board_id: boardId || '',
            });
          }
        }
      }

      return { matches };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to find matches';
      return { matches: [], error: message };
    }
  },
};
