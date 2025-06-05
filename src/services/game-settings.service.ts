import { createClient } from '@/lib/supabase';
import type { BoardSettings } from '@/types';
import { logger } from '@/lib/logger';

export interface ServiceResponse<T> {
  data: T | null;
  error: string | Error | null;
}

export interface GameSettingsData {
  id: string;
  settings: BoardSettings;
}

/**
 * Service layer for game settings operations
 * Pure functions only - no state management
 */
export const gameSettingsService = {
  /**
   * Fetch game settings for a board
   */
  async getSettings(
    boardId: string,
    options?: { signal?: AbortSignal }
  ): Promise<ServiceResponse<BoardSettings>> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('bingo_boards')
        .select('settings')
        .eq('id', boardId);

      if (options?.signal) {
        query = query.abortSignal(options.signal);
      }

      const { data, error } = await query.single();

      if (error) {
        logger.error('Failed to fetch game settings', error, {
          metadata: { boardId },
        });
        return { data: null, error };
      }

      return { data: data?.settings || null, error: null };
    } catch (error) {
      logger.error('Game settings fetch error', error instanceof Error ? error : new Error('Unknown fetch error'), {
        metadata: { boardId },
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  },

  /**
   * Update game settings for a board
   */
  async updateSettings(
    boardId: string,
    settings: BoardSettings,
    options?: { signal?: AbortSignal }
  ): Promise<ServiceResponse<BoardSettings>> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('bingo_boards')
        .update({ settings })
        .eq('id', boardId)
        .select('settings');

      if (options?.signal) {
        query = query.abortSignal(options.signal);
      }

      const { data, error } = await query.single();

      if (error) {
        logger.error('Failed to update game settings', error, {
          metadata: { boardId, settings },
        });
        return { data: null, error };
      }

      return { data: data?.settings || settings, error: null };
    } catch (error) {
      logger.error('Game settings update error', error instanceof Error ? error : new Error('Unknown update error'), {
        metadata: { boardId, settings },
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  },

  /**
   * Validate game settings
   */
  validateSettings(settings: BoardSettings): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Team mode requires lockout
      if (settings.team_mode && !settings.lockout) {
        return {
          valid: false,
          error: 'Team mode requires lockout to be enabled',
        };
      }

      // At least one win condition must be active
      const winConditions = settings.win_conditions;
      if (
        !winConditions?.line &&
        !winConditions?.majority &&
        !winConditions?.diagonal &&
        !winConditions?.corners
      ) {
        return {
          valid: false,
          error: 'At least one win condition must be active',
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Settings validation error', error instanceof Error ? error : new Error('Unknown validation error'), {
        metadata: { settings },
      });
      return { valid: false, error: 'Invalid settings format' };
    }
  },
};
