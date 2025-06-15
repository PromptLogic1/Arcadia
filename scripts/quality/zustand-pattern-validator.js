#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REQUIRED_PATTERNS = {
  storeCreation: /createWithEqualityFn/,
  devtools: /devtools\(/,
  useShallow: /useShallow/,
  splitSelectors: /use\w+State|use\w+Actions/,
  actionNaming: /set\([^)]+,\s*false,\s*['"`][^'"`]+['"`]\)/,
};

const ANTI_PATTERNS = {
  // More precise patterns to avoid false positives
  serverData: {
    // Direct Supabase client usage (not in comments)
    supabaseClient:
      /(?<!\/\/.*)(await\s+supabase\.|supabase\.(from|auth|storage|realtime))/,
    // Direct fetch calls
    fetchCall: /(?<!\/\/.*)(await\s+fetch\(|fetch\(.*\).then)/,
    // Direct API calls (but not TanStack Query hooks)
    apiCall: /(?<!\/\/.*)(axios\.|api\.(get|post|put|delete|patch))/,
  },
  useEffect: /useEffect.*fetch/,
  directStateAccess: /useStore\(\s*\)/,
  anyType: /:\s*any/,
};

async function analyzeStore(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let violations = [];
  const compliance = {
    hasCreateWithEqualityFn: false,
    hasDevtools: false,
    hasUseShallow: false,
    hasSplitSelectors: false,
    hasProperActionNaming: false,
    hasNoServerData: true,
    hasNoDirectAccess: true,
  };

  // Check required patterns
  compliance.hasCreateWithEqualityFn =
    REQUIRED_PATTERNS.storeCreation.test(content);
  compliance.hasDevtools = REQUIRED_PATTERNS.devtools.test(content);
  compliance.hasUseShallow = REQUIRED_PATTERNS.useShallow.test(content);
  compliance.hasSplitSelectors = REQUIRED_PATTERNS.splitSelectors.test(content);
  compliance.hasProperActionNaming =
    REQUIRED_PATTERNS.actionNaming.test(content);

  // Check anti-patterns
  const lines = content.split('\n');
  let hasServerData = false;

  lines.forEach((line, index) => {
    // Skip comments, imports, and documentation
    if (
      line.trim().startsWith('//') ||
      line.trim().startsWith('*') ||
      line.includes('import ') ||
      line.includes('export ') ||
      line.includes('@') // Skip JSDoc
    ) {
      return;
    }

    // Check each server data pattern
    for (const [patternName, pattern] of Object.entries(
      ANTI_PATTERNS.serverData
    )) {
      if (pattern.test(line)) {
        hasServerData = true;
        compliance.hasNoServerData = false;
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'server-data',
          message: `Store contains server data (${patternName}) - should use TanStack Query`,
          code: line.trim(),
        });
      }
    }
  });

  // For auth-store.ts, it's acceptable to have Supabase auth integration
  if (filePath.includes('auth-store.ts') && hasServerData) {
    // Remove server data violations for auth store as it's the exception
    violations = violations.filter(v => v.type !== 'server-data');
    compliance.hasNoServerData = true;
  }

  if (ANTI_PATTERNS.directStateAccess.test(content)) {
    compliance.hasNoDirectAccess = false;
    violations.push({
      file: filePath,
      type: 'direct-access',
      message: 'Direct store access without selectors detected',
    });
  }

  // Add violations for missing patterns
  if (!compliance.hasCreateWithEqualityFn) {
    violations.push({
      file: filePath,
      type: 'missing-pattern',
      message: 'Missing createWithEqualityFn pattern',
      fix: 'Use: createWithEqualityFn<StoreType>()(devtools(...))',
    });
  }

  if (!compliance.hasDevtools) {
    violations.push({
      file: filePath,
      type: 'missing-pattern',
      message: 'Missing devtools integration',
      fix: 'Wrap store creation with devtools(..., { name: "store-name" })',
    });
  }

  if (!compliance.hasUseShallow) {
    violations.push({
      file: filePath,
      type: 'missing-pattern',
      message: 'Missing useShallow for equality checks',
      fix: 'Add useShallow as the equality function',
    });
  }

  // Calculate score
  const checks = Object.values(compliance);
  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  return { violations, score, compliance };
}

async function main() {
  console.log('🔍 Zustand Pattern Validator - Checking store compliance...\n');

  const storeFiles = await new Promise((resolve, reject) => {
    glob(
      'src/**/*store*.{ts,tsx}',
      {
        ignore: ['**/node_modules/**'],
      },
      (err, files) => {
        if (err) reject(err);
        else resolve(files);
      }
    );
  });

  let totalScore = 0;
  let storeCount = 0;
  const allViolations = [];

  for (const file of storeFiles) {
    const { violations, score, compliance } = await analyzeStore(file);
    storeCount++;
    totalScore += score;

    if (violations.length > 0) {
      allViolations.push(...violations);
      console.log(`\n❌ ${file} (Score: ${score}/100)`);
      violations.forEach(v => {
        console.log(`   - ${v.message}`);
        if (v.fix) console.log(`     Fix: ${v.fix}`);
        if (v.code) console.log(`     > ${v.code}`);
      });
    } else {
      console.log(`\n✅ ${file} (Score: ${score}/100) - Fully compliant!`);
    }
  }

  const averageScore = storeCount > 0 ? Math.round(totalScore / storeCount) : 0;

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Overall Zustand Compliance: ${averageScore}/100`);
  console.log(`   Stores analyzed: ${storeCount}`);
  console.log(`   Total violations: ${allViolations.length}`);

  if (averageScore >= 98) {
    console.log('\n🎉 Excellent! Maintaining 98%+ compliance target!');
  } else {
    console.log(
      `\n⚠️  Below 98% target. ${98 - averageScore}% improvement needed.`
    );
  }

  // Example of correct pattern
  console.log('\n📝 Correct Zustand Pattern Example:');
  console.log(`
export const useAppStore = createWithEqualityFn<AppStore>()(
  devtools(
    set => ({
      // UI state ONLY
      isModalOpen: false,
      setModalOpen: (open) => set(
        { isModalOpen: open },
        false,
        'app/setModalOpen'
      ),
    }),
    { name: 'app-store' }
  ),
  useShallow
);

// Split selectors
export const useAppState = () => useAppStore(useShallow(s => s.state));
export const useAppActions = () => useAppStore(useShallow(s => s.actions));
`);

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    averageScore,
    storeCount,
    totalViolations: allViolations.length,
    stores: storeFiles.map(file => ({
      file,
      violations: allViolations.filter(v => v.file === file),
    })),
  };

  fs.writeFileSync(
    path.join(__dirname, 'zustand-compliance-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(
    '\n📊 Full report saved to scripts/zustand-compliance-report.json'
  );

  process.exit(averageScore >= 98 ? 0 : 1);
}

main().catch(console.error);
