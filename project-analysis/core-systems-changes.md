# Core Systems Changes - Lint Warning Fixes

## Overview
This document tracks all changes made to fix lint warnings in the core systems components.

## Changes Made

### 1. RootErrorBoundary.tsx
**Issue**: Unused `_sentryError` variable on lines 105 and 135
**Fix**: Added `eslint-disable-next-line` comments for the catch blocks where the error parameter is intentionally unused

### 2. lazy-ui-components.tsx
**Issue**: Unused import `ComponentType` from React
**Fix**: Removed the unused import

### 3. CyberpunkBackground.tsx
**Issue**: Unnecessary dependency `opacity` in useMemo on line 134
**Fix**: Removed `opacity` from dependency array and added `gridStyle` and `circuitStyle` as they capture the opacity value

### 4. useLoginForm.ts
**Issue**: Unused import `LOGIN_MESSAGES`
**Fix**: Removed the unused import (LOGIN_MESSAGES is not used in the hook)

### 5. useSignUpForm.ts
**Issue**: Unused import `SIGNUP_MESSAGES`
**Fix**: Removed the unused import (SIGNUP_MESSAGES is not used in the hook)

### 6. useSignUpSubmission.ts
**Issue**: Unused imports `SignUpStatus` and `SignUpMessage` types
**Fix**: Removed the unused type imports (they are imported from signup-form.types but not used directly)

## Summary
All lint warnings in core systems have been addressed by:
- Removing unused imports (4 files)
- Fixing React Hook dependencies (1 file) 
- Adding ESLint disable comments for intentionally unused catch parameters (1 file)
- Preserving code functionality while improving code quality

Total files modified: 6
Total warnings fixed: 6

## Verification
Ran `npx eslint` on all modified files - no warnings remaining.