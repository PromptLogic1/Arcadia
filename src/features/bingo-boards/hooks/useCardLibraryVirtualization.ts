import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BingoCard } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCardLibraryVirtualizationOptions {
  cards: BingoCard[];
  columns: number;
}

export interface UseCardLibraryVirtualizationReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Virtualizer
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;

  // Computed values
  rowCount: number;
  getCardAtIndex: (rowIndex: number, colIndex: number) => BingoCard | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VIRTUALIZER_CONFIG = {
  estimateSize: () => 150, // Estimated height for each card row
  overscan: 2, // Reduced overscan for better performance
  gap: 12, // Gap between cards
} as const;

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing virtualization of card library grid
 *
 * Uses @tanstack/react-virtual for efficient rendering of large card grids.
 * Handles grid layout with multiple columns per row.
 *
 * @param options - Cards array and number of columns
 * @returns Virtualization setup and helper functions
 */
export function useCardLibraryVirtualization({
  cards,
  columns,
}: UseCardLibraryVirtualizationOptions): UseCardLibraryVirtualizationReturn {
  // Container ref for the virtualizer
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate number of rows based on cards and columns
  const rowCount = Math.ceil(cards.length / columns);

  // Create virtualizer for rows (not individual cards)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: VIRTUALIZER_CONFIG.estimateSize,
    overscan: VIRTUALIZER_CONFIG.overscan,
    gap: VIRTUALIZER_CONFIG.gap,
  });

  // Helper function to get card at specific row and column
  const getCardAtIndex = (
    rowIndex: number,
    colIndex: number
  ): BingoCard | undefined => {
    const cardIndex = rowIndex * columns + colIndex;
    return cards[cardIndex];
  };

  return {
    containerRef,
    virtualizer,
    rowCount,
    getCardAtIndex,
  };
}
