import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  enabled?: boolean;
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  enabled = true,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;
    if (!target) return;

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const isVisible = entry.isIntersecting;
          setIsIntersecting(isVisible);

          if (isVisible && !hasIntersected) {
            setHasIntersected(true);

            // Disconnect if we only want to trigger once
            if (triggerOnce) {
              observerRef.current?.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(target);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, enabled, hasIntersected]);

  // Reset state when enabled changes
  useEffect(() => {
    if (!enabled) {
      setIsIntersecting(false);
      setHasIntersected(false);
    }
  }, [enabled]);

  return {
    targetRef,
    isIntersecting,
    hasIntersected,
  };
}

// Specialized hook for lazy loading
export function useLazyLoad<T extends Element = HTMLDivElement>(
  options: Omit<UseIntersectionObserverOptions, 'triggerOnce'> = {}
) {
  return useIntersectionObserver<T>({
    ...options,
    triggerOnce: true,
    rootMargin: options.rootMargin || '50px', // Start loading before element enters viewport
  });
}

// Hook for tracking visibility (for analytics, animations, etc.)
export function useVisibility<T extends Element = HTMLDivElement>(
  options: Omit<UseIntersectionObserverOptions, 'triggerOnce'> = {}
) {
  return useIntersectionObserver<T>({
    ...options,
    triggerOnce: false,
  });
}
