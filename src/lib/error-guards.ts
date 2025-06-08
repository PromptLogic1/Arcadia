/**
 * Type guard utilities for safe error handling
 * Eliminates the need for type assertions on error objects
 */

/**
 * Type guard to check if an unknown error has a status property
 */
export function isErrorWithStatus(
  e: unknown
): e is { status: number; message?: string } {
  // First check if it's an object
  if (typeof e !== 'object' || e === null) {
    return false;
  }

  // Use property descriptor to safely check property type
  const descriptor = Object.getOwnPropertyDescriptor(e, 'status');
  if (!descriptor || descriptor.value === undefined) {
    return false;
  }

  return typeof descriptor.value === 'number';
}

/**
 * Type guard to check if an unknown value is an Error instance
 */
export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(e: unknown): e is { message: string } {
  // First check if it's an object
  if (typeof e !== 'object' || e === null) {
    return false;
  }

  // Use property descriptor to safely check property type
  const descriptor = Object.getOwnPropertyDescriptor(e, 'message');
  if (!descriptor || descriptor.value === undefined) {
    return false;
  }

  return typeof descriptor.value === 'string';
}

/**
 * Type guard for Supabase/PostgreSQL errors
 */
export function isSupabaseError(e: unknown): e is {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  // First check if it's an object
  if (typeof e !== 'object' || e === null) {
    return false;
  }

  // Use property descriptor to safely check property type
  const descriptor = Object.getOwnPropertyDescriptor(e, 'message');
  if (!descriptor || descriptor.value === undefined) {
    return false;
  }

  return typeof descriptor.value === 'string';
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(e: unknown): string {
  if (isError(e)) {
    return e.message;
  }

  if (isErrorWithMessage(e)) {
    return e.message;
  }

  if (typeof e === 'string') {
    return e;
  }

  return 'An unexpected error occurred';
}

/**
 * Safely extract error details for logging
 */
export function getErrorDetails(e: unknown): Record<string, unknown> {
  if (isErrorWithStatus(e)) {
    return {
      status: e.status,
      message: e.message || 'Unknown error',
    };
  }

  if (isSupabaseError(e)) {
    return {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
    };
  }

  if (isError(e)) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }

  return {
    error: String(e),
  };
}

/**
 * Safely convert any value to an Error instance
 * No type assertions - uses proper type guards
 */
export function toError(value: unknown): Error {
  if (isError(value)) {
    return value;
  }

  if (isErrorWithMessage(value)) {
    const error = new Error(value.message);
    return error;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  // For all other types, convert to string
  return new Error(String(value));
}
