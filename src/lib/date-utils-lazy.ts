/**
 * Lazy-loaded date utilities
 *
 * These functions lazy-load date-fns to reduce initial bundle size.
 * date-fns is only loaded when date formatting is actually needed.
 */

/* eslint-disable @typescript-eslint/consistent-type-imports */

import { log } from '@/lib/logger';

// Cache for loaded functions - use any to avoid complex typing
const loadedFunctions = new Map<string, (...args: never[]) => unknown>();

/**
 * Lazy-loads a specific date-fns function
 */
async function loadDateFunction<T extends (...args: never[]) => unknown>(
  functionName: string
): Promise<T> {
  const cached = loadedFunctions.get(functionName);
  if (cached) {
    return cached as T;
  }

  try {
    // Import the entire date-fns module
    const dateFns = await import('date-fns');
    const fn = dateFns[functionName as keyof typeof dateFns];
    if (!fn || typeof fn !== 'function') {
      throw new Error(`Function ${functionName} not found in date-fns`);
    }
    // Store and return the function with proper typing
    const typedFn = fn as unknown as T;
    loadedFunctions.set(functionName, typedFn);
    return typedFn;
  } catch (error) {
    log.error(`Failed to load date-fns/${functionName}`, error, {
      metadata: { service: 'date-utils-lazy', functionName },
    });
    throw error;
  }
}

/**
 * Lazy version of format
 * @param date - The date to format
 * @param formatString - The format string
 * @param options - Optional formatting options
 * @returns Promise<string> - Formatted date string
 */
export async function formatLazy(
  date: Date | number | string,
  formatString: string,
  options?: Parameters<typeof import('date-fns').format>[2]
): Promise<string> {
  const format =
    await loadDateFunction<typeof import('date-fns').format>('format');
  return format(date, formatString, options);
}

/**
 * Lazy version of formatDistanceToNow
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Promise<string> - Formatted distance string
 */
export async function formatDistanceToNowLazy(
  date: Date | number | string,
  options?: Parameters<typeof import('date-fns').formatDistanceToNow>[1]
): Promise<string> {
  const formatDistanceToNow = await loadDateFunction<
    typeof import('date-fns').formatDistanceToNow
  >('formatDistanceToNow');
  return formatDistanceToNow(date, options);
}

/**
 * Lazy version of formatRelative
 * @param date - The date to format
 * @param baseDate - The date to compare against
 * @param options - Optional formatting options
 * @returns Promise<string> - Formatted relative date string
 */
export async function formatRelativeLazy(
  date: Date | number | string,
  baseDate: Date | number | string,
  options?: Parameters<typeof import('date-fns').formatRelative>[2]
): Promise<string> {
  const formatRelative =
    await loadDateFunction<typeof import('date-fns').formatRelative>(
      'formatRelative'
    );
  return formatRelative(date, baseDate, options);
}

/**
 * Lazy version of parseISO
 * @param dateString - The ISO date string to parse
 * @param options - Optional parsing options
 * @returns Promise<Date> - Parsed date
 */
export async function parseISOLazy(
  dateString: string,
  options?: Parameters<typeof import('date-fns').parseISO>[1]
): Promise<Date> {
  const parseISO =
    await loadDateFunction<typeof import('date-fns').parseISO>('parseISO');
  return parseISO(dateString, options);
}

/**
 * Lazy version of isAfter
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns Promise<boolean> - Whether date is after dateToCompare
 */
export async function isAfterLazy(
  date: Date | number,
  dateToCompare: Date | number
): Promise<boolean> {
  const isAfter =
    await loadDateFunction<typeof import('date-fns').isAfter>('isAfter');
  return isAfter(date, dateToCompare);
}

/**
 * Lazy version of isBefore
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns Promise<boolean> - Whether date is before dateToCompare
 */
export async function isBeforeLazy(
  date: Date | number,
  dateToCompare: Date | number
): Promise<boolean> {
  const isBefore =
    await loadDateFunction<typeof import('date-fns').isBefore>('isBefore');
  return isBefore(date, dateToCompare);
}

/**
 * Lazy version of addDays
 * @param date - The date to add days to
 * @param amount - The amount of days to add
 * @returns Promise<Date> - The new date
 */
export async function addDaysLazy(
  date: Date | number,
  amount: number
): Promise<Date> {
  const addDays =
    await loadDateFunction<typeof import('date-fns').addDays>('addDays');
  return addDays(date, amount);
}

/**
 * Lazy version of differenceInDays
 * @param dateLeft - The later date
 * @param dateRight - The earlier date
 * @returns Promise<number> - The number of days between dates
 */
export async function differenceInDaysLazy(
  dateLeft: Date | number,
  dateRight: Date | number
): Promise<number> {
  const differenceInDays =
    await loadDateFunction<typeof import('date-fns').differenceInDays>(
      'differenceInDays'
    );
  return differenceInDays(dateLeft, dateRight);
}

/**
 * For components that need immediate date formatting (e.g., for SSR),
 * provide fallback formatting
 */
export function formatDateFallback(
  date: Date | number | string,
  _formatString?: string
): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  // Simple fallback formatting
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Simple relative time fallback
 */
export function formatRelativeFallback(date: Date | number | string): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
