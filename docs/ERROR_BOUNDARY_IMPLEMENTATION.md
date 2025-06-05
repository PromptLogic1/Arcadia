# Error Boundary Implementation Guide

**Created**: January 2025  
**Status**: Implemented  
**Priority**: Critical for Production

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

## Implementation Status

### ✅ Completed

1. **Root Level Protection**

   - `app/layout.tsx` - RootErrorBoundary wraps entire app
   - `components/providers.tsx` - BaseErrorBoundary for provider errors

2. **Critical Dynamic Routes**

   - `/challenge-hub/[boardId]` - Board editing (async data)
   - `/play-area/session/[id]` - Game sessions (real-time)
   - `/auth/layout.tsx` - Auth flow protection

3. **Test Page**
   - `/test-error-boundaries` - Interactive testing page

### 🚧 Still Needed (Priority Order)

1. **Remaining Dynamic Routes**

   ```typescript
   // Add RouteErrorBoundary to:
   -/join/[sessionId] / page.tsx - /products/[slug] / page.tsx;
   ```

2. **High-Risk Feature Components**

   ```typescript
   // Wrap with RealtimeErrorBoundary:
   - PlayerManagement component
   - TimerControls component
   - Any component using usePresence hook
   - Any component with WebSocket subscriptions
   ```

3. **Form Components**

   ```typescript
   // Wrap with BaseErrorBoundary:
   - CreateBoardForm
   - LoginForm
   - SignUpForm
   - All settings forms
   ```

4. **Async Data Components**
   ```typescript
   // Use AsyncBoundary for:
   - Components with useQuery
   - Dynamic imports
   - Lazy-loaded components
   ```

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

## Migration Checklist

- [x] Create error boundary components
- [x] Add RootErrorBoundary to app layout
- [x] Protect Providers component
- [x] Add to critical dynamic routes
- [x] Create test page
- [x] Document implementation
- [ ] Add to remaining routes (use script)
- [ ] Wrap high-risk components
- [ ] Add to all forms
- [ ] Set up error tracking service
- [ ] Train team on usage

## Next Steps

1. Run the migration script:

   ```bash
   node scripts/add-error-boundaries.js
   ```

2. Manually review and add boundaries to:

   - Components using real-time features
   - Complex form components
   - Data-heavy list components

3. Set up production error tracking

4. Monitor and refine based on actual errors

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
