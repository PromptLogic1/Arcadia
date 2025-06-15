# Type Assertions Audit Report

## Overview

This report identifies all type assertions and type safety issues found in the Arcadia codebase that violate the project's strict type safety rules.

## Critical Type Assertions Found

### 1. Production Code (High Priority)

#### `/src/features/landing/components/index.server.tsx`

- **Line 105**: `challenges as any`
- **Impact**: Props passed to FeaturedChallenges component without proper typing
- **Fix**: Define proper interface for challenges prop

#### `/src/features/community/components/DiscussionCard.tsx`

- **Line 170**: `as React.CSSProperties & { '--content-height': string }`
- **Impact**: CSS custom properties type assertion
- **Fix**: Create proper typed CSS properties interface

#### `/src/features/community/components/EventCard.tsx`

- **Line 207**: `as React.CSSProperties & { '--content-height': string }`
- **Impact**: CSS custom properties type assertion
- **Fix**: Create proper typed CSS properties interface

#### `/src/hooks/useIdleCallback.ts`

- **Line 31**: `as unknown as number`
- **Line 112**: `error as Error`
- **Impact**: Type assertions in polyfill implementation
- **Fix**: Proper error handling and type narrowing

#### `/src/features/bingo-boards/hooks/useBoardSaveActions.ts`

- **Line 48**: `boardData as any`
- **Line 173**: `boardData as any`
- **Impact**: Unsafe board data access in critical save operations
- **Fix**: Use proper type guards or Zod validation

#### `/src/lib/sentry-lazy.ts`

- **Line 73**: `Sentry as unknown as SentryModule`
- **Impact**: Dynamic import type assertion
- **Fix**: Proper module typing for dynamic imports

### 2. Test Code (Lower Priority)

- Multiple test files use `as any` for mocking purposes
- This is acceptable in test files but should still be minimized

## Summary Statistics

- **Total Type Assertions Found**: 11
- **Production Code**: 8
- **Test Code**: 3
- **Critical (affecting performance)**: 5

## Recommended Actions

1. **Immediate Priority**:

   - Fix type assertions in `useBoardSaveActions.ts` - critical for data integrity
   - Fix type assertions in component props (`index.server.tsx`)

2. **High Priority**:

   - Create typed CSS properties interface for animation styles
   - Add proper error type guards in `useIdleCallback.ts`

3. **Medium Priority**:
   - Improve dynamic import typing in `sentry-lazy.ts`
   - Add Zod schemas for board data validation

## Type Safety Improvements Needed

1. **CSS Custom Properties**:

   ```typescript
   interface AnimationStyles extends React.CSSProperties {
     '--content-height'?: string;
     '--animation-duration'?: string;
   }
   ```

2. **Board Data Validation**:

   - Create Zod schema for board query results
   - Use schema.parse() instead of type assertions

3. **Error Handling**:
   - Use proper error type guards
   - Avoid `as Error` assertions

## Conclusion

While the codebase shows significant improvement (207 type assertions previously fixed), there are still 8 critical type assertions in production code that need immediate attention. These primarily affect:

- Component rendering performance (CSS animations)
- Data integrity (board save operations)
- Error handling reliability

All of these should be fixed before the 1-2 week production timeline.
