'use client';

import { useRef, useCallback, useEffect } from 'react';
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Memoize the size estimator function for better performance
  const sizeEstimator = useCallback(() => estimateSize, [estimateSize]);

  // Memoize scroll element getter
  const getScrollElement = useCallback(() => parentRef.current, []);

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: items.length,
    getScrollElement,
    estimateSize: sizeEstimator,
    overscan,
    // Note: measureElement is handled by @tanstack/react-virtual internally
    // It manages ResizeObserver lifecycle properly
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: 'center' });
    },
    [virtualizer]
  );

  // Ensure cleanup on unmount
  useEffect(() => {
    // The virtualizer handles its own cleanup, but we ensure our ref is cleared
    return () => {
      // Clear any stored ResizeObserver reference
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Force cleanup of virtualizer if needed
      if (virtualizer) {
        // @tanstack/react-virtual handles cleanup internally
        // but we can trigger a measure to ensure state is clean
        virtualizer.measure();
      }
    };
  }, [virtualizer]);

  // Monitor parent element changes for proper cleanup
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    // Create our own ResizeObserver for monitoring parent
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        // Trigger virtualizer remeasure on parent resize
        virtualizer.measure();
      });

      resizeObserverRef.current.observe(element);
    }

    return () => {
      if (resizeObserverRef.current && element) {
        resizeObserverRef.current.unobserve(element);
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [virtualizer]);

  return {
    parentRef,
    virtualizer,
    scrollToIndex,
  };
};
