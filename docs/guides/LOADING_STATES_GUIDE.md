# Loading States Implementation Guide

## Overview

Loading states are critical for providing a smooth user experience. This guide outlines the loading state patterns implemented across the Arcadia application.

## Implementation Status

### ✅ Completed

1. **Base Components Created**

   - `LoadingSpinner` - Animated spinner with size and color variants
   - `Skeleton` - Placeholder for content being loaded
   - `loading-states.tsx` - Collection of reusable loading patterns

2. **Components with Loading States**

   - Community component (discussions and events)
   - PlayAreaHub (session listings)
   - BingoBoardsHub (board grid with skeletons)
   - Settings page (skeleton placeholders)

3. **Patterns Established**
   - TanStack Query integration (`isLoading`, `isPending`, `isFetching`)
   - Skeleton screens for initial loads
   - Inline spinners for actions
   - Empty states with clear messaging

### ⚠️ In Progress

1. **Additional Components Need Loading States**

   - User profile pages
   - Board edit pages
   - Session game view
   - Authentication forms

2. **Advanced Patterns**
   - Optimistic updates
   - Progressive loading
   - Stale-while-revalidate indicators

## Loading State Patterns

### 1. Page Loading

Use `PageLoadingState` for full-page loads:

```tsx
import { PageLoadingState } from '@/components/ui/loading-states';

if (isLoading) {
  return <PageLoadingState />;
}
```

### 2. List Loading

Use skeleton lists for data grids:

```tsx
import { ListLoadingState } from '@/components/ui/loading-states';

if (isLoading) {
  return <ListLoadingState count={5} />;
}
```

### 3. Inline Loading

For button actions or small areas:

```tsx
import { InlineLoadingState } from '@/components/ui/loading-states';

<Button disabled={isSubmitting}>
  {isSubmitting ? <InlineLoadingState text="Saving..." /> : 'Save'}
</Button>;
```

### 4. Grid Loading

For image grids or card layouts:

```tsx
import { GridLoadingState } from '@/components/ui/loading-states';

if (isLoading) {
  return <GridLoadingState columns={3} count={6} />;
}
```

### 5. Empty States

When no data is available:

```tsx
import { EmptyState } from '@/components/ui/loading-states';
import { Grid } from 'lucide-react';

<EmptyState
  icon={Grid}
  title="No boards found"
  description="Create your first board to get started"
  action={<Button>Create Board</Button>}
/>;
```

## Best Practices

### 1. Always Show Loading States

Never leave users wondering if something is happening:

```tsx
// ❌ Bad
const { data } = useQuery(...);
return <div>{data?.items.map(...)}</div>;

// ✅ Good
const { data, isLoading } = useQuery(...);
if (isLoading) return <ListLoadingState />;
return <div>{data?.items.map(...)}</div>;
```

### 2. Match Loading State to Content

The loading state should resemble the final content:

```tsx
// ❌ Bad - Generic spinner for a card grid
if (isLoading) return <LoadingSpinner />;

// ✅ Good - Skeleton grid matching final layout
if (isLoading) return <GridLoadingState columns={3} />;
```

### 3. Handle All States

Always handle loading, error, and empty states:

```tsx
const { data, isLoading, error } = useQuery(...);

if (isLoading) return <ListLoadingState />;
if (error) return <ErrorLoadingState error={error.message} onRetry={refetch} />;
if (!data?.length) return <EmptyState title="No items found" />;

return <ItemList items={data} />;
```

### 4. Differentiate Initial Load vs Refetch

Show different UI for initial loads vs background refreshes:

```tsx
const { isLoading, isFetching } = useQuery(...);

// Full skeleton on initial load
if (isLoading) return <ListLoadingState />;

return (
  <>
    <ItemList />
    {/* Subtle indicator for background refresh */}
    {isFetching && <InlineLoadingState text="Refreshing..." />}
  </>
);
```

### 5. Optimistic Updates

For better perceived performance:

```tsx
const mutation = useMutation({
  mutationFn: updateItem,
  onMutate: async newItem => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['items']);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['items']);

    // Optimistically update
    queryClient.setQueryData(['items'], old => [...old, newItem]);

    return { previous };
  },
  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(['items'], context.previous);
  },
});
```

## Component Examples

### TanStack Query Integration

```tsx
function MyComponent() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  if (isLoading) {
    return <ListLoadingState count={3} />;
  }

  if (error) {
    return <ErrorLoadingState error={error.message} onRetry={refetch} />;
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={Package}
        title="No items yet"
        description="Add your first item to get started"
        action={<Button>Add Item</Button>}
      />
    );
  }

  return <ItemList items={data} />;
}
```

### Form with Loading States

```tsx
function MyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async data => {
    setIsSubmitting(true);
    try {
      await submitForm(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input disabled={isSubmitting} />
      <Button disabled={isSubmitting}>
        {isSubmitting ? <InlineLoadingState text="Saving..." /> : 'Save'}
      </Button>
    </form>
  );
}
```

## Performance Considerations

1. **Lazy Load Heavy Components**

   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <CardLoadingState />,
   });
   ```

2. **Debounce Loading States**
   Don't show loading states for very quick operations:

   ```tsx
   const [showLoading, setShowLoading] = useState(false);

   useEffect(() => {
     let timeout;
     if (isLoading) {
       timeout = setTimeout(() => setShowLoading(true), 200);
     } else {
       setShowLoading(false);
     }
     return () => clearTimeout(timeout);
   }, [isLoading]);
   ```

3. **Use Suspense Boundaries**
   ```tsx
   <Suspense fallback={<PageLoadingState />}>
     <MyAsyncComponent />
   </Suspense>
   ```

## Accessibility

1. **Always include loading announcements**:

   ```tsx
   <div role="status" aria-label="Loading content">
     <LoadingSpinner />
     <span className="sr-only">Loading...</span>
   </div>
   ```

2. **Announce content changes**:
   ```tsx
   <div aria-live="polite" aria-busy={isLoading}>
     {isLoading ? <LoadingState /> : <Content />}
   </div>
   ```

## Future Enhancements

1. **Skeleton Animation Variants**

   - Pulse, wave, shimmer effects
   - Customizable animation speeds

2. **Progressive Loading**

   - Load critical content first
   - Stream in additional data

3. **Smart Loading States**

   - Remember previous content during refresh
   - Show stale content with refresh indicator

4. **Loading State Analytics**
   - Track how long users wait
   - Identify slow-loading areas
