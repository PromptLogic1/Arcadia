# Common Issues & Solutions

This guide covers frequently encountered issues and their solutions based on the current project state.

## Current Known Issues (January 2025)

### Critical Issues Fixed ✅

- **TypeScript Errors**: 0 errors (was 97+)
- **React Hook Violations**: Fixed
- **Memory Leaks**: Fixed with proper cleanup

### Active Issues ⚠️

1. **69% of API routes lack input validation**

   - Add Zod schemas to all routes
   - See `/docs/api/RATE_LIMITING_STRATEGY.md` for examples

2. **Service layer has 37 type assertions**

   - Replace `as Type` with proper validation
   - See `/docs/reports/SERVICE_LAYER_REVIEW.md`

3. **In-memory rate limiting won't scale**

   - Works in dev, needs Redis for production
   - Current implementation in `/src/lib/rate-limiter.ts`

4. **0% test coverage**
   - Jest configured but no tests written
   - Start with service layer tests

## Build & Development Issues

### TypeScript Errors

**Problem**: Build fails with TypeScript errors  
**Solution**: This should not happen as we have 0 TypeScript errors. If you see errors:

- Run `npm run type-check` to see all errors
- DO NOT use `any` or `@ts-ignore` - fix the actual issue
- Check that types are properly imported
- Ensure database types are up-to-date: `mcp__supabase__generate_typescript_types`

### ESLint Warnings

**Problem**: Linting shows warnings  
**Solution**:

- Run `npm run lint` to see all warnings
- Most are legitimate issues that should be fixed
- For false positives (like re-exported types), use specific ESLint comments with explanations

### Module Not Found

**Problem**: `Module not found` errors  
**Solution**:

- Check import paths - use `@/` for src directory
- Ensure the file exists at the specified path
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Runtime Issues

### Supabase Connection Failed

**Problem**: Cannot connect to Supabase  
**Solution**:

1. Check environment variables are set correctly
2. Verify Supabase project is active (not paused)
3. Check network connectivity
4. Ensure correct URL and anon key in `.env.local`

### Real-time Updates Not Working

**Problem**: Real-time subscriptions don't update  
**Solution**:

1. Check if real-time is enabled in Supabase dashboard
2. Verify table has replica identity set:
   ```sql
   ALTER TABLE your_table REPLICA IDENTITY FULL;
   ```
3. Check browser console for WebSocket errors
4. Ensure RLS policies allow read access

### Authentication Issues

**Problem**: Users can't log in or stay logged in  
**Solution**:

1. Check Supabase auth settings
2. Verify redirect URLs are configured
3. Check for cookie/localStorage issues
4. Clear browser storage and try again
5. Check for CORS issues with auth endpoints

### White Screen of Death

**Problem**: Application shows blank white screen  
**Solution**:

1. Open browser console for errors
2. Check if error boundaries are working
3. Look for unhandled promise rejections
4. Check Sentry for error reports
5. Try incognito mode to rule out extensions

## Database Issues

### Migration Failures

**Problem**: Database migrations fail  
**Solution**:

1. Check SQL syntax in migration files
2. Ensure migrations run in correct order
3. Verify no conflicting schema changes
4. Use transactions for complex migrations
5. Test migrations on a development database first

### RLS Policy Violations

**Problem**: "Permission denied" errors  
**Solution**:

1. Check RLS policies for the table
2. Verify user has correct role
3. Test policies in Supabase SQL editor
4. Add detailed policy conditions
5. Use service role key for admin operations (server-side only)

### Type Generation Failures

**Problem**: Database types don't generate  
**Solution**:

1. Ensure Supabase project is accessible
2. Check project ID is correct
3. Verify auth token if using CLI
4. Try regenerating: `mcp__supabase__generate_typescript_types`
5. Check for TypeScript syntax errors in generated file

## Performance Issues

### Slow Page Loads

**Problem**: Pages take too long to load  
**Solution**:

1. Check bundle size with `npm run analyze`
2. Implement code splitting
3. Lazy load heavy components
4. Optimize images with Next.js Image
5. Use static generation where possible

### Memory Leaks

**Problem**: Application becomes slow over time  
**Solution**:

1. Check for missing cleanup in useEffect
2. Unsubscribe from real-time channels
3. Clear intervals and timeouts
4. Use React DevTools Profiler
5. Monitor with browser performance tools

### API Response Times

**Problem**: API calls are slow  
**Solution**:

1. Add database indexes on frequently queried columns
2. Optimize Supabase queries (use select specific columns)
3. Implement caching with TanStack Query
4. Use pagination for large datasets
5. Consider edge functions for complex operations

## Development Environment

### Port Already in Use

**Problem**: Cannot start dev server  
**Solution**:

```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
# Or use a different port
npm run dev -- -p 3001
```

### Hot Reload Not Working

**Problem**: Changes don't reflect without manual refresh  
**Solution**:

1. Check if file is outside of watched directories
2. Clear Next.js cache: `rm -rf .next`
3. Restart development server
4. Check for syntax errors preventing compilation
5. Disable browser extensions that might interfere

### Environment Variables Not Loading

**Problem**: Environment variables are undefined  
**Solution**:

1. Ensure `.env.local` file exists
2. Variables must start with `NEXT_PUBLIC_` for client-side
3. Restart dev server after changes
4. Don't commit `.env.local` to git
5. Check for typos in variable names

## Production Issues

### Deployment Failures

**Problem**: Build fails on Vercel/deployment platform  
**Solution**:

1. Ensure all environment variables are set
2. Check build logs for specific errors
3. Test production build locally: `npm run build`
4. Verify Node.js version matches
5. Check for missing dependencies

### CORS Errors

**Problem**: Cross-origin requests blocked  
**Solution**:

1. Configure CORS in API routes
2. Check Supabase URL is correct
3. Add allowed origins in Supabase settings
4. Use API routes as proxy for external APIs
5. Check browser console for specific CORS errors

### 500 Internal Server Errors

**Problem**: Server errors in production  
**Solution**:

1. Check Sentry for error details
2. Review server logs on hosting platform
3. Test the same operation locally
4. Check for missing environment variables
5. Verify database connectivity

## Debugging Tips

### General Debugging

1. **Use the logger**: Import and use `logger` from `@/lib/logger`
2. **Check Sentry**: Errors are automatically reported
3. **Browser DevTools**: Network tab for API issues
4. **React DevTools**: Component props and state
5. **Database Logs**: Check Supabase logs for query issues

### Useful Commands

```bash
# Check TypeScript errors
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Clean install
rm -rf node_modules .next
npm install

# Update database types
mcp__supabase__generate_typescript_types --project_id=your-id

# Check bundle size
npm run analyze
```

## Getting Help

If you can't resolve an issue:

1. Check existing GitHub issues
2. Search error messages in documentation
3. Review recent commits for breaking changes
4. Ask in project chat with:
   - Error messages
   - Steps to reproduce
   - Environment details
   - What you've already tried

## Prevention

To avoid common issues:

1. Always run type-check before committing
2. Keep dependencies updated
3. Test in production-like environment
4. Monitor error rates with Sentry
5. Document any workarounds needed
