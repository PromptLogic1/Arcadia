# Zustand + TanStack Query Migration Guide

This document outlines the new architectural pattern implemented in Arcadia for state management and data fetching.

## Architecture Overview

The new pattern separates concerns between:

- **Zustand**: Pure state management (UI state, local preferences)
- **TanStack Query**: Data fetching, caching, and server synchronization
- **Service Layer**: Pure functions for API calls

## Before vs After

### Before: Mixed Pattern (Problematic)

```typescript
// ❌ Old: Service methods in Zustand stores
const authStore = {
  user: null,
  initializeApp: async () => {
    /* complex API logic */
  },
  signIn: async () => {
    /* more API calls */
  },
  // State and service methods mixed together
};

// ❌ Old: Manual loading states in components
const Component = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await supabase.from('table').select();
        setData(response.data);
      } catch (error) {
        // Manual error handling
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
};
```

### After: Clean Separation (New Pattern)

```typescript
// ✅ New: Clean state-only Zustand
const authStore = {
  user: null,
  isAuthenticated: false,
  setUser: (user) => { /* pure state update */ }
}

// ✅ New: Service layer with pure functions
export const authService = {
  async getCurrentUser() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error: error?.message };
  }
}

// ✅ New: TanStack Query hooks
export function useCurrentUserQuery() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

// ✅ New: Clean component with automatic loading/error states
const Component = () => {
  const { data, isLoading, error } = useCurrentUserQuery();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  return <UserProfile user={data.user} />;
}
```

## New Structure

```
src/
├── services/
│   ├── auth.service.ts          # Pure API functions
│   ├── bingo-cards.service.ts   # No state management
│   └── sessions.service.ts      # Only data fetching
├── lib/stores/
│   ├── auth-store.ts           # State only
│   ├── sessions-store.ts       # UI state only
│   └── index.ts                # Exports
├── hooks/queries/
│   ├── useAuthQueries.ts       # TanStack Query hooks
│   ├── useSessionsQueries.ts   # Data fetching hooks
│   └── index.ts                # Query keys
```

## Key Benefits

### 1. Automatic Caching

```typescript
// ✅ Automatic caching - no manual cache management
const { data } = useCardsQuery(['card1', 'card2']);
// Second call with same IDs = instant from cache
const { data: cached } = useCardsQuery(['card1', 'card2']);
```

### 2. Background Refetching

```typescript
// ✅ Data stays fresh automatically
const { data } = useActiveSessionsQuery(filters, {
  refetchInterval: 30 * 1000, // Auto-refresh every 30s
  staleTime: 1 * 60 * 1000, // Consider stale after 1 min
});
```

### 3. Optimistic Updates

```typescript
// ✅ Instant UI updates with rollback on error
const voteCardMutation = useMutation({
  mutationFn: voteCard,
  onMutate: async cardId => {
    // Immediately update UI
    queryClient.setQueryData(['card', cardId], old => ({
      ...old,
      votes: old.votes + 1,
    }));
  },
  onError: (error, cardId, context) => {
    // Rollback on error
    queryClient.setQueryData(['card', cardId], context.previousData);
  },
});
```

### 4. Error Boundaries & Retry Logic

```typescript
// ✅ Centralized error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.status === 401) return false; // Don't retry auth errors
        return failureCount < 3;
      },
    },
  },
});
```

## Migration Examples

### Example 1: Sessions (Complete Migration)

**Service Layer:**

```typescript
// src/services/sessions.service.ts
export const sessionsService = {
  async getActiveSessions(filters, page, limit) {
    const supabase = createClient();
    // Pure data fetching logic
    return { sessions: data, totalCount: count };
  },
};
```

**Zustand Store (State Only):**

```typescript
// src/lib/stores/sessions-store.ts
const useSessionsStore = {
  showJoinDialog: false,
  filters: { search: '', gameType: 'all' },
  setShowJoinDialog: show => set({ showJoinDialog: show }),
  setFilters: filters =>
    set(state => ({
      filters: { ...state.filters, ...filters },
    })),
};
```

**TanStack Query Hooks:**

```typescript
// src/hooks/queries/useSessionsQueries.ts
export function useActiveSessionsQuery(filters) {
  return useQuery({
    queryKey: ['sessions', 'active', filters],
    queryFn: () => sessionsService.getActiveSessions(filters),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}
```

**Component Usage:**

```typescript
// src/components/PlayAreaHub.tsx
const PlayAreaHub = () => {
  // UI state from Zustand
  const { filters, showJoinDialog } = useSessionsState();
  const { setFilters, setShowJoinDialog } = useSessionsActions();

  // Data from TanStack Query
  const { data, isLoading, refetch } = useActiveSessionsQuery(filters);
  const joinMutation = useJoinSessionMutation();

  // Clean, declarative component logic
};
```

## Integration with Supabase MCP

The new pattern works seamlessly with Supabase MCP:

```typescript
// ✅ Service layer compatible with MCP
export const authService = {
  async getCurrentUser() {
    // Can use either:
    const supabase = createClient(); // Direct client
    // OR
    // Use MCP functions for advanced operations
    return { user: data, error };
  },
};
```

## Testing Strategy

### Mock Services (Easy)

```typescript
// ✅ Easy to mock pure functions
jest.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: jest.fn(() => ({ user: mockUser })),
  },
}));
```

### Mock TanStack Query

```typescript
// ✅ Mock query responses
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

// Render with mocked data
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);
```

## Migration Checklist

- [x] ✅ Install and configure TanStack Query
- [x] ✅ Create service layer (`src/services/`)
- [x] ✅ Create query hooks (`src/hooks/queries/`)
- [x] ✅ Update Zustand stores (remove service methods)
- [x] ✅ Create example migration (sessions)
- [ ] 🚧 Migrate remaining components
- [ ] 🚧 Add error boundaries
- [ ] 🚧 Optimize caching strategies

## Performance Improvements

1. **Automatic Request Deduplication**: Same queries are automatically deduplicated
2. **Background Updates**: Data refreshes in background without loading states
3. **Intelligent Caching**: Configurable stale time and cache time
4. **Bundle Size**: Tree-shakeable imports reduce bundle size

## Next Steps

1. **Migrate PlayAreaHub**: Complete migration of complex component
2. **Real-time Integration**: Combine with Supabase real-time subscriptions
3. **Error Boundaries**: Add React error boundaries for query errors
4. **DevTools**: Use React Query DevTools for debugging

This pattern provides a solid foundation for scalable, maintainable data fetching in the Arcadia application.
