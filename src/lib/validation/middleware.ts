/**
 * Validation middleware for API routes
 * Provides type-safe request validation without type assertions
 */

import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: NextResponse;
}

export type ValidationOutcome<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates request body against a Zod schema
 * Returns either validated data or an error response
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  metadata?: Record<string, unknown>
): Promise<ValidationOutcome<T>> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Request validation failed', {
        metadata: {
          ...metadata,
          validationType: 'body',
          validationErrors: error.errors,
        },
      });

      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    logger.error('Unexpected error during body validation', toError(error), {
      metadata: { ...metadata, validationType: 'body' },
    });

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 * Returns either validated data or an error response
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>,
  metadata?: Record<string, unknown>
): ValidationOutcome<T> {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Query parameter validation failed', {
        metadata: {
          ...metadata,
          validationType: 'query',
          validationErrors: error.errors,
        },
      });

      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    logger.error('Unexpected error during query validation', toError(error), {
      metadata: { ...metadata, validationType: 'query' },
    });

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates route parameters against a Zod schema
 * Returns either validated data or an error response
 */
export function validateRouteParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>,
  metadata?: Record<string, unknown>
): ValidationOutcome<T> {
  try {
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Route parameter validation failed', {
        metadata: {
          ...metadata,
          validationType: 'params',
          validationErrors: error.errors,
        },
      });

      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Invalid route parameters',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    logger.error('Unexpected error during params validation', toError(error), {
      metadata: { ...metadata, validationType: 'params' },
    });

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid route parameters' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Type guard to check if validation was successful
 */
export function isValidationSuccess<T>(
  result: ValidationOutcome<T>
): result is ValidationSuccess<T> {
  return result.success === true;
}

/**
 * Type guard to check if validation failed
 */
export function isValidationError(
  result: ValidationOutcome<unknown>
): result is ValidationFailure {
  return result.success === false;
}
