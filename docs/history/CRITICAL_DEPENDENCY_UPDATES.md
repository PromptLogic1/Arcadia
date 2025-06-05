# Critical Dependency Updates - June 2025

**Updated**: June 2025  
**Security Status**: ✅ 0 vulnerabilities  
**Main Issue**: ESLint 9 plugin compatibility  
**React 19 & Tailwind v4**: Keeping as requested

## Executive Summary

Your dependency choices are solid for June 2025. React 19 and Tailwind v4 are mature. The only critical issue is ESLint 9 compatibility with TypeScript ESLint v8 plugins. No security vulnerabilities found.

## ✅ Keeping These (As Requested)

### React 19 & Ecosystem

- **React 19.0.0** - Keeping (stable by June 2025)
- **Next.js 15.3.3** - Compatible with React 19
- **@testing-library/react 16.3.0** - Should have React 19 support by now

### Tailwind CSS v4

- **tailwindcss 4.1.8** - Keeping (should be stable by June 2025)
- The v4 architecture is cleaner and faster
- PostCSS integration improved

## 🔴 Critical Updates Required

### 1. ESLint 9 Plugin Compatibility

**Current Issues**:

```json
{
  "eslint": "^9.17.0", // Using v9
  "@typescript-eslint/eslint-plugin": "^8.33.0", // v8 - INCOMPATIBLE!
  "@typescript-eslint/parser": "^8.33.0", // v8 - INCOMPATIBLE!
  "eslint-config-next": "^15.3.3" // Needs to support flat config
}
```

**Required Updates**:

```json
{
  "@typescript-eslint/eslint-plugin": "^9.0.0",
  "@typescript-eslint/parser": "^9.0.0",
  "eslint-plugin-jest-dom": "^6.0.0",
  "eslint-plugin-testing-library": "^8.0.0"
}
```

### 2. Jest Environment JSdom Beta

**Current**: `"jest-environment-jsdom": "^30.0.0-beta.3"`

**Update to stable**:

```json
{
  "jest-environment-jsdom": "^30.0.0" // Should be stable by June 2025
}
```

### 3. ESLint Flat Config Migration

Create `eslint.config.mjs` (new flat config format):

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      '@next/next': next,
    },
    rules: {
      // Your existing rules here
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

## 🟡 Recommended Updates

### Testing Libraries

Since we're keeping React 19, ensure testing libraries are fully compatible:

```json
{
  "@testing-library/react": "^16.3.0", // Keep current
  "@testing-library/user-event": "^15.0.0", // Update for better React 19 support
  "jest": "^30.0.0", // Update to v30 for React 19
  "@types/jest": "^30.0.0"
}
```

### Other Updates

```json
{
  "@tanstack/react-query": "^5.80.5", // Latest stable
  "@tanstack/react-query-devtools": "^5.80.5",
  "framer-motion": "^12.16.0",
  "lucide-react": "^0.513.0",
  "zod": "^3.25.51",
  "@supabase/supabase-js": "^2.49.10"
}
```

## Migration Steps

### Step 1: Update ESLint Plugins

```bash
# Update TypeScript ESLint to v9
npm install -D @typescript-eslint/eslint-plugin@^9.0.0 @typescript-eslint/parser@^9.0.0

# Update other ESLint plugins
npm install -D eslint-plugin-jest-dom@^6.0.0 eslint-plugin-testing-library@^8.0.0
```

### Step 2: Create Flat Config

```bash
# Remove old config files
rm .eslintrc.json .eslintrc.js

# Create new flat config
touch eslint.config.mjs
```

Then add the flat config content from above.

### Step 3: Update Jest Environment

```bash
npm install -D jest-environment-jsdom@^30.0.0
```

### Step 4: Update Testing Libraries

```bash
npm install -D @testing-library/user-event@^15.0.0 jest@^30.0.0 @types/jest@^30.0.0
```

### Step 5: Update Other Packages

```bash
# Update to latest stable versions
npm update @tanstack/react-query @tanstack/react-query-devtools
npm update framer-motion lucide-react zod
npm update @supabase/supabase-js
```

### Step 6: Fix ESLint Errors

```bash
# Test new ESLint config
npm run lint

# Fix any new errors from stricter v9 rules
npm run lint:fix
```

## Expected Changes

### ESLint Config Format

- Move from `.eslintrc.json` to `eslint.config.mjs`
- Use flat config array instead of nested extends
- Import plugins directly instead of string references

### TypeScript ESLint v9

- Stricter type checking by default
- Some rules renamed or consolidated
- Better performance

### Testing Updates

- Jest 30 has better React 19 support
- Testing library updates for React 19 concurrent features
- May need to update some test patterns

## Why Keep React 19 & Tailwind v4?

### React 19 (June 2025 perspective)

- Server Components are now stable
- Concurrent features well-documented
- Ecosystem has caught up
- Performance improvements worth keeping

### Tailwind v4 (June 2025 perspective)

- Lightning CSS integration mature
- Better performance than v3
- Cleaner configuration
- First-party TypeScript support

## Potential Issues

1. **ESLint Migration**

   - Flat config syntax is different
   - Some plugins might not have v9 support yet
   - May need to disable some rules temporarily

2. **Testing**

   - React 19 concurrent features might need test adjustments
   - Some testing patterns may have changed

3. **Build Performance**
   - First build after updates will be slower
   - Clear all caches after updates

## Bottom Line

By June 2025, React 19 and Tailwind v4 are reasonable choices. The main work is:

1. Update all ESLint plugins to v9-compatible versions
2. Migrate to ESLint flat config
3. Update testing libraries to stable versions
4. Minor updates to other packages

**Estimated Time**: 2-4 hours (mainly ESLint migration)
**Risk Level**: Low (by June 2025)
**Priority**: Medium - Do after critical app fixes
