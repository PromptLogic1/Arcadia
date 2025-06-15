#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

const QUICK_CHECKS = {
  console: /console\.(log|debug|info|warn|error)/,
  debugger: /\bdebugger\b/,
  todo: /\/\/\s*(TODO|FIXME|HACK|XXX)/i,
  anyType: /:\s*any(?:\s|;|,|\)|$)/,
  typeAssertion: /\bas\s+(?!const\b)\w+/,
  onlyTest: /\.(only|skip)\(/,
  focusedTest: /\bfit\(|fdescribe\(/,
};

async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments for some checks
    const isComment =
      line.trim().startsWith('//') || line.trim().startsWith('*');

    Object.entries(QUICK_CHECKS).forEach(([checkName, pattern]) => {
      // Skip console checks in logger files
      if (checkName === 'console' && filePath.includes('logger')) return;

      // Skip TODO checks in comments
      if (checkName === 'todo' && !isComment) return;

      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          type: checkName,
          code: line.trim(),
        });
      }
    });
  });

  return violations;
}

async function getChangedFiles() {
  try {
    // Get staged files
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));

    // Get modified files not staged
    const modified = execSync('git diff --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));

    return [...new Set([...staged, ...modified])];
  } catch (error) {
    // If not in a git repo, check all files
    const files = await new Promise((resolve, reject) => {
      glob(
        'src/**/*.{ts,tsx}',
        {
          ignore: ['**/node_modules/**'],
        },
        (err, files) => {
          if (err) reject(err);
          else resolve(files);
        }
      );
    });
    return files;
  }
}

async function main() {
  console.log('🚀 Pre-commit Validator - Running quick checks...\n');

  const files = await getChangedFiles();

  if (files.length === 0) {
    console.log('✅ No TypeScript files to check');
    process.exit(0);
  }

  console.log(`Checking ${files.length} files...\n`);

  let totalViolations = 0;
  const allViolations = [];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const violations = await checkFile(file);
      if (violations.length > 0) {
        totalViolations += violations.length;
        allViolations.push(...violations);
      }
    }
  }

  if (totalViolations === 0) {
    console.log('✅ All checks passed! Ready to commit.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalViolations} issues that should be fixed:\n`);

    // Group by type
    const byType = allViolations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {});

    const messages = {
      console: '🚫 Console statements (use logger instead)',
      debugger: '🐛 Debugger statements',
      todo: '📝 TODO/FIXME comments',
      anyType: '❌ Any types (violates type safety)',
      typeAssertion: '🚨 Type assertions (except "as const")',
      onlyTest: '🧪 .only() or .skip() in tests',
      focusedTest: '🧪 Focused tests (fit/fdescribe)',
    };

    Object.entries(byType).forEach(([type, violations]) => {
      console.log(`\n${messages[type]} (${violations.length}):`);
      violations.forEach(v => {
        console.log(`  ${v.file}:${v.line}`);
        console.log(`  > ${v.code}\n`);
      });
    });

    console.log('\n💡 Quick fixes:');
    if (byType.console)
      console.log(
        '  - Replace console.* with: import { log } from "@/lib/logger"'
      );
    if (byType.anyType)
      console.log(
        '  - Replace "any" with specific types from /types/database-generated.ts'
      );
    if (byType.typeAssertion)
      console.log('  - Remove type assertions, let TypeScript infer');
    if (byType.todo)
      console.log('  - Create issues for TODOs or complete them now');
    if (byType.onlyTest || byType.focusedTest)
      console.log('  - Remove .only(), .skip(), fit(), fdescribe()');

    console.log('\n⚡ To bypass (not recommended): git commit --no-verify');

    process.exit(1);
  }
}

// Make it fast for pre-commit hook
main().catch(error => {
  console.error('Pre-commit validator error:', error);
  process.exit(1);
});
