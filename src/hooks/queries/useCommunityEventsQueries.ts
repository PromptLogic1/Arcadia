/**
 * Community Events React Query Hooks
 *
 * Hooks for community events operations using TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { communityEventsService } from '@/services/community-events.service';
import { queryKeys } from './index';
import type { Enums } from '@/types/database.types';

type GameCategory = Enums<'game_category'>;
type EventStatus = Enums<'event_status'>;

export interface CommunityEventFilters {
  game_type?: GameCategory;
  status?: EventStatus;
  tags?: string[];
}

/**
 * Hook to fetch a paginated list of community events.
 * @param filters - The filters to apply to the query.
 * @param page - The page number to fetch.
 * @param pageSize - The number of events per page.
 * @returns A query object with the list of events.
 */
export function useCommunityEventsQuery(
  filters: CommunityEventFilters = {},
  page = 1,
  pageSize = 10
) {
  return useQuery({
    queryKey: queryKeys.communityEvents.all(filters, page),
    queryFn: () =>
      communityEventsService.getCommunityEvents(filters, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: response => {
      if (response.success) {
        return {
          events: response.data?.items || [],
          totalCount: response.data?.totalCount || 0,
          hasMore: response.data?.hasMore || false,
          error: null,
        };
      }
      return {
        events: [],
        totalCount: 0,
        hasMore: false,
        error: response.error,
      };
    },
  });
}
