# Arcadia Quality Maintenance Scripts

This directory contains automated scripts for maintaining code quality, performance, and consistency across the Arcadia codebase.

## 🎯 Overview

These scripts enforce the strict quality standards defined in CLAUDE.md and help maintain a production-ready codebase.

## 🚀 Quick Start

```bash
# Run all quality checks
npm run audit

# Quick validation before commit
npm run pre-commit

# Check specific areas
npm run audit:types      # Type safety only
npm run audit:zustand    # Zustand patterns only
npm run audit:services   # Service patterns only
npm run audit:imports    # Import optimization
```

## 📋 Core Quality Scripts

### 🔍 `run-audits.js`

**Usage**: `npm run audit`

Comprehensive audit runner that orchestrates all quality checks. Run this to get a complete health check of the codebase.

### 🚦 `pre-commit-validator.js`

**Usage**: `npm run pre-commit`

Fast pre-commit validation that runs essential checks before allowing commits. Prevents common issues from entering the codebase.

To install as a git hook:

```bash
node scripts/pre-commit-validator.js --install-hook
```

## 🔒 Type Safety & Pattern Enforcement

### `type-safety-enforcer.js` 🆕

**Usage**: `npm run audit:types`

Enforces strict type safety rules:

- ❌ No `any` types
- ❌ No type assertions (`as Type`)
- ✅ Only `as const` assertions allowed
- Generates detailed violation reports with line numbers

### `zustand-pattern-validator.js` 🆕

**Usage**: `npm run audit:zustand`

Validates Zustand stores follow the 98/100 compliant pattern:

- Uses `createWithEqualityFn` + `devtools` + `useShallow`
- UI state only (no server data)
- Split state/actions selectors
- Calculates compliance score (0-100%)

### `service-pattern-checker.js` 🆕

**Usage**: `npm run audit:services`

Enforces the service → query → component pattern:

- Services: Pure functions returning `ServiceResponse<T>`
- Queries: TanStack Query hooks using services
- Components: No direct Supabase/service calls
- Identifies pattern violations with recommendations

### `import-optimizer.js` 🆕

**Usage**: `npm run audit:imports`

Optimizes imports across the codebase:

- Converts barrel imports to specific imports
- Identifies unused imports
- Suggests `modularizeImports` configuration
- Sorts and organizes imports by type

## 🚀 Performance & Quality Audits

### `analyze-bundle.js`

**Usage**: Part of `npm run audit`

Analyzes bundle size and identifies optimization opportunities:

- Heavy dependencies detection
- Route size analysis
- Optimization recommendations

### `accessibility-audit.js`

**Usage**: Part of `npm run audit`

Comprehensive accessibility audit:

- WCAG color contrast validation
- ARIA label checking
- Keyboard navigation verification
- Generates CSS fixes for contrast issues

### `optimize-images.js`

**Usage**: `node scripts/optimize-images.js`

Updates image components to use optimized patterns:

- Converts to `OptimizedImage` component
- Adds responsive sizes
- Removes unnecessary props

## 🗄️ Database & Infrastructure Tools

### migration-manager.js

- **Description**: Comprehensive Supabase migration management with validation, backup, and deployment
- **Usage**: `npm run migration:status`
- **Note**: When using Claude Code, you can also use Supabase MCP commands (see script header)

### seed-demo-boards.ts

- **Description**: Seed high-quality demo bingo boards for testing and onboarding
- **Usage**: `npm run seed:demo`
- **Commands**:
  - `seed` - Add demo boards
  - `clear` - Remove demo boards
  - `verify` - Check existing boards

### test-migration.ts

- **Description**: Test database migrations, RLS policies, and performance
- **Usage**: `npm run test:migration`

### supabase-with-auth.ps1

- **Description**: Windows PowerShell helper for Supabase CLI with automatic password handling
- **Usage**: `./scripts/supabase-with-auth.ps1 <command>`
- **Example**: `./scripts/supabase-with-auth.ps1 db reset`

## Testing & Verification

### test-sentry.ts

- **Description**: Test Sentry error tracking integration
- **Usage**: `tsx scripts/test-sentry.ts`
- **Purpose**: Verify Sentry is capturing errors, messages, and breadcrumbs

### verify-sentry.js

- **Description**: Verify Sentry CLI authentication and configuration
- **Usage**: `node scripts/verify-sentry.js`
- **Purpose**: Ensure Sentry is properly configured for deployments

## Performance & Quality Audits

### run-audits.js 🆕

- **Description**: Run all audits in sequence and generate a comprehensive report
- **Usage**: `node scripts/run-audits.js`
- **Output**: Console summary + `audit-report.txt`

### analyze-bundle.js

- **Description**: Analyze Next.js bundle for optimization opportunities
- **Usage**: `node scripts/analyze-bundle.js`
- **Also**: `npm run build:analyze` for visual bundle analysis

### accessibility-audit.js

- **Description**: Check WCAG compliance, color contrast, and keyboard navigation
- **Usage**: `node scripts/accessibility-audit.js`
- **Checks**:
  - Color contrast ratios (AA/AAA)
  - ARIA labels and roles
  - Keyboard navigation support

### optimize-images.js

- **Description**: Update components to use OptimizedImage wrapper
- **Usage**: `node scripts/optimize-images.js [directory]`
- **Note**: OptimizedImage component provides lazy loading and blur placeholders

## Archived Scripts

Completed migration scripts have been moved to `scripts/archive/`:

- `replace-react-icons.js` - Migration from react-icons to lucide-react (completed)
- `update-button-variants.js` - Update old button variants to new system (completed)
- `update-card-variants.js` - Update card component variants (completed)

## 📊 Generated Reports

All scripts generate detailed reports:

- Console output for immediate feedback
- JSON reports saved to project root:
  - `audit-report.txt` - Overall audit summary
  - `type-safety-report.json` - Type violations detail
  - `zustand-compliance-report.json` - Store compliance scores
  - `service-pattern-report.json` - Architecture violations
  - `import-optimization-report.json` - Import issues and fixes

## 📝 npm Script Aliases

```json
{
  // Quality audits
  "audit": "node scripts/run-audits.js",
  "audit:types": "node scripts/type-safety-enforcer.js",
  "audit:zustand": "node scripts/zustand-pattern-validator.js",
  "audit:services": "node scripts/service-pattern-checker.js",
  "audit:imports": "node scripts/import-optimizer.js",
  "pre-commit": "node scripts/pre-commit-validator.js",

  // Migration management
  "migration:validate": "node scripts/migration-manager.js validate",
  "migration:backup": "node scripts/migration-manager.js backup",
  "migration:new": "node scripts/migration-manager.js new",
  "migration:status": "node scripts/migration-manager.js status",
  "migration:deploy": "node scripts/migration-manager.js deploy",
  "migration:types": "node scripts/migration-manager.js types",

  // Demo data
  "seed:demo": "tsx scripts/seed-demo-boards.ts seed",
  "seed:demo:clear": "tsx scripts/seed-demo-boards.ts clear",
  "seed:demo:verify": "tsx scripts/seed-demo-boards.ts verify",

  // Testing
  "test:migration": "tsx scripts/test-migration.ts"
}
```

## Adding New Scripts

When adding new scripts:

1. Use descriptive names (kebab-case for JS, camelCase for TS)
2. Add a comprehensive header comment explaining:
   - Purpose and functionality
   - Usage examples
   - Command-line arguments
   - Expected output
3. Update this README
4. Consider adding an npm script alias in package.json
5. For one-time migrations, move to `archive/` after completion

## 🔮 Future Quality Scripts

Planned quality maintenance scripts (medium/low priority):

- `dead-code-eliminator.js` - Remove unused exports, functions, and dependencies
- `performance-monitor.js` - Component render analysis and React.memo opportunities
- `dependency-updater.js` - Safe dependency updates with breaking change detection
- `code-quality-metrics.js` - Cyclomatic complexity and technical debt tracking
- `css-tailwind-optimizer.js` - Remove unused Tailwind classes and patterns

## ⚡ Performance Tips

- Run individual scripts during development for fast feedback
- Use `pre-commit-validator.js` for quick validation loops
- Run full audit (`npm run audit`) before PRs
- Schedule weekly full audits including build test
- Use JSON reports for tracking quality trends over time

## 🐛 Troubleshooting

If scripts fail to run:

1. Ensure Node.js 18+ is installed
2. Run `npm install` to get dependencies
3. Check file permissions (scripts should be executable)
4. Review error messages for specific issues
5. Check if required files exist (e.g., for new scripts)

For script-specific issues, check the inline documentation in each script file.

## Best Practices

1. **Error Handling**: All scripts should handle errors gracefully and provide clear error messages
2. **Logging**: Use console.log with emojis for better readability (🔍 🚀 ✅ ❌ ⚠️)
3. **Exit Codes**: Use proper exit codes (0 for success, 1 for failure)
4. **Documentation**: Include usage instructions in both the script header and this README
5. **Dependencies**: Minimize external dependencies; use Node.js built-ins when possible
6. **Reports**: Generate both console output and JSON reports for automation
