# CLAUDE.md - AI Assistant Critical Instructions

**WARNING**: This codebase has serious issues. Read this entire document before making ANY changes.

## 🚨 CRITICAL: Current Project Reality

**Last Updated**: January 2025  
**Actual Status**: Pre-Production with Critical Blockers  
**Time to Production**: 3-4 months MINIMUM

### The Truth About This Codebase

1. **NOT Production Ready** - Will crash under real usage
2. **97+ TypeScript Errors** - Not "1 remaining" as claimed elsewhere
3. **0% Test Coverage** - No meaningful tests exist
4. **No Error Boundaries** - Any JS error crashes entire app
5. **Multiple Security Holes** - No API validation, no rate limiting
6. **Performance Issues** - 2.4MB bundle, no optimization

## Most Important Rules for AI Assistants

### 1. NEVER Add New Features

**Current Priority**: Fix the foundation ONLY. The app will crash in production without these fixes:

- Error boundaries (critical)
- React hook dependency fixes
- Service layer standardization
- Test coverage
- TypeScript error resolution

### 2. Type Safety is Non-Negotiable

- **NO `any` TYPES** - Fix them, don't add them
- **NO Type Assertions** unless absolutely necessary with explanation
- **NO `@ts-ignore`** - Fix the actual problem
- Currently 97+ errors need fixing - don't add more

### 3. Follow Existing Patterns (When They're Correct)

**Correct Pattern (60% of codebase)**:

```typescript
// Service Layer (Pure Functions)
export const someService = {
  async getData(): Promise<ServiceResponse<Data>> {
    // API calls only, no state
  },
};

// Zustand Store (UI State Only)
export const useSomeStore = create<State>()(set => ({
  // UI state only, NO server data
}));

// TanStack Query (Server State)
export const useDataQuery = () => {
  return useQuery({
    queryKey: ['data'],
    queryFn: () => someService.getData(),
  });
};
```

**DO NOT** follow the 40% that violates these patterns.

### 4. Database Operations - Use MCP Server

**IMPORTANT**: We use Supabase MCP Server, NOT the CLI.

```bash
# DON'T use these CLI commands:
# npm run db:migrate
# npm run db:types

# DO use MCP server commands:
# mcp__supabase__apply_migration
# mcp__supabase__generate_typescript_types
```

Always regenerate types after schema changes using `mcp__supabase__generate_typescript_types`.

### 5. Before Making ANY Change

Ask yourself:

1. Does this fix a critical production blocker?
2. Does this add test coverage?
3. Does this improve type safety?
4. Does this follow the correct 60% pattern?

If NO to all → DON'T DO IT.

## Current Critical Issues You MUST Know

### 🔴 CRITICAL - Will Crash in Production

1. **No Error Boundaries**

   - Location: Entire app
   - Impact: Any error = white screen of death
   - Fix: Implement ErrorBoundary components

2. **React Hook Bugs**

   - Location: `useTimer`, `usePresence`, `useSessionGame`, others
   - Impact: Stale closures, random failures
   - Fix: Add proper dependencies

3. **Memory Leaks**
   - Location: Real-time subscriptions
   - Impact: Server/browser crash
   - Fix: Cleanup in useEffect returns

### 🟡 HIGH - Will Cause User Abandonment

1. **Bundle Size**: 2.4MB (target: <500KB)
2. **No Virtualization**: Lists die with 100+ items
3. **No API Validation**: Security holes everywhere
4. **No Loading States**: Users think app is frozen

## The REAL Development Phases

### Phase 0: Fix Critical Issues (CURRENT - MANDATORY)

**Status**: NOT STARTED  
**Timeline**: 3-4 months before anything else

1. **Weeks 1-2**: Prevent crashes

   - [ ] Error boundaries everywhere
   - [ ] Fix React hook dependencies
   - [ ] Remove DOM manipulation
   - [ ] Basic error tracking

2. **Weeks 3-4**: Basic stability

   - [ ] Service error standardization
   - [ ] Fix all TypeScript errors
   - [ ] Remove console.logs
   - [ ] Write first tests

3. **Weeks 5-8**: Make it testable

   - [ ] Service layer tests (100%)
   - [ ] Critical hook tests
   - [ ] API route tests
   - [ ] CI/CD setup

4. **Weeks 9-12**: Performance & Security
   - [ ] Bundle optimization
   - [ ] Add virtualization
   - [ ] API validation
   - [ ] Security audit

### Future Phases (ONLY After Foundation Fixed)

- Phase 1: Complete half-implemented features
- Phase 2: Real-time (properly, without memory leaks)
- Phase 3: Maybe new features (1+ year away)

## What You Should Actually Do

### When Asked to Add Features

**Response**: "This codebase needs critical fixes before new features. Implementing features now will crash in production. See PRODUCTION_REMEDIATION_PLAN.md"

### When Asked to Fix Something

1. Check if it's in the critical fixes list
2. Write tests for what you fix
3. Follow the correct patterns (not the broken ones)
4. Update documentation

### When Working with Database

```typescript
// Always use MCP server for migrations
await mcp__supabase__apply_migration({
  project_id: 'your-project-id',
  name: 'fix_critical_issue',
  query: 'YOUR SQL HERE',
});

// Always regenerate types after changes
await mcp__supabase__generate_typescript_types({
  project_id: 'your-project-id',
});

// Use generated types from types/database-generated.ts
import { Tables } from '@/types/database-generated';
```

## Essential Commands (What Actually Works)

### Development

```bash
npm run dev           # Works, but expect console errors
npm run build         # FAILS - 97+ TypeScript errors
npm run lint          # Shows 40+ warnings we're ignoring
npm run type-check    # Shows 97+ errors
npm test              # Runs, but no tests exist
```

### Database Operations - USE MCP SERVER ONLY

```bash
# DO NOT use CLI commands - they're deprecated
# Use MCP server functions instead:

mcp__supabase__list_projects         # Get project list
mcp__supabase__apply_migration       # Apply schema changes
mcp__supabase__generate_typescript_types  # Generate types
mcp__supabase__execute_sql           # Run queries
mcp__supabase__get_logs             # Debug issues
```

**Critical**: ALWAYS regenerate types after ANY schema change:

```typescript
// After migration, immediately run:
mcp__supabase__generate_typescript_types({ project_id: 'xxx' });
```

### What You'll Actually Need to Fix First

```bash
# These commands currently fail or show issues:
npm run build         # Fix 97+ TypeScript errors first
npm run lint          # Fix 40+ warnings
npm test              # Write actual tests
npm run type-check    # Same 97+ errors
```

## Architecture Overview (Good Ideas, Poor Execution)

### Tech Stack (Good Choices)

- **Next.js 15** - Good choice, poorly utilized
- **TypeScript** - "Strict mode" with 97+ errors
- **Supabase** - Good, but RLS policies need audit
- **Zustand + TanStack Query** - Excellent pattern (60% correct implementation)
- **Tailwind CSS v4** - Good, but 2.4MB bundle size
- **shadcn/ui** - Good, but inconsistently used

### Project Structure (The Reality)

```
src/
├── app/              # Half follow new patterns
├── features/         # Good idea, messy execution
│   ├── auth/        # 15+ components for login
│   ├── bingo-boards/# 3000+ lines of tangled code
│   └── ...          # Inconsistent patterns
├── components/      # "Shared" but barely reused
├── lib/            # Dumping ground
│   ├── stores/     # Mix of patterns
│   └── supabase.ts # Works, but no error handling
├── hooks/          # Should be in features
└── types/          # Competing with generated types

types/              # Generated types (when it works)
```

### Architectural Patterns (Follow the Good 60%)

**CORRECT Pattern**:

```typescript
// 1. Service Layer - Pure functions, no state
export const userService = {
  async getUser(id: string): Promise<ServiceResponse<User>> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  },
};

// 2. Zustand Store - UI state only
export const useUIStore = create<UIState>()(set => ({
  isModalOpen: false,
  setModalOpen: open => set({ isModalOpen: open }),
}));

// 3. TanStack Query - Server state
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUser(id),
    staleTime: 5 * 60 * 1000,
  });
};
```

**WRONG Pattern (40% of codebase)**:

- Zustand stores holding server data
- Direct Supabase calls in components
- useEffect for data fetching
- Mixed UI and server state

### Critical Development Rules

1. **Fix Before Feature**: NO new features until foundation is fixed
2. **Type Safety**: NO `any` types, NO `@ts-ignore`, fix the 97+ errors
3. **Test Everything**: Write tests for EVERY fix
4. **Follow Good Patterns**: Use the 60% that's correct, not the 40% that's broken
5. **Use MCP Server**: Database operations via MCP, not CLI

### State Management (When Done Right)

**Service → Query → Component** (NO shortcuts)

```typescript
// ✅ RIGHT: Service layer
const userService = {
  getUser: (id: string) => supabase.from('users').select(),
};

// ✅ RIGHT: TanStack Query for server state
const useUser = (id: string) =>
  useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUser(id),
  });

// ✅ RIGHT: Zustand for UI state only
const useUIStore = create(() => ({
  modalOpen: false,
}));

// ❌ WRONG: Everything else in the codebase
```

## Common Issues You'll Encounter

### When You See Console Errors

```typescript
// You'll see 40+ of these:
console.log('Join by code not fully implemented yet');
console.error('Failed to create session:', error);

// Fix: Use proper logging
import { logger } from '@/lib/logger';
logger.error('Session creation failed', { error, userId });
```

### When You Hit TypeScript Errors

```typescript
// You'll see 97+ of these:
// @ts-ignore
const someValue = data as any;

// Fix: Define proper types
interface Data {
  id: string;
  // ... actual properties
}
```

### When You Find Stale Closures

```typescript
// Common in timer/subscription hooks:
useEffect(() => {
  const timer = setInterval(() => {
    doSomething(); // Stale closure!
  }, 1000);
}, []); // Missing deps

// Fix: Add dependencies
useEffect(() => {
  const timer = setInterval(() => {
    doSomething();
  }, 1000);
  return () => clearInterval(timer);
}, [doSomething]); // Fixed
```

## Testing Reality

**Current State**: 0% test coverage
**What Exists**: Jest configured, no actual tests
**What's Needed**: Everything

### When Writing Tests (You Must)

```typescript
// Every service needs tests
describe('AuthService', () => {
  it('should handle login errors', async () => {
    // Mock, test, assert
  });
});

// Every hook needs tests
describe('useTimer', () => {
  it('should not have stale closures', () => {
    // Test the fixed version
  });
});
```

## Documentation (Updated to Reality)

### What's Actually Accurate

- `README.md` - Now shows the truth
- `PROJECT_STATUS.md` - Real metrics
- `DEVELOPMENT_ROADMAP.md` - Realistic timeline
- `PRODUCTION_REMEDIATION_PLAN.md` - Your bible

### What's Fantasy

- Most of `/docs/history/` - Past lies
- Claims of "95% complete"
- "Production ready" anywhere
- "0 TypeScript errors"

## Final Instructions

1. **Read `PRODUCTION_REMEDIATION_PLAN.md`** - This is your guide
2. **Fix critical issues first** - No exceptions
3. **Write tests for everything** - No excuses
4. **Follow the good 60%** - Not the broken 40%
5. **Be honest about problems** - No sugarcoating

### Your Response to Feature Requests

"This codebase requires critical stabilization before new features. Adding features now will result in production failures. Please refer to PRODUCTION_REMEDIATION_PLAN.md for the required fixes. Estimated timeline: 3-4 months."

### Your Daily Checklist

- [ ] Am I fixing a critical issue?
- [ ] Am I writing tests?
- [ ] Am I following correct patterns?
- [ ] Am I using MCP server for DB operations?
- [ ] Am I being honest about the state of things?

If any answer is NO, stop and reconsider.

---

**Remember**: Good architecture, terrible implementation. Fix the implementation using the good architecture. 3-4 months of hard work ahead.
