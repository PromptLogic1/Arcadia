/**
 * Common validation types used throughout the application
 * These are different from the middleware validation types which use NextResponse
 */

/**
 * Result type for general validation operations
 * Used by cache, validators, and other non-HTTP validation scenarios
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; data: null; error: string };

/**
 * Type guard to check if a validation result is successful
 */
export function isValidationResultSuccess<T>(
  result: ValidationResult<T>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a validation result failed
 */
export function isValidationResultError<T>(
  result: ValidationResult<T>
): result is { success: false; data: null; error: string } {
  return result.success === false;
}
