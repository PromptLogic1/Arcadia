/**
 * Session Join Service
 *
 * Pure functions for session joining operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';
import { getErrorMessage } from '@/lib/error-guards';
import {
  bingoSessionSchema,
  bingoSessionPlayerSchema,
} from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformSessionSettings,
} from '@/lib/validation/transforms';

// Use types directly from database-generated (no duplicate exports)
type BingoSession = Tables<'bingo_sessions'>;
type BingoSessionPlayer = Tables<'bingo_session_players'>;

export interface SessionJoinDetails {
  session: BingoSession;
  currentPlayerCount: number;
  canJoin: boolean;
  reason?: string;
}

export interface SessionJoinData {
  sessionId: string;
  playerName: string;
  selectedColor: string;
  teamName?: string;
}

export interface UserSessionStatus {
  isInSession: boolean;
  player?: BingoSessionPlayer;
}

export interface AvailableColors {
  availableColors: string[];
  usedColors: string[];
}

export const sessionJoinService = {
  /**
   * Get session details for joining
   */
  async getSessionJoinDetails(
    sessionId: string
  ): Promise<ServiceResponse<SessionJoinDetails>> {
    try {
      const supabase = createClient();

      // Get session with board settings
      const { data: sessionData, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          bingo_boards!inner(
            settings,
            title,
            description,
            game_type,
            difficulty
          )
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        const errorMessage =
          sessionError.code === 'PGRST116'
            ? 'Session not found'
            : sessionError.message;
        log.error('Failed to get session details', sessionError, {
          metadata: { sessionId, errorCode: sessionError.code },
        });
        return createServiceError(errorMessage);
      }

      if (!sessionData) {
        log.error('Session data is null', new Error('Session not found'), {
          metadata: { sessionId },
        });
        return createServiceError('Session not found');
      }

      // Check if session is joinable
      if (sessionData.status !== 'waiting' && sessionData.status !== 'active') {
        log.warn('Session not joinable', {
          metadata: { sessionId, status: sessionData.status },
        });
        return createServiceError(
          `Session is ${sessionData.status}. Cannot join at this time.`
        );
      }

      // Get current player count
      const { count: playerCount, error: countError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (countError) {
        log.error('Failed to check player count', countError, {
          metadata: { sessionId },
        });
        return createServiceError('Failed to check player count');
      }

      // Validate session data
      const sessionValidation = bingoSessionSchema.safeParse(sessionData);
      if (!sessionValidation.success) {
        log.error('Session data validation failed', sessionValidation.error, {
          metadata: { sessionId },
        });
        return createServiceError('Invalid session data format');
      }

      const currentPlayerCount = playerCount || 0;
      const maxPlayers = sessionValidation.data.settings?.max_players || 4;
      const canJoin = currentPlayerCount < maxPlayers;

      // Transform the validated data to ensure proper null values
      const transformedSession: BingoSession = {
        ...sessionValidation.data,
        current_state: sessionValidation.data.current_state
          ? transformBoardState(sessionValidation.data.current_state)
          : null,
        settings: transformSessionSettings(sessionValidation.data.settings),
      };

      const details: SessionJoinDetails = {
        session: transformedSession,
        currentPlayerCount,
        canJoin,
        reason: canJoin ? undefined : 'Session is full',
      };

      return createServiceSuccess(details);
    } catch (error) {
      log.error('Unexpected error in getSessionJoinDetails', error, {
        metadata: { sessionId },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Join a session
   */
  async joinSession(
    data: SessionJoinData
  ): Promise<ServiceResponse<BingoSessionPlayer>> {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        log.error(
          'User authentication failed',
          userError || new Error('No user'),
          {
            metadata: { sessionId: data.sessionId },
          }
        );
        return createServiceError('Must be authenticated to join session');
      }

      // Check if user is already in the session
      const { data: existingPlayer } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', data.sessionId)
        .eq('user_id', user.id)
        .single();

      if (existingPlayer) {
        log.warn('User already in session', {
          metadata: { sessionId: data.sessionId, userId: user.id },
        });
        return createServiceError('You are already in this session');
      }

      // Verify session is still joinable
      const sessionDetailsResult = await this.getSessionJoinDetails(
        data.sessionId
      );
      if (!sessionDetailsResult.success || !sessionDetailsResult.data) {
        return createServiceError(
          sessionDetailsResult.error || 'Failed to verify session'
        );
      }

      const details = sessionDetailsResult.data;
      if (!details.canJoin) {
        log.warn('Session not joinable', {
          metadata: { sessionId: data.sessionId, reason: details.reason },
        });
        return createServiceError(details.reason || 'Cannot join session');
      }

      // Join the session
      const { data: newPlayer, error: joinError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: data.sessionId,
          user_id: user.id,
          display_name: data.playerName,
          color: data.selectedColor,
          team: data.teamName ? 1 : null, // Simple team assignment
          joined_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (joinError) {
        log.error('Failed to join session', joinError, {
          metadata: { sessionId: data.sessionId, userId: user.id },
        });
        return createServiceError(joinError.message);
      }

      // Validate the new player data
      const playerValidation = bingoSessionPlayerSchema.safeParse(newPlayer);
      if (!playerValidation.success) {
        log.error('New player data validation failed', playerValidation.error, {
          metadata: { newPlayer },
        });
        return createServiceError('Invalid player data format');
      }

      return createServiceSuccess(playerValidation.data);
    } catch (error) {
      log.error('Unexpected error in joinSession', error, {
        metadata: { data },
      });
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Check if user is already in session
   */
  async checkUserInSession(
    sessionId: string
  ): Promise<ServiceResponse<UserSessionStatus>> {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        log.error(
          'User authentication failed',
          userError || new Error('No user'),
          {
            metadata: { sessionId },
          }
        );
        return createServiceError('Not authenticated');
      }

      // Check if user is in session
      const { data: player, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        log.error('Failed to check user session status', error, {
          metadata: { sessionId, userId: user.id },
        });
        return createServiceError(error.message);
      }

      // Validate player data if it exists
      let validatedPlayer: BingoSessionPlayer | undefined;
      if (player) {
        const playerValidation = bingoSessionPlayerSchema.safeParse(player);
        if (!playerValidation.success) {
          log.error('Player data validation failed', playerValidation.error, {
            metadata: { player },
          });
          return createServiceError('Invalid player data format');
        }
        validatedPlayer = playerValidation.data;
      }

      const status: UserSessionStatus = {
        isInSession: !!player,
        player: validatedPlayer,
      };

      return createServiceSuccess(status);
    } catch (error) {
      log.error('Unexpected error in checkUserInSession', error, {
        metadata: { sessionId },
      });
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to check session status'
      );
    }
  },

  /**
   * Get available player colors for session
   */
  async getAvailableColors(
    sessionId: string
  ): Promise<ServiceResponse<AvailableColors>> {
    try {
      const supabase = createClient();

      // Get all players in session
      const { data: players, error } = await supabase
        .from('bingo_session_players')
        .select('color')
        .eq('session_id', sessionId);

      if (error) {
        log.error('Failed to get player colors', error, {
          metadata: { sessionId },
        });
        return createServiceError(error.message);
      }

      const usedColors = players?.map(p => p.color).filter(Boolean) || [];

      // Default available colors (you can import this from constants)
      const allColors = [
        '#06b6d4',
        '#8b5cf6',
        '#ec4899',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#eab308',
        '#6366f1',
        '#14b8a6',
        '#f43f5e',
        '#84cc16',
        '#0ea5e9',
      ];

      const availableColors = allColors.filter(
        color => !usedColors.includes(color)
      );

      const colors: AvailableColors = {
        availableColors,
        usedColors,
      };

      return createServiceSuccess(colors);
    } catch (error) {
      log.error('Unexpected error in getAvailableColors', error, {
        metadata: { sessionId },
      });
      return createServiceError(
        error instanceof Error
          ? error.message
          : 'Failed to get available colors'
      );
    }
  },
};
