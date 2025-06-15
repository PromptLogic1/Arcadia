#!/usr/bin/env node

/**
 * Comprehensive Audit Runner
 * Runs all quality and performance audits for the Arcadia project
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Arcadia Comprehensive Audit Suite\n');
console.log('This will run all quality and performance audits.');
console.log('─'.repeat(60) + '\n');

const audits = [
  {
    name: 'Accessibility Audit',
    script: 'accessibility-audit.js',
    description: 'Check WCAG compliance and color contrast',
    required: true,
  },
  {
    name: 'Bundle Analysis',
    script: '../performance/analyze-bundle.js',
    description: 'Analyze bundle size and optimization opportunities',
    required: true,
  },
  {
    name: 'TypeScript Check',
    command: 'npm run type-check',
    description: 'Verify type safety across the codebase',
    required: true,
  },
  {
    name: 'Type Safety Enforcer',
    script: 'type-safety-enforcer.js',
    description: 'Enforce strict type safety rules (no any, no assertions)',
    required: true,
  },
  {
    name: 'Zustand Pattern Validator',
    script: 'zustand-pattern-validator.js',
    description: 'Validate Zustand stores follow 98/100 compliant pattern',
    required: true,
  },
  {
    name: 'Service Pattern Checker',
    script: 'service-pattern-checker.js',
    description: 'Verify service → query → component pattern',
    required: true,
  },
  {
    name: 'ESLint Check',
    command: 'npm run lint',
    description: 'Check code quality and style',
    required: true,
  },
  {
    name: 'Build Test',
    command: 'npm run build',
    description: 'Ensure production build succeeds',
    required: false,
    slow: true,
  },
];

const results = [];
let hasFailures = false;

// Run each audit
for (const audit of audits) {
  console.log(`\n📋 Running: ${audit.name}`);
  console.log(`   ${audit.description}`);

  if (audit.slow) {
    console.log('   ⏱️  This may take a few minutes...');
  }

  console.log('');

  const startTime = Date.now();
  let success = false;
  let output = '';

  try {
    if (audit.script) {
      const scriptPath = path.join(__dirname, audit.script);
      output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
    } else if (audit.command) {
      output = execSync(audit.command, { encoding: 'utf8' });
    }
    success = true;
  } catch (error) {
    output = error.stdout || error.message;
    success = false;
    if (audit.required) {
      hasFailures = true;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  results.push({
    name: audit.name,
    success,
    duration,
    required: audit.required,
    output: output.trim(),
  });

  // Show summary for each audit
  if (success) {
    console.log(`✅ ${audit.name} passed (${duration}s)`);
  } else {
    console.log(`❌ ${audit.name} failed (${duration}s)`);
    if (audit.required) {
      console.log('   This is a required audit - fix issues before deployment');
    }
  }
}

// Generate summary report
console.log('\n\n' + '='.repeat(60));
console.log('📊 AUDIT SUMMARY REPORT');
console.log('='.repeat(60) + '\n');

// Overall status
const passedCount = results.filter(r => r.success).length;
const totalCount = results.length;
const passRate = ((passedCount / totalCount) * 100).toFixed(0);

console.log(`Overall Status: ${hasFailures ? '❌ FAILED' : '✅ PASSED'}`);
console.log(`Pass Rate: ${passedCount}/${totalCount} (${passRate}%)`);
console.log(
  `Total Time: ${results.reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(1)}s`
);

// Detailed results
console.log('\nDetailed Results:');
console.log('─'.repeat(60));

results.forEach(result => {
  const status = result.success ? '✅' : '❌';
  const required = result.required ? ' (REQUIRED)' : '';
  console.log(`${status} ${result.name}${required} - ${result.duration}s`);

  if (!result.success && result.output) {
    // Show first few lines of error
    const errorLines = result.output.split('\n').slice(0, 5);
    errorLines.forEach(line => console.log(`   ${line}`));
    if (result.output.split('\n').length > 5) {
      console.log('   ...');
    }
  }
});

// Save report to file
const reportPath = path.join(process.cwd(), 'audit-report.txt');
const reportContent = `Arcadia Audit Report
Generated: ${new Date().toISOString()}

Overall Status: ${hasFailures ? 'FAILED' : 'PASSED'}
Pass Rate: ${passedCount}/${totalCount} (${passRate}%)

Detailed Results:
${results.map(r => `${r.success ? '✅' : '❌'} ${r.name} - ${r.duration}s`).join('\n')}

${hasFailures ? '\n⚠️  Fix required audit failures before deployment!' : '\n✅ All audits passed!'}
`;

fs.writeFileSync(reportPath, reportContent);
console.log(`\n📄 Full report saved to: ${reportPath}`);

// Exit with appropriate code
if (hasFailures) {
  console.log(
    '\n⚠️  Some required audits failed. Please fix the issues and run again.'
  );
  process.exit(1);
} else {
  console.log('\n✅ All audits passed! Your code is ready for deployment.');
  process.exit(0);
}
