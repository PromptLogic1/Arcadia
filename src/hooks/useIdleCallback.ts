import { useEffect, useRef, useCallback } from 'react';

interface UseIdleCallbackOptions {
  timeout?: number;
  enabled?: boolean;
}

// Standard IdleRequestCallback type is available globally
// No need to redeclare these types

// Polyfill for browsers that don't support requestIdleCallback
function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  const timeout = options?.timeout || 0;
  const startTime = performance.now();

  const timeoutId = setTimeout(() => {
    callback({
      didTimeout: timeout > 0 && performance.now() - startTime >= timeout,
      timeRemaining() {
        return Math.max(0, 50 - (performance.now() - startTime));
      },
    });
  }, 1);
  // setTimeout returns number in browsers, NodeJS.Timeout in Node
  return Number(timeoutId);
}

function cancelIdleCallbackPolyfill(id: number): void {
  clearTimeout(id);
}

export function useIdleCallback(
  callback: () => void,
  deps: React.DependencyList,
  options: UseIdleCallbackOptions = {}
) {
  const { timeout = 5000, enabled = true } = options;
  const callbackRef = useRef(callback);
  const idleIdRef = useRef<number | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Schedule idle callback
  useEffect(() => {
    if (!enabled) return;

    // Cancel previous idle callback
    if (idleIdRef.current !== null) {
      const cancelFn = window.cancelIdleCallback || cancelIdleCallbackPolyfill;
      cancelFn(idleIdRef.current);
    }

    // Schedule new idle callback
    const requestFn = window.requestIdleCallback || requestIdleCallbackPolyfill;
    idleIdRef.current = requestFn(
      deadline => {
        // Only execute if we have time remaining or if we timed out
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
          callbackRef.current();
        }
      },
      { timeout }
    );

    return () => {
      if (idleIdRef.current !== null) {
        const cancelFn =
          window.cancelIdleCallback || cancelIdleCallbackPolyfill;
        cancelFn(idleIdRef.current);
        idleIdRef.current = null;
      }
    };
  }, [callback, enabled, timeout]);

  const cancelIdleCallback = useCallback(() => {
    if (idleIdRef.current !== null) {
      const cancelFn = window.cancelIdleCallback || cancelIdleCallbackPolyfill;
      cancelFn(idleIdRef.current);
      idleIdRef.current = null;
    }
  }, []);

  return { cancelIdleCallback };
}

// Hook for scheduling non-critical work
export function useIdleWork<T>(
  work: () => T,
  deps: React.DependencyList,
  options: UseIdleCallbackOptions & {
    onComplete?: (result: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { onComplete, onError, ...idleOptions } = options;
  const resultRef = useRef<T | null>(null);

  const workCallback = useCallback(() => {
    try {
      const result = work();
      resultRef.current = result;
      onComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [work, onComplete, onError]);

  const { cancelIdleCallback } = useIdleCallback(
    workCallback,
    deps,
    idleOptions
  );

  return {
    result: resultRef.current,
    cancelIdleCallback,
  };
}

// Hook for batching non-critical updates
export function useIdleBatch<T>(
  items: T[],
  processor: (item: T) => void,
  options: UseIdleCallbackOptions & {
    batchSize?: number;
    onBatchComplete?: (processedCount: number) => void;
    onAllComplete?: () => void;
  } = {}
) {
  const {
    batchSize = 10,
    onBatchComplete,
    onAllComplete,
    ...idleOptions
  } = options;

  const processedCountRef = useRef(0);
  const currentIndexRef = useRef(0);

  const processBatch = useCallback(() => {
    const startIndex = currentIndexRef.current;
    const endIndex = Math.min(startIndex + batchSize, items.length);

    for (let i = startIndex; i < endIndex; i++) {
      const item = items[i];
      if (item !== undefined) {
        processor(item);
        processedCountRef.current++;
      }
    }

    currentIndexRef.current = endIndex;
    onBatchComplete?.(endIndex - startIndex);

    // If there are more items, schedule next batch
    if (endIndex < items.length) {
      const requestFn =
        window.requestIdleCallback || requestIdleCallbackPolyfill;
      requestFn(processBatch, { timeout: idleOptions.timeout });
    } else {
      onAllComplete?.();
    }
  }, [
    items,
    processor,
    batchSize,
    onBatchComplete,
    onAllComplete,
    idleOptions.timeout,
  ]);

  // Reset counters when items change
  useEffect(() => {
    processedCountRef.current = 0;
    currentIndexRef.current = 0;
  }, [items]);

  const { cancelIdleCallback } = useIdleCallback(
    processBatch,
    [items, processor],
    idleOptions
  );

  return {
    processedCount: processedCountRef.current,
    totalCount: items.length,
    isComplete: processedCountRef.current >= items.length,
    cancelIdleCallback,
  };
}
