import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SessionWithStats } from '../../../services/sessions.service';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePlayAreaVirtualizationOptions {
  sessions: SessionWithStats[];
}

export interface UsePlayAreaVirtualizationReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Virtualizer
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VIRTUALIZER_CONFIG = {
  estimateSize: () => 200, // Estimated height for each session card
  overscan: 3,
  gap: 16, // Gap between cards
} as const;

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing virtualization of play area sessions list
 *
 * Uses @tanstack/react-virtual for efficient rendering of large session lists.
 * Optimized for vertical scrolling with single column layout.
 *
 * @param options - Sessions array
 * @returns Virtualization setup and refs
 */
export function usePlayAreaVirtualization({
  sessions,
}: UsePlayAreaVirtualizationOptions): UsePlayAreaVirtualizationReturn {
  // Container ref for the virtualizer
  const containerRef = useRef<HTMLDivElement>(null);

  // Create virtualizer for sessions
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => containerRef.current,
    estimateSize: VIRTUALIZER_CONFIG.estimateSize,
    overscan: VIRTUALIZER_CONFIG.overscan,
    gap: VIRTUALIZER_CONFIG.gap,
  });

  return {
    containerRef,
    virtualizer,
  };
}
