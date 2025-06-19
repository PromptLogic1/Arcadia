/**
 * Test Infrastructure Entry Point
 *
 * Exports all testing utilities, mocks, and factories for easy import
 */

// Core testing utilities
export * from './test-utils';

// Mock implementations
export * from './mocks/supabase.mock';

// Test data factories
export * from './factories';

// Re-export service types for testing
export {
  createServiceSuccess,
  createServiceError,
  type ServiceResponse,
  type PaginatedResponse,
} from '@/lib/service-types';

// Re-export validation types for testing
export { type ValidationResult } from '@/lib/validation/types';

// Re-export error handling for testing
export {
  ErrorFactory,
  ErrorCode,
  ErrorSeverity,
  ArcadiaError,
  isArcadiaError,
  isRetryableError,
  isCriticalError,
  type ErrorMetadata,
} from '@/lib/error-handler';
