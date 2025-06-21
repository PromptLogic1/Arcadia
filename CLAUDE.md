# CLAUDE.md - Arcadia Development Guidelines

**Critical**: This document defines mandatory rules for AI assistants and developers working on this codebase.

## Agent Performance Guidelines

### 1. File Operations

- **Complete File Reading**: MANDATORY
  - Read entire files before modifications
  - Use `read_file` with `should_read_entire_file: true` when needed
  - Understand complete context before changes
  - Prevent duplicate code and pattern violations

### 2. Tool Usage Optimization

- **Search Operations**:

  - Use `codebase_search` for semantic understanding
  - Use `grep_search` for exact matches
  - Use `file_search` for quick file location
  - Combine tools strategically for complete context

- **Code Modifications**:
  - Prefer `edit_file` for files under 2500 lines
  - Use `search_replace` for larger files
  - Always verify changes with proper tool selection
  - Use `reapply` only when initial edit fails

### 3. Memory Management

- **Knowledge Persistence**:
  - Use `update_memory` for important patterns
  - Delete outdated memories immediately
  - Update memories when contradicted
  - Cite memories using [text][memory:ID]] format

### 4. Error Prevention

- **Validation Steps**:
  - Verify file existence before operations
  - Check file contents before modifications
  - Validate tool parameters thoroughly
  - Handle edge cases explicitly

## Project Status

- **Phase**: Pre-Production (85% ready) 🚀
- **Timeline**: 1-2 weeks to production
- **Priority**: Infrastructure fixes only (type safety COMPLETE!)

## Core Rules

### 1. Type Safety (Non-Negotiable)

- **NO** `any` or type assertions (`as SomeType`)
- **ONLY** `as const` is allowed
- **ALL** values strictly typed at compiler level
- **USE** `/types/database.types.ts` as single source of truth for DB types

### 2. Validation

- **ONLY** Zod for input validation
- **ALL** schemas centralized in `/lib/validation/schemas/`
- **MUST** validate at API boundaries
- **NO** implicit assumptions

### 3. State Management Pattern

```typescript
// Service Layer - Pure functions, no state
export const service = {
  async getData(): Promise<ServiceResponse<Data>> {
    // Database operations only
    // Validate with Zod
    // Return ServiceResponse
  },
};

// UI State - Zustand (98% compliant ✅ EXEMPLARY)
export const useUIStore = createWithEqualityFn<UIState>()(
  devtools(
    set => ({
      // UI state ONLY - no server data
    }),
    { name: 'ui-store' }
  ),
  useShallow
);

// Server State - TanStack Query v5
export const useDataQuery = () => {
  return useQuery({
    queryKey: ['data'],
    queryFn: () => service.getData(),
    staleTime: 5 * 60 * 1000,
    select: res => (res.success ? res.data : null),
  });
};
```

### 4. Architecture Requirements

#### Database Operations

```bash
# Use Supabase MCP commands only:
mcp__supabase__apply_migration      # DDL operations
mcp__supabase__execute_sql          # DML operations
mcp__supabase__generate_typescript_types
# Project: cnotiupdqbdxxxjrcqvb (EU de-fra-1)
```

#### Error Handling & Monitoring

- **Sentry**: Fully integrated with 99% error boundary coverage ✅
- **Logger**: Use `log` from `@/lib/logger` (NO console.log)
- **Boundaries**: RootError, RouteError, RealtimeError, AsyncBoundary

#### Infrastructure

- **Redis/Upstash**: ✅ FULLY IMPLEMENTED - Production-ready distributed cache and rate limiting
- **Rate Limiting**: ✅ COMPLETE - Multiple algorithms (sliding window, fixed window, token bucket)
- **Cache**: ✅ COMPLETE - Distributed Redis cache with TTL and invalidation patterns
- **Queue**: BullMQ for jobs, Vercel Cron/QStash for serverless
- **Error Boundaries**: Wrap all critical UI paths

### 5. Zustand Pattern (98/100 Compliant ✅)

```typescript
// REQUIRED: Modern store creation
export const useAppStore = createWithEqualityFn<AppStore>()(
  devtools(
    set => ({
      // UI state ONLY - no server data
      isModalOpen: false,
      setModalOpen: open =>
        set({ isModalOpen: open }, false, 'app/setModalOpen'),
    }),
    { name: 'app-store' }
  ),
  useShallow
);

// REQUIRED: Split selectors for performance
export const useAppState = () => useAppStore(useShallow(s => s.state));
export const useAppActions = () => useAppStore(useShallow(s => s.actions));
```

**Rules**:

- UI state only (server data → TanStack Query)
- Use `createWithEqualityFn` + `devtools` + `useShallow`
- Split state/actions selectors
- Auth store exception documented in code

### 6. UI Development

- **Styling**: Tailwind CSS v4 only
- **Components**: shadcn/ui exclusively, import new UI files if needed with the CLI (`npx shadcn@latest add`)
- **Requirements**: Responsive, accessible, dark-mode compatible

## Development Principles

### 1. Code Quality & Comprehension

- **Read Entire Files**: MANDATORY - Read complete files before modifications

  - Prevents code duplication
  - Ensures architectural consistency
  - Avoids misunderstandings of existing patterns
  - Required for maintaining type safety

- **Code Organization**:
  - Separate files for distinct concerns
  - Follow established naming conventions
  - Maintain reasonable file sizes
  - Optimize for readability over cleverness
  - Document complex logic and architectural decisions

### 2. Development Process

- **Commit Strategy**: Early and frequent

  - Break large tasks into logical milestones
  - Commit after user confirmation of each milestone
  - Prevents loss of work if issues arise
  - Enables easier rollback if needed

- **Task Management**:
  - Break down large/vague tasks into subtasks
  - Get clarity before implementation
  - Push back on unclear requirements
  - Create and get approval for implementation plan

### 3. Quality Assurance

- **Linting**: Run after major changes

  - Catch syntax errors early
  - Ensure method usage correctness
  - Maintain code style consistency
  - Prevent file corruption

- **Library Usage**:
  - Verify latest syntax via Perplexity (preferred) or web search
  - Never skip libraries due to "not working"
  - Solve root causes of integration issues
  - Follow library-specific best practices

### 4. Implementation Standards

- **No Dummy Implementations**:

  - Deliver production-ready code
  - No placeholder functionality
  - Complete feature implementation
  - Proper error handling and edge cases

- **UI/UX Excellence**:
  - Aesthetically pleasing designs
  - Intuitive user interfaces
  - Smooth micro-interactions
  - Follow established patterns
  - Proactive about user delight

### 5. Architectural Discipline

- **Before Coding**:

  1. Understand current architecture
  2. Identify files to modify
  3. Create detailed implementation plan
  4. Consider edge cases
  5. Get user approval

- **During Development**:
  - No large refactors without explicit approval
  - Maintain existing patterns
  - Fix root causes of issues
  - Follow type safety rules

## Tech Stack (Updated 2025-06-19)

| Layer                      | Library                   | Version                        |
| -------------------------- | ------------------------- | ------------------------------ |
| **Framework**              | React                     | 19.0.0                         |
|                            | Next.js (App Router)      | 15.3.3                         |
| **Language & Tooling**     | TypeScript                | 5.7.2 (strict)                 |
|                            | ESLint                    | 9.29.0 (flat)                  |
|                            | @typescript-eslint        | 8.34.1                         |
|                            | Prettier                  | 3.5.3 + tailwind-plugin 0.6.12 |
| **State & Data**           | TanStack Query            | 5.80.7                         |
|                            | Zustand                   | 5.0.5                          |
|                            | Zod                       | 3.25.64                        |
|                            | Supabase JS               | 2.50.0                         |
|                            | @supabase/ssr             | 0.6.1                          |
| **Styling & UI**           | Tailwind CSS              | 4.1.10                         |
|                            | shadcn/ui (Radix v1)      | _latest_                       |
|                            | Radix UI components       | 1.x (see dependencies)         |
| **Monitoring & Tracing**   | @sentry/nextjs            | 9.29.0                         |
|                            | OpenTelemetry API         | 1.9.0                          |
|                            | OpenTelemetry SDK (trace) | 2.0.1                          |
| **Infrastructure Clients** | @upstash/redis            | 1.35.0                         |
|                            | @upstash/ratelimit        | 2.0.5                          |
|                            | @vercel/analytics         | 1.4.1                          |
|                            | @vercel/edge-config       | 1.4.0                          |
|                            | @vercel/speed-insights    | 1.1.0                          |
| **Testing & Quality**      | Jest                      | 29.7.0                         |
|                            | Playwright                | 1.53.0                         |
|                            | Testing Library (react)   | 16.3.0                         |
|                            | jest-dom                  | 6.6.3                          |

## Deployment & Local Development Rule (CRITICAL)

**NEVER run `npm run dev` or start a development server.** The user is always running their own dev server. Starting another one will cause port conflicts and get stuck. Only run build, type-check, lint, or other non-server commands.

**NO LOCAL DEPLOYMENT**: This project is designed for cloud deployment only (Vercel). It is NOT meant to be deployed locally or containerized with Docker. All infrastructure is cloud-native and depends on external services (Supabase, Upstash Redis, Sentry).

## Common Pitfalls Progress

1. ✅ UI/server state mixing in Zustand (EXEMPLARY - 98/100 compliance) 🎉
2. ✅ useEffect for data fetching (FIXED - auth-provider.tsx refactored)
3. ✅ Direct Supabase calls in components (FIXED - session/[id]/page.tsx refactored)
4. ✅ Missing error handling (FIXED)
5. ✅ Type assertions everywhere (COMPLETELY FIXED - 207/207) 🎉
6. ✅ Memory leaks in realtime (FIXED)
7. ✅ Redis infrastructure (FULLY IMPLEMENTED - production-ready) 🎉

## Performance Optimizations & Code Quality (Complete)

### ✅ **Critical Fixes (High Priority)**

- ✅ ESLint updated to v9.29.0 with flat config - TypeScript plugins v8.34.1 fully compatible
- ✅ Virtualization threshold optimized (20 → 100 items) - better performance for large lists
- ✅ React.memo added to heavy components (SessionCard, CreateBoardForm, GeneratorPanel)
- ✅ Production CORS configured with dynamic NEXT_PUBLIC_APP_URL
- ✅ **Code cleanup**: Removed redundancies, unused imports, ~100+ ESLint warnings fixed
- ✅ **Type safety**: All type errors resolved, stricter linting rules applied

### 🎯 **Next Phase (Medium Priority)**

- Bundle optimization: 2.4MB → target <500KB
- Load time optimization: target <3s
- Bundle analyzer monitoring
- Cache warming strategy
- Semantic HTML improvements

## Essential Commands

```bash
npm run dev           # Development
npm run build         # Production build
npm run validate      # Type-check + lint
npm run build:analyze # Bundle analysis
npm run type-check    # Type-check
```

## Development Workflow

1. **Break down task** into manageable subtasks
2. **Create implementation plan** and get approval
3. **Check pattern compliance** before changes
4. **Read entire relevant files** thoroughly
5. **Follow service → query → component** pattern
6. **Validate with Zod** at boundaries
7. **Run linting** after major changes
8. **Commit** after milestone completion
9. **No new features** until foundation complete

## Response Format

When responding to queries:

1. **Task Analysis**:

   - Break down complex requests
   - Identify required tools
   - Plan approach before execution

2. **Tool Selection**:

   - Choose most appropriate tools
   - Combine tools effectively
   - Explain tool usage decisions

3. **Implementation**:

   - Follow type safety rules
   - Maintain existing patterns
   - Document changes clearly

4. **Validation**:
   - Verify changes thoroughly
   - Run linting checks
   - Confirm pattern compliance

## Response to Feature Requests

**Remember**: Quality over speed. Pattern compliance mandatory. Fix it right the first time.

## CLEAN UP

Whenever you add temporary files and they become outdated/not needed anymore, make sure to clean up after yourself and remove/archive these files so the codebase does not become cluttered.

## File Imports

This file can import other documentation files using the `@path/to/file.md` syntax for modular organization.
