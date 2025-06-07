// =============================================================================
// Community Events Service
// =============================================================================
// Handles all database interactions for the community events feature.

import { createClient } from '@/lib/supabase';
import { createServiceError, createServiceSuccess } from '@/lib/service-types';
import type { ServiceResponse } from '@/lib/service-types';
import type { Tables, Enums } from '@/types/database-generated';
import { log } from '@/lib/logger';

// Type aliases for cleaner code
type CommunityEvent = Tables<'community_events'>;
type GameCategory = Enums<'game_category'>;
type EventStatus = Enums<'event_status'>;

// =============================================================================
// DOMAIN TYPES
// =============================================================================
// These types extend the base database types with additional, application-specific data.

export interface CommunityEventDomain extends CommunityEvent {
  participant_count: number;
  is_user_registered?: boolean;
  organizer?: {
    username: string;
    avatar_url?: string | null;
  };
  tags?: string[];
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

export const communityEventsService = {
  /**
   * Fetches a paginated list of community events, optionally filtered.
   * @param filters - The filters to apply.
   * @param page - The page number to fetch.
   * @param pageSize - The number of events per page.
   * @returns A paginated service response with the list of events.
   */
  async getCommunityEvents(
    filters: {
      game_type?: GameCategory;
      status?: EventStatus;
      tags?: string[];
    } = {},
    page = 1,
    pageSize = 10
  ): Promise<
    ServiceResponse<{
      items: CommunityEventDomain[];
      totalCount: number;
      hasMore: boolean;
    }>
  > {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('community_events')
        .select(
          `
          *,
          organizer:users(username, avatar_url),
          participants:community_event_participants(count)
        `,
          { count: 'exact' }
        )
        .order('start_date', { ascending: true })
        .range(from, to);

      if (filters.game_type) {
        query = query.eq('game_type', filters.game_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query;

      if (error) {
        log.error('Error fetching community events', error);
        return createServiceError('Failed to fetch community events.');
      }

      if (!data) {
        return createServiceSuccess({
          items: [],
          totalCount: 0,
          hasMore: false,
        });
      }

      // TODO: Validate data with Zod schema array
      const transformedEvents = data.map(event => ({
        ...event,
        organizer: event.organizer || undefined,
        participant_count: Array.isArray(event.participants)
          ? event.participants[0]?.count || 0
          : 0,
      }));

      return createServiceSuccess({
        items: transformedEvents,
        totalCount: count ?? 0,
        hasMore: (count ?? 0) > page * pageSize,
      });
    } catch (e) {
      log.error('Unexpected error fetching community events', e as Error);
      return createServiceError('An unexpected error occurred.');
    }
  },
} as const;
