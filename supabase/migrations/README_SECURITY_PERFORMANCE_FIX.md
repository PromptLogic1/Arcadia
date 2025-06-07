# Security and Performance Migration

**Date**: 2025-01-07  
**Migration File**: `20250107_fix_security_and_performance_issues.sql`

## Overview

This migration addresses critical security vulnerabilities and performance issues identified by Supabase's database linter.

## Issues Fixed

### 1. 🔴 **SECURITY DEFINER Views (Critical)**

**Problem**: Three views were using `SECURITY DEFINER` which bypasses RLS policies:
- `leaderboards`
- `public_boards` 
- `session_stats`

**Solution**: Recreated all views without `SECURITY DEFINER` property.

### 2. 🔴 **Function Search Path Vulnerability**

**Problem**: `update_user_statistics_updated_at_func` had a mutable search path.

**Solution**: Added `SET search_path TO public` to the function definition.

### 3. 🟡 **RLS Performance Issues**

**Problem**: 25+ RLS policies were calling `auth.uid()` directly, causing re-evaluation for every row.

**Solution**: Changed all instances from:
```sql
auth.uid() = user_id
```
To:
```sql
(SELECT auth.uid()) = user_id
```

### 4. 🟡 **Multiple Overlapping Policies**

**Problem**: Several tables had 3-4 overlapping policies for the same action.

**Solution**: Consolidated policies for:
- `user_statistics` (4 SELECT → 1 SELECT policy)
- `community_event_participants` (3 policies per action → 1 per action)
- `categories`, `tags`, `challenge_tags`, `tag_votes`, `submissions`, `challenges`

## Testing

Run the test script before applying:
```bash
npm run test:migration
```

Or manually:
```bash
ts-node scripts/test-migration.ts
```

## Applying the Migration

### Using Supabase CLI:
```bash
supabase db push
```

### Using MCP Server:
```typescript
await mcp__supabase__apply_migration({
  project_id: 'your-project-id',
  name: 'fix_security_and_performance_issues',
  query: /* contents of migration file */
});
```

## Rollback Plan

If issues occur, rollback by:

1. Recreating views with SECURITY DEFINER (if needed for specific use cases)
2. Reverting RLS policies to original state
3. Re-splitting consolidated policies

## Performance Impact

Expected improvements:
- **50-80% faster** queries on tables with fixed RLS policies
- **Reduced database CPU usage** from consolidated policies
- **Better query plan optimization** with SELECT subqueries

## Security Impact

- Views no longer bypass RLS policies
- Function execution context is properly secured
- Data access follows intended permission model

## Post-Migration Verification

1. Check view accessibility
2. Verify RLS policies work correctly
3. Test application functionality
4. Monitor query performance
5. Check error logs for any access issues