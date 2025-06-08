import { createClient } from '@/lib/supabase';
import type { z } from 'zod';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { zBoardSettings } from '@/lib/validation/schemas/bingo';
import { log } from '@/lib/logger';

// Type alias for the inferred Zod schema
type BoardSettings = z.infer<typeof zBoardSettings>;

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
  ): Promise<ServiceResponse<BoardSettings | null>> {
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
        log.error('Failed to fetch game settings', error, {
          metadata: { boardId },
        });
        return createServiceError(error.message);
      }

      // Validate the settings
      if (!data?.settings) {
        return createServiceSuccess(null);
      }

      const parseResult = zBoardSettings.safeParse(data.settings);
      if (!parseResult.success) {
        log.error('Invalid board settings format', parseResult.error, {
          metadata: { boardId, service: 'gameSettingsService' },
        });
        return createServiceError('Invalid board settings format');
      }

      return createServiceSuccess(parseResult.data);
    } catch (error) {
      log.error(
        'Game settings fetch error',
        isError(error) ? error : new Error('Unknown fetch error'),
        {
          metadata: { boardId },
        }
      );
      return createServiceError(getErrorMessage(error));
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
        log.error('Failed to update game settings', error, {
          metadata: { boardId, settings },
        });
        return createServiceError(error.message);
      }

      // Validate the updated settings
      if (!data?.settings) {
        return createServiceSuccess(settings);
      }

      const parseResult = zBoardSettings.safeParse(data.settings);
      if (!parseResult.success) {
        log.error('Invalid updated board settings format', parseResult.error, {
          metadata: { boardId, service: 'gameSettingsService' },
        });
        return createServiceError('Invalid updated board settings format');
      }

      return createServiceSuccess(parseResult.data);
    } catch (error) {
      log.error(
        'Game settings update error',
        isError(error) ? error : new Error('Unknown update error'),
        {
          metadata: { boardId, settings },
        }
      );
      return createServiceError(getErrorMessage(error));
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
      log.error(
        'Settings validation error',
        isError(error) ? error : new Error('Unknown validation error'),
        {
          metadata: { settings },
        }
      );
      return { valid: false, error: 'Invalid settings format' };
    }
  },

  async getBoardSettings(
    boardId: string
  ): Promise<ServiceResponse<BoardSettings | null>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('settings')
        .eq('id', boardId)
        .single();

      if (error) throw error;

      if (!data?.settings) {
        return createServiceSuccess(null);
      }

      const parseResult = zBoardSettings.safeParse(data.settings);

      if (!parseResult.success) {
        log.error('Invalid board settings format', parseResult.error, {
          metadata: { boardId, service: 'gameSettingsService' },
        });
        return createServiceError('Invalid board settings format');
      }

      return createServiceSuccess(parseResult.data);
    } catch (error) {
      log.error(
        'Error getting board settings',
        isError(error) ? error : new Error(String(error)),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async updateBoardSettings(
    boardId: string,
    settings: BoardSettings
  ): Promise<ServiceResponse<BoardSettings | null>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_boards')
        .update({ settings })
        .eq('id', boardId)
        .select('settings')
        .single();

      if (error) throw error;

      const parseResult = zBoardSettings.safeParse(data?.settings);

      if (!parseResult.success) {
        log.error('Failed to parse updated board settings', parseResult.error, {
          metadata: { boardId, service: 'gameSettingsService' },
        });
        return createServiceError('Failed to parse updated board settings');
      }

      return createServiceSuccess(parseResult.data);
    } catch (error) {
      log.error(
        'Error updating board settings',
        isError(error) ? error : new Error(String(error)),
        { metadata: { boardId, service: 'gameSettingsService' } }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
