# Error Boundary Implementation Guide

**Created**: January 2025  
**Status**: 20% Implemented (Components exist, coverage is poor)  
**Priority**: CRITICAL - App will crash in production without this

## Overview

This document details the error boundary implementation in Arcadia, which prevents the application from crashing due to JavaScript errors in component trees.

## Architecture

### Error Boundary Hierarchy

```
RootErrorBoundary (app/layout.tsx)
└── Providers
    └── BaseErrorBoundary (layout-level)
        └── RouteErrorBoundary (page-level)
            └── BaseErrorBoundary (component-level)
                └── RealtimeErrorBoundary (real-time components)
                └── AsyncBoundary (async components)
```

## Components

### 1. RootErrorBoundary

**Location**: `src/components/error-boundaries/RootErrorBoundary.tsx`  
**Purpose**: Last line of defense, catches critical errors that escape all other boundaries

```typescript
<RootErrorBoundary>
  <Providers>
    {/* Entire app */}
  </Providers>
</RootErrorBoundary>
```

**Features**:

- Minimal UI (no dependencies on app components)
- Logs to error tracking service
- Shows reload button
- Development mode shows stack trace

### 2. BaseErrorBoundary

**Location**: `src/components/error-boundaries/BaseErrorBoundary.tsx`  
**Purpose**: Reusable error boundary with configurable behavior

```typescript
<BaseErrorBoundary
  level="component"           // 'page' | 'layout' | 'component'
  fallback={customFallback}   // Optional custom error UI
  onError={handleError}       // Optional error handler
  resetKeys={[dep1, dep2]}    // Reset when these change
  resetOnPropsChange         // Reset when children change
  showDetails={isDev}        // Show error details
>
  {children}
</BaseErrorBoundary>
```

**Features**:

- Configurable error UI based on level
- Automatic error counting (reloads after 3 errors)
- Error ID generation for support
- Reset functionality
- Development mode details

### 3. RouteErrorBoundary

**Location**: `src/components/error-boundaries/RouteErrorBoundary.tsx`  
**Purpose**: Page-level error boundary that resets on route changes

```typescript
<RouteErrorBoundary routeName="BoardEdit">
  <PageComponent />
</RouteErrorBoundary>
```

**Features**:

- Automatically resets on route changes
- Logs route-specific errors
- Shows page-level error UI

### 4. AsyncBoundary

**Location**: `src/components/error-boundaries/AsyncBoundary.tsx`  
**Purpose**: Combines Suspense with error boundary for async components

```typescript
<AsyncBoundary
  loadingFallback={<CustomLoader />}
  errorFallback={<CustomError />}
  loadingMessage="Loading data..."
>
  <AsyncComponent />
</AsyncBoundary>
```

**Features**:

- Handles both loading and error states
- Default loading spinner
- Configurable messages

### 5. RealtimeErrorBoundary

**Location**: `src/components/error-boundaries/RealtimeErrorBoundary.tsx`  
**Purpose**: Specialized boundary for real-time/WebSocket components

```typescript
<RealtimeErrorBoundary componentName="GameSession">
  <RealtimeComponent />
</RealtimeErrorBoundary>
```

**Features**:

- Detects network/connection errors
- Special UI for connection issues
- Retry and reload options

## Implementation Status - THE TRUTH

### ✅ What Actually Works (20% Coverage)

1. **Error Boundary Components** (100% - GOOD)
   - All 5 error boundary components are well-built with Sentry integration
   - `BaseErrorBoundary`, `RouteErrorBoundary`, `AsyncBoundary`, `RealtimeErrorBoundary`, `RootErrorBoundary`

2. **Root Protection** (PARTIAL)
   - `app/template.tsx` - SafeRootWrapper wraps client components
   - `components/providers.tsx` - BaseErrorBoundary for provider errors
   - `app/global-error.tsx` - Catches unhandled errors

3. **Protected Routes** (3/15 pages = 20%)
   - `/challenge-hub/[boardId]` - Has RouteErrorBoundary
   - `/play-area/session/[id]` - Has RouteErrorBoundary  
   - `/auth/layout.tsx` - Has BaseErrorBoundary

4. **Test Infrastructure**
   - `/test-error-boundaries` - Works for testing
   - `scripts/add-error-boundaries.js` - EXISTS BUT NOT RUN

### ❌ What's Missing (80% of the app is UNPROTECTED)

#### 1. **CRITICAL: Unprotected Dynamic Routes** (Will crash on bad params)
   - `/join/[sessionId]/page.tsx` - NO error boundary
   - `/products/[slug]/page.tsx` - NO error boundary (doesn't even exist?)
   - These WILL crash the entire app with invalid IDs

#### 2. **ALL Static Pages** (12 pages with ZERO protection)
   - `/` (home) - Complex landing page, NO boundary
   - `/about` - NO boundary
   - `/community` - Heavy data fetching, NO boundary
   - `/play-area` - Game hub, NO boundary
   - `/settings` - Forms and updates, NO boundary
   - `/user` - Profile data, NO boundary
   - `/user/edit` - Form heavy, NO boundary
   - ALL auth pages except layout - NO boundaries

#### 3. **Real-time Components** (Despite having RealtimeErrorBoundary)
   - `PlayerManagement` - Uses presence, NO boundary
   - `TimerControls` - WebSocket updates, NO boundary  
   - `GameControls` - Real-time state, NO boundary
   - ALL components using `usePresence` - NO boundaries
   - ALL components with Supabase subscriptions - NO boundaries

#### 4. **Data Fetching Components** (Will show blank screen on error)
   - `GameSession` - Complex async data, NO AsyncBoundary
   - `BingoBoards` - List fetching, NO boundary
   - `CommunityPage` - Virtual lists, NO boundary
   - ALL components using `useQuery` - NO AsyncBoundary
   - ALL lazy-loaded components - NO AsyncBoundary

#### 5. **ALL Form Components** (Will lose user data on crash)
   - `LoginForm` - NO boundary
   - `SignUpForm` - NO boundary
   - `CreateBoardForm` - NO boundary
   - `EmailUpdateSection` - NO boundary
   - `PasswordUpdateSection` - NO boundary
   - Every single form in the app - NO boundaries

## Usage Guidelines

### When to Use Each Boundary

1. **RootErrorBoundary**: Only in root layout (already done)

2. **RouteErrorBoundary**:

   - All page components
   - Especially dynamic routes
   - Pages with complex state

3. **BaseErrorBoundary**:

   - Feature module roots
   - Complex UI sections
   - Isolated components

4. **AsyncBoundary**:

   - Lazy-loaded components
   - Data fetching components
   - Suspense boundaries

5. **RealtimeErrorBoundary**:
   - WebSocket components
   - Real-time subscriptions
   - Presence tracking
   - Live updates

### Best Practices

1. **Don't Over-Wrap**

   ```typescript
   // ❌ Bad - too many boundaries
   <BaseErrorBoundary>
     <BaseErrorBoundary>
       <BaseErrorBoundary>
         <Component />
       </BaseErrorBoundary>
     </BaseErrorBoundary>
   </BaseErrorBoundary>

   // ✅ Good - strategic placement
   <RouteErrorBoundary>
     <ComplexFeature>
       <RealtimeErrorBoundary>
         <LiveComponent />
       </RealtimeErrorBoundary>
     </ComplexFeature>
   </RouteErrorBoundary>
   ```

2. **Provide Context**

   ```typescript
   // ✅ Good - helps debugging
   <RealtimeErrorBoundary componentName="GameTimer">
   <RouteErrorBoundary routeName="UserProfile">
   ```

3. **Handle Known Errors**

   ```typescript
   // ✅ Good - handle expected errors in component
   try {
     await riskyOperation();
   } catch (error) {
     setError(error);
     return <ErrorState />;
   }
   ```

4. **Reset Strategies**

   ```typescript
   // Reset on dependency change
   <BaseErrorBoundary resetKeys={[userId, sessionId]}>

   // Reset on route change (automatic with RouteErrorBoundary)
   ```

## Testing

### Manual Testing

1. Visit `/test-error-boundaries`
2. Click buttons to trigger different error types
3. Verify error boundaries catch and display correctly
4. Test reset functionality

### Unit Testing

```typescript
import { render, screen } from '@testing-library/react';
import { BaseErrorBoundary } from '@/components/error-boundaries';

const ThrowError = () => {
  throw new Error('Test error');
};

test('catches and displays errors', () => {
  render(
    <BaseErrorBoundary>
      <ThrowError />
    </BaseErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Monitoring

### Error Logging

All error boundaries log to `logger.error()` with:

- Error message and stack
- Component stack
- Error ID
- URL and timestamp
- Error count

### Production Considerations

1. Connect logger to error tracking service (Sentry, etc.)
2. Monitor error boundary triggers
3. Set up alerts for high error rates
4. Track error IDs for support

## Real Migration Status

### ✅ Done (20%)
- [x] Create error boundary components (100%)
- [x] Add SafeRootWrapper to template.tsx
- [x] Protect Providers component  
- [x] Add to 2 critical routes (out of 15+)
- [x] Create test page
- [x] Set up Sentry integration

### ❌ Not Done (80%)
- [ ] Add to 13+ unprotected routes
- [ ] Wrap ANY real-time components
- [ ] Protect ANY forms
- [ ] Add AsyncBoundary to data fetching
- [ ] Run the existing migration script

## IMMEDIATE Actions Required (In Order)

### Phase 1: Prevent Crashes (1 hour)
1. **Run the damn script**:
   ```bash
   node scripts/add-error-boundaries.js
   ```
   This will add RouteErrorBoundary to all pages automatically.

2. **Manually fix dynamic routes** (they WILL crash):
   ```typescript
   // /join/[sessionId]/page.tsx
   export default function JoinPage({ params }: Props) {
     return (
       <RouteErrorBoundary routeName="Join">
         <AsyncBoundary loadingMessage="Loading session...">
           {/* existing content */}
         </AsyncBoundary>
       </RouteErrorBoundary>
     );
   }
   ```

### Phase 2: Protect Real-time Features (2 hours)
1. Find all `usePresence` usage:
   ```bash
   grep -r "usePresence" src/
   ```
   
2. Wrap each with RealtimeErrorBoundary:
   ```typescript
   <RealtimeErrorBoundary componentName="PlayerList">
     <PlayerManagement />
   </RealtimeErrorBoundary>
   ```

### Phase 3: Protect Data Fetching (2 hours)
1. Find all `useQuery` usage:
   ```bash
   grep -r "useQuery" src/
   ```

2. Wrap with AsyncBoundary:
   ```typescript
   <AsyncBoundary loadingMessage="Loading boards...">
     <BingoBoardsList />
   </AsyncBoundary>
   ```

### Phase 4: Protect Forms (1 hour)
Add BaseErrorBoundary to all form components to prevent data loss.

## The Harsh Reality

**Current State**: Your app WILL crash in production when:
- User navigates to `/join/invalid-id`
- Any WebSocket connection fails
- Any API call throws an unexpected error
- Any form component has a render error

**Time to Fix**: 6-8 hours of focused work
**Current Coverage**: 20%
**Required Coverage**: 80% minimum for production

## Stop Reading, Start Doing

1. Run `node scripts/add-error-boundaries.js` RIGHT NOW
2. Fix the 2 dynamic routes manually
3. Add boundaries to real-time components
4. Deploy and monitor Sentry for what we missed

## Common Patterns

### Pattern 1: Page with Async Data

```typescript
export default function ProductPage({ params }: Props) {
  return (
    <RouteErrorBoundary routeName="Product">
      <AsyncBoundary loadingMessage="Loading product...">
        <ProductDetails id={params.id} />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
```

### Pattern 2: Real-time Feature

```typescript
export function GameSession({ sessionId }: Props) {
  return (
    <RealtimeErrorBoundary componentName="GameSession">
      <PresenceProvider>
        <GameBoard />
        <PlayerList />
        <ChatPanel />
      </PresenceProvider>
    </RealtimeErrorBoundary>
  );
}
```

### Pattern 3: Complex Form

```typescript
export function SettingsForm() {
  return (
    <BaseErrorBoundary level="component">
      <form onSubmit={handleSubmit}>
        {/* form fields */}
      </form>
    </BaseErrorBoundary>
  );
}
```

## Conclusion

Error boundaries are now the first line of defense against production crashes. The implementation provides:

1. **Complete coverage** at root level
2. **Strategic placement** at route and component levels
3. **Specialized handling** for async and real-time components
4. **Developer experience** with detailed error information
5. **User experience** with graceful error handling

The remaining work is mechanical - adding boundaries to the rest of the application following the patterns established here.
