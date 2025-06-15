/**
 * Lazy-loaded utility functions for performance optimization
 *
 * These utilities are loaded on-demand to reduce initial bundle size.
 * Use these for non-critical path operations.
 */

// Date formatting utilities (lazy load date-fns)
export const formatDate = async (
  date: Date | string,
  format: string
): Promise<string> => {
  const { format: formatFn } = await import('date-fns');
  return formatFn(new Date(date), format);
};

export const formatDistanceToNow = async (
  date: Date | string
): Promise<string> => {
  const { formatDistanceToNow: formatFn } = await import('date-fns');
  return formatFn(new Date(date));
};

export const parseISO = async (dateString: string): Promise<Date> => {
  const { parseISO: parseFn } = await import('date-fns');
  return parseFn(dateString);
};

// Only include utilities for libraries that are actually installed
