import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Tables } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

type BingoBoard = Tables<'bingo_boards'>;

export interface UseBingoBoardsVirtualizationOptions {
  boards: BingoBoard[];
}

export interface UseBingoBoardsVirtualizationReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Virtualizer
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VIRTUALIZER_CONFIG = {
  estimateSize: () => 200, // Increased to account for actual card height + gap
  overscan: 3,
  gap: 24, // Increased gap between cards for better spacing
} as const;

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing virtualization of bingo boards list
 *
 * Uses @tanstack/react-virtual for efficient rendering of large board lists.
 * Optimized for vertical scrolling with single column layout.
 *
 * @param options - Boards array
 * @returns Virtualization setup and refs
 */
export function useBingoBoardsVirtualization({
  boards,
}: UseBingoBoardsVirtualizationOptions): UseBingoBoardsVirtualizationReturn {
  // Container ref for the virtualizer
  const containerRef = useRef<HTMLDivElement>(null);

  // Create virtualizer for boards
  const virtualizer = useVirtualizer({
    count: boards.length,
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
