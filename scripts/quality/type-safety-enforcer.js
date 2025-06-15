#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ALLOWED_ASSERTIONS = ['as const'];
const FORBIDDEN_PATTERNS = [
  {
    pattern: /:\s*any(?:\s|;|,|\)|>|$)/g,
    type: 'any-type',
    message: 'Found "any" type',
  },
  {
    pattern:
      /\bas\s+(?!const\b)(?!any\b)(?!unknown\b)(?!never\b)(?!void\b)(?!undefined\b)(?!null\b)(?!string\b)(?!number\b)(?!boolean\b)(?!symbol\b)(?!object\b)(?!bigint\b)\w+(?!['"])/g,
    type: 'type-assertion',
    message: 'Found type assertion',
    validator: (match, line, filePath) => {
      // Skip if it's in a string or comment
      const beforeMatch = line.substring(0, line.indexOf(match));
      if (beforeMatch.includes('//') || beforeMatch.includes('/*'))
        return false;
      if ((beforeMatch.match(/'/g) || []).length % 2 !== 0) return false;
      if ((beforeMatch.match(/"/g) || []).length % 2 !== 0) return false;
      if ((beforeMatch.match(/`/g) || []).length % 2 !== 0) return false;
      // Skip error messages and throw statements
      if (line.includes('Error(') || line.includes('throw ')) return false;
      // Skip export statements that rename
      if (line.includes('export') && line.includes('{') && line.includes('}'))
        return false;
      // Allow in test files for mocking
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        if (line.includes('jest.') || line.includes('mock')) return false;
      }
      return true;
    },
  },
  { pattern: /<any>/g, type: 'any-generic', message: 'Found generic any' },
  {
    pattern: /:\s*Function(?:\s|;|,|\)|>|$)/g,
    type: 'function-type',
    message: 'Found Function type (use specific signature)',
    validator: (match, line) => {
      // Allow MockedFunction, TestFunction, etc.
      if (line.includes('MockedFunction') || line.includes('jest.'))
        return false;
      // Allow type names that contain Function
      if (/\w+Function/.test(line)) return false;
      return true;
    },
  },
  {
    pattern: /:\s*Object(?:\s|;|,|\)|>|$)/g,
    type: 'object-type',
    message: 'Found Object type (use specific interface)',
    validator: (match, line) => {
      // Allow interface names and type names that contain Object
      if (/interface\s+\w*Object/.test(line) || /type\s+\w*Object/.test(line))
        return false;
      // Allow LogObject and similar
      if (/\w+Object/.test(line)) return false;
      return true;
    },
  },
];

async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments and imports
    if (
      line.trim().startsWith('//') ||
      line.trim().startsWith('*') ||
      line.includes('import')
    ) {
      return;
    }

    FORBIDDEN_PATTERNS.forEach(({ pattern, type, message, validator }) => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        // Skip if validator exists and returns false
        if (validator && !validator(match[0], line, filePath)) {
          return;
        }

        // Special handling for type assertions
        if (type === 'type-assertion') {
          const assertionText = match[0];
          if (
            !ALLOWED_ASSERTIONS.some(allowed => assertionText.includes(allowed))
          ) {
            violations.push({
              file: filePath,
              line: index + 1,
              column: match.index + 1,
              type,
              message: `${message}: "${assertionText}"`,
              code: line.trim(),
            });
          }
        } else {
          violations.push({
            file: filePath,
            line: index + 1,
            column: match.index + 1,
            type,
            message,
            code: line.trim(),
          });
        }
      });
    });
  });

  return violations;
}

async function main() {
  console.log('🔍 Type Safety Enforcer - Scanning for violations...\n');

  const files = await new Promise((resolve, reject) => {
    glob(
      'src/**/*.{ts,tsx}',
      {
        ignore: ['**/node_modules/**', '**/types/database-generated.ts'],
      },
      (err, files) => {
        if (err) reject(err);
        else resolve(files);
      }
    );
  });

  let totalViolations = 0;
  const allViolations = [];

  for (const file of files) {
    const violations = await checkFile(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      allViolations.push(...violations);
    }
  }

  // Group violations by type
  const violationsByType = allViolations.reduce((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  // Display results
  if (totalViolations === 0) {
    console.log('✅ No type safety violations found! 🎉');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalViolations} type safety violations:\n`);

    Object.entries(violationsByType).forEach(([type, violations]) => {
      console.log(
        `\n📋 ${type.replace('-', ' ').toUpperCase()} (${violations.length} violations):`
      );
      violations.forEach(v => {
        console.log(`   ${v.file}:${v.line}:${v.column}`);
        console.log(`   ${v.message}`);
        console.log(`   > ${v.code}\n`);
      });
    });

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      totalViolations,
      violationsByType: Object.entries(violationsByType).map(
        ([type, violations]) => ({
          type,
          count: violations.length,
          violations: violations.map(v => ({
            file: v.file,
            line: v.line,
            column: v.column,
            code: v.code,
          })),
        })
      ),
    };

    fs.writeFileSync(
      path.join(__dirname, 'type-safety-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Full report saved to scripts/type-safety-report.json');
    console.log('\n💡 Fix suggestions:');
    console.log(
      '   - Replace "any" with specific types from /types/database-generated.ts'
    );
    console.log('   - Remove type assertions, let TypeScript infer types');
    console.log('   - Use "as const" for literal types only');

    process.exit(1);
  }
}

main().catch(console.error);
