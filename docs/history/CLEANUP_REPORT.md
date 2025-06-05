# Cleanup Report

## Date: January 2025

## Overview

This report documents the cleanup efforts to reduce bundle size and remove unused code from the Arcadia codebase.

## Components Removed

### Deprecated Hooks (2 files)

- `src/features/bingo-boards/hooks/usePresenceLegacy.ts` - Deprecated legacy presence hook
- `src/features/bingo-boards/hooks/useBingoBoardLegacy.ts` - Deprecated legacy bingo board hook

### Unused UI Components (6 files)

- `src/components/ui/sheet.tsx` - Unused shadcn/ui component
- `src/components/ui/ArcadeDecoration.tsx` - Not imported anywhere
- `src/components/ui/SectionDivider.tsx` - Not imported anywhere
- `src/components/ui/toggle.tsx` - Not imported anywhere
- `src/components/ui/command.tsx` - Not imported anywhere

### Unused Feature Components (4 files)

- `src/features/community/components/EventView.tsx` - Unused community component
- `src/features/community/components/shared/FilterGroup.tsx` - Unused shared component
- `src/features/bingo-boards/components/BingoBoards.tsx` - Replaced by BingoBoardsHub

### Unused Scripts (4 files)

- `scripts/detailed-schema-inspect.js` - Not referenced in package.json
- `scripts/inspect-db-schema.js` - Not referenced in package.json
- `scripts/postgres-schema-inspect.js` - Not referenced in package.json
- `scripts/add-error-boundaries.js` - One-time script, already executed

## Total Files Removed: 16

## Bundle Size Impact

Estimated reduction: ~50-100KB (uncompressed)

## Placeholder Components Identified (Not Removed)

These components are placeholders that should be implemented or removed in future phases:

- `src/features/Speedruns/SpeedRuns.tsx` - "Speed running features coming soon..."
- `src/features/achievement-hunt/AchievementHunt.tsx` - "Achievement tracking features coming soon..."
- `src/features/puzzle-quests/PuzzleQuests.tsx` - "Puzzle features coming soon..."

## Empty Type Directories Identified

- `src/features/Speedruns/types/` - Empty directory
- `src/features/achievement-hunt/types/` - Empty directory
- `src/features/puzzle-quests/types/` - Empty directory

## Recommendations

1. Remove or implement the placeholder components to reduce bundle size further
2. Remove empty type directories
3. Consider removing test files that test mock components rather than real ones
4. Audit and remove more unused utilities and services
5. Run bundle analyzer to identify other large unused chunks

## Next Steps

1. Update imports to ensure no broken references
2. Run build to verify no compilation errors
3. Test application functionality
4. Measure actual bundle size reduction
