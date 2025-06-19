/**
 * Settings Feature Test Suite
 *
 * Comprehensive unit tests for settings business logic
 */

// Export all test modules for potential programmatic access
export * from './preference-validation.test';
export * from './theme-engine.test';
export * from './privacy-settings.test';
export * from './data-export.test';
export * from './settings-store.test';
export * from './preference-migration.test';
export * from './account-deletion.test';

/**
 * Test Coverage Areas:
 *
 * 1. Preference Validation (preference-validation.test.ts)
 *    - Email validation rules
 *    - Password requirements
 *    - Notification settings combinations
 *    - Privacy settings constraints
 *    - Profile update validation
 *    - Form field validation
 *
 * 2. Theme Engine (theme-engine.test.ts)
 *    - Theme preference storage and retrieval
 *    - System theme detection
 *    - Theme application logic
 *    - Theme persistence and sync
 *    - Color calculations
 *    - Analytics tracking
 *
 * 3. Privacy Settings (privacy-settings.test.ts)
 *    - Profile visibility rules
 *    - Data collection preferences
 *    - Online status management
 *    - Friend request settings
 *    - Game activity privacy
 *    - Blocked users management
 *
 * 4. Data Export (data-export.test.ts)
 *    - Export format generation (JSON, CSV)
 *    - Privacy compliance filtering
 *    - File metadata generation
 *    - Export validation and checksums
 *    - Rate limiting
 *    - Export history tracking
 *
 * 5. Settings Store (settings-store.test.ts)
 *    - Zustand store state management
 *    - Modal management
 *    - Form data management
 *    - Success state management
 *    - Notification/privacy preferences
 *    - Store reset functionality
 *    - Persistence logic
 *
 * 6. Preference Migration (preference-migration.test.ts)
 *    - Theme migration from legacy formats
 *    - Notification settings migration
 *    - Privacy settings migration
 *    - Language/locale migration
 *    - Version tracking
 *    - Conflict resolution
 *
 * 7. Account Deletion (account-deletion.test.ts)
 *    - Deletion request validation
 *    - Grace period handling
 *    - Data categorization for deletion
 *    - Deletion process execution
 *    - Notification and confirmation
 *    - Data export before deletion
 *    - Account recovery prevention
 */
