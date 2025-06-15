import { useEffect, useRef, useState, useCallback } from 'react';

interface UseResizeObserverOptions {
  enabled?: boolean;
  debounceMs?: number;
}

interface ResizeEntry {
  width: number;
  height: number;
  element: Element;
}

export function useResizeObserver<T extends Element = HTMLDivElement>({
  enabled = true,
  debounceMs = 100,
}: UseResizeObserverOptions = {}) {
  const [dimensions, setDimensions] = useState<ResizeEntry | null>(null);
  const targetRef = useRef<T>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetDimensions = useCallback(
    (entry: ResizeObserverEntry) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setDimensions({
          width,
          height,
          element: entry.target,
        });
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;
    if (!target) return;

    // Check if ResizeObserver is supported
    if (typeof ResizeObserver === 'undefined') {
      console.warn('ResizeObserver is not supported in this browser');
      return;
    }

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new ResizeObserver(entries => {
      entries.forEach(entry => {
        debouncedSetDimensions(entry);
      });
    });

    observerRef.current.observe(target);

    return () => {
      observerRef.current?.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, debouncedSetDimensions]);

  // Reset state when enabled changes
  useEffect(() => {
    if (!enabled) {
      setDimensions(null);
    }
  }, [enabled]);

  return {
    targetRef,
    dimensions,
    width: dimensions?.width ?? 0,
    height: dimensions?.height ?? 0,
  };
}

// Specialized hook for responsive behavior
export function useResponsiveResize<T extends Element = HTMLDivElement>(
  breakpoints: Record<string, number> = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  }
) {
  const { targetRef, width, height, dimensions } = useResizeObserver<T>();

  const currentBreakpoint =
    Object.entries(breakpoints)
      .reverse() // Start from largest
      .find(([_, size]) => width >= size)?.[0] || 'xs';

  const isBreakpoint = useCallback(
    (breakpoint: string) => currentBreakpoint === breakpoint,
    [currentBreakpoint]
  );

  const isAbove = useCallback(
    (breakpoint: string) => {
      const size = breakpoints[breakpoint];
      return size ? width >= size : false;
    },
    [width, breakpoints]
  );

  const isBelow = useCallback(
    (breakpoint: string) => {
      const size = breakpoints[breakpoint];
      return size ? width < size : false;
    },
    [width, breakpoints]
  );

  return {
    targetRef,
    width,
    height,
    dimensions,
    currentBreakpoint,
    isBreakpoint,
    isAbove,
    isBelow,
  };
}

// Hook for container queries
export function useContainerQuery<T extends Element = HTMLDivElement>(
  query: string,
  fallback = false
) {
  const { targetRef, width, height } = useResizeObserver<T>();
  const [matches, setMatches] = useState(fallback);

  useEffect(() => {
    if (!width || !height) return;

    // Simple query parsing for common cases
    // This is a basic implementation - in production you might want a more robust parser
    try {
      if (query.includes('min-width')) {
        const match = query.match(/min-width:\s*(\d+)px/);
        const minWidth = match?.[1] ? parseInt(match[1], 10) : 0;
        setMatches(width >= minWidth);
      } else if (query.includes('max-width')) {
        const match = query.match(/max-width:\s*(\d+)px/);
        const maxWidth = match?.[1] ? parseInt(match[1], 10) : Infinity;
        setMatches(width <= maxWidth);
      }
    } catch (error) {
      console.warn('Failed to parse container query:', query, error);
      setMatches(fallback);
    }
  }, [width, height, query, fallback]);

  return {
    targetRef,
    matches,
    width,
    height,
  };
}
