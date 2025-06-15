/**
 * Throttle function to limit the rate at which a function can fire.
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle = false;
  let lastResult: ReturnType<T> | undefined;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func.apply(this, args) as ReturnType<T>;
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

/**
 * Throttle function with trailing call
 * Ensures the last call is always executed after the throttle period
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 * @returns The throttled function
 */
export function throttleWithTrailing<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: NodeJS.Timeout | null = null;
  let lastRan: number | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      if (lastFunc) clearTimeout(lastFunc);

      const remainingTime = limit - (Date.now() - lastRan);
      lastFunc = setTimeout(
        () => {
          if (lastRan !== null && Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        Math.max(0, remainingTime)
      );
    }
  };
}
