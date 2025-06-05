/**
 * Zentrale Service Layer Types - Single Source of Truth
 * Alle Services MÜSSEN diese standardisierten Response-Types verwenden
 */

export interface ServiceResponse<T> {
  data: T | null;
  error: string | Error | null;
  success: boolean;
}

export interface ServiceError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Helper function to create successful service responses
 */
export function createServiceSuccess<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

/**
 * Helper function to create error service responses
 */
export function createServiceError<T>(
  error: string | Error
): ServiceResponse<T> {
  return {
    data: null,
    error: typeof error === 'string' ? error : error.message,
    success: false,
  };
}
