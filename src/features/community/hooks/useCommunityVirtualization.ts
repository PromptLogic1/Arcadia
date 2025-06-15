import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Discussion, Event } from '@/lib/stores/community-store';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCommunityVirtualizationOptions {
  discussions: Discussion[];
  events: Event[];
}

export interface UseCommunityVirtualizationReturn {
  // Refs
  discussionsContainerRef: React.RefObject<HTMLDivElement | null>;
  eventsContainerRef: React.RefObject<HTMLDivElement | null>;

  // Virtualizers
  discussionsVirtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, Element>
  >;
  eventsVirtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VIRTUALIZER_CONFIG = {
  estimateSize: () => 280, // Increased to account for actual card height + gap
  overscan: 3,
  gap: 24, // Gap between cards
} as const;

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing virtualization of discussions and events lists
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 * Provides virtualized scrolling to handle hundreds of items without
 * performance degradation.
 *
 * @param options - Discussions and events arrays
 * @returns Virtualization setup and refs
 */
export function useCommunityVirtualization({
  discussions,
  events,
}: UseCommunityVirtualizationOptions): UseCommunityVirtualizationReturn {
  // Separate parent refs for each virtualizer
  const discussionsContainerRef = useRef<HTMLDivElement>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Discussions virtualizer
  const discussionsVirtualizer = useVirtualizer({
    count: discussions.length,
    getScrollElement: () => discussionsContainerRef.current,
    estimateSize: VIRTUALIZER_CONFIG.estimateSize,
    overscan: VIRTUALIZER_CONFIG.overscan,
  });

  // Events virtualizer
  const eventsVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => eventsContainerRef.current,
    estimateSize: VIRTUALIZER_CONFIG.estimateSize,
    overscan: VIRTUALIZER_CONFIG.overscan,
  });

  return {
    discussionsContainerRef,
    eventsContainerRef,
    discussionsVirtualizer,
    eventsVirtualizer,
  };
}
