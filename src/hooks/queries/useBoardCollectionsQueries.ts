/**
 * Board Collections Query Hooks
 *
 * TanStack Query hooks for board collections data.
 * Part of the TanStack Query + Zustand + Service Layer pattern.
 */

import { useQuery } from '@tanstack/react-query';
import { boardCollectionsService } from '../../services/board-collections.service';
import type { BoardCollectionFilters } from '../../services/board-collections.service';

/**
 * Query key factory for board collections
 */
export const boardCollectionsKeys = {
  all: ['board-collections'] as const,
  lists: () => [...boardCollectionsKeys.all, 'list'] as const,
  list: (filters: BoardCollectionFilters) =>
    [...boardCollectionsKeys.lists(), filters] as const,
  details: () => [...boardCollectionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...boardCollectionsKeys.details(), id] as const,
};

/**
 * Hook to fetch board collections based on filters
 */
export function useBoardCollectionsQuery(filters: BoardCollectionFilters) {
  return useQuery({
    queryKey: boardCollectionsKeys.list(filters),
    queryFn: () => boardCollectionsService.getCollections(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    select: data => ({
      collections: data.collections,
      error: data.error,
    }),
  });
}

/**
 * Hook to fetch a single board collection
 */
export function useBoardCollectionQuery(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: boardCollectionsKeys.detail(collectionId),
    queryFn: () => boardCollectionsService.getCollection(collectionId),
    enabled: enabled && !!collectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: data => ({
      collection: data.collection,
      error: data.error,
    }),
  });
}
