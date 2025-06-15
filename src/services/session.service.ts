/**
 * Session Service
 *
 * Pure functions for session operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';
import { getErrorMessage } from '@/lib/error-guards';
import type { Tables } from '@/types/database.types';

// Use types directly from database-generated
type BingoSession = Tables<'bingo_sessions'>;
type BingoBoard = Tables<'bingo_boards'>;
type BingoSessionPlayer = Tables<'bingo_session_players'>;

export interface SessionWithDetails {
  id: string;
  board_title?: string | null;
  host_username?: string | null;
  status?: string | null;
}

export interface SessionFullDetails extends BingoSession {
  board: BingoBoard | null;
  players: BingoSessionPlayer[];
}

export const sessionService = {
  /**
   * Get session stats for metadata
   */
  async getSessionStats(
    sessionId: string
  ): Promise<ServiceResponse<SessionWithDetails | null>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('session_stats')
        .select(
          `
          id,
          board_title,
          host_username,
          status
        `
        )
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return createServiceSuccess(null);
        }
        log.error('Failed to get session stats', error, {
          metadata: { sessionId, errorCode: error.code },
        });
        return createServiceError(error.message);
      }

      // Ensure id is not null
      if (!data || !data.id) {
        return createServiceSuccess(null);
      }

      return createServiceSuccess({
        id: data.id,
        board_title: data.board_title,
        host_username: data.host_username,
        status: data.status,
      });
    } catch (error) {
      log.error('Unexpected error getting session stats', error, {
        metadata: { sessionId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get full session details with board and players
   */
  async getSessionWithDetails(
    sessionId: string
  ): Promise<ServiceResponse<SessionFullDetails | null>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          board:bingo_boards(*),
          players:bingo_session_players(*)
        `
        )
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return createServiceSuccess(null);
        }
        log.error('Failed to get session details', error, {
          metadata: { sessionId, errorCode: error.code },
        });
        return createServiceError(error.message);
      }

      // Transform the data to match our expected type
      const sessionData: SessionFullDetails = {
        ...data,
        board: data.board || null,
        players: data.players || [],
      };

      return createServiceSuccess(sessionData);
    } catch (error) {
      log.error('Unexpected error getting session details', error, {
        metadata: { sessionId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },
};
