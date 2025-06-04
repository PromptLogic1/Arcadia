'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';

interface UseVirtualListReturn {
  parentRef: React.RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollToIndex: (index: number) => void;
}

export const useVirtualList = <T extends Element>(
  items: T[],
  estimateSize = 200,
  overscan = 5
): UseVirtualListReturn => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize the size estimator function for better performance
  const sizeEstimator = useCallback(() => estimateSize, [estimateSize]);
  
  // Memoize scroll element getter
  const getScrollElement = useCallback(() => parentRef.current, []);

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: items.length,
    getScrollElement,
    estimateSize: sizeEstimator,
    overscan,
    // Add performance optimization for better memory usage
    measureElement: 
      typeof ResizeObserver !== 'undefined'
        ? (element) => element?.getBoundingClientRect()?.height ?? estimateSize
        : undefined,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: 'center' });
    },
    [virtualizer]
  );

  return {
    parentRef,
    virtualizer,
    scrollToIndex,
  };
};
