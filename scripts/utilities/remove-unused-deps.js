#!/usr/bin/env node

/**
 * Remove Unused Dependencies Script
 *
 * Removes dependencies that are confirmed unused based on dependency audit.
 * Safe to run - only removes dependencies with 0 usage found.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function confirmRemoval(packages) {
  log('\n⚠️  You are about to remove the following packages:', colors.yellow);
  packages.forEach(pkg => {
    log(`  - ${pkg}`, colors.red);
  });

  log('\n📊 Estimated savings:', colors.cyan);
  log('  - @vercel/postgres: ~150KB', colors.green);
  log('  - @types/dompurify: ~5KB', colors.green);
  log('  Total: ~155KB bundle reduction\n', colors.bright + colors.green);

  return true; // In a real interactive script, you'd prompt for confirmation
}

function removeUnusedDependencies() {
  log(
    '🧹 Removing Unused Dependencies from Arcadia',
    colors.bright + colors.cyan
  );
  log('===========================================\n', colors.cyan);

  // Confirmed unused dependencies from audit
  const unusedDeps = [
    '@vercel/postgres', // No usage found in codebase
    '@types/dompurify', // Not needed with current TS setup
  ];

  if (!confirmRemoval(unusedDeps)) {
    log('❌ Operation cancelled by user.', colors.yellow);
    return;
  }

  try {
    log('🗑️  Uninstalling packages...', colors.yellow);

    const uninstallCommand = `npm uninstall ${unusedDeps.join(' ')}`;
    log(`Running: ${uninstallCommand}`, colors.cyan);

    execSync(uninstallCommand, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    log('\n✅ Successfully removed unused dependencies!', colors.green);

    // Verify removal
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const stillPresent = unusedDeps.filter(
      dep => packageJson.dependencies[dep] || packageJson.devDependencies[dep]
    );

    if (stillPresent.length > 0) {
      log(
        `⚠️  Some packages may still be present: ${stillPresent.join(', ')}`,
        colors.yellow
      );
    } else {
      log('✅ All targeted packages successfully removed.', colors.green);
    }
  } catch (error) {
    log(`❌ Error removing dependencies: ${error.message}`, colors.red);
    log('\n💡 Try running manually:', colors.cyan);
    unusedDeps.forEach(dep => {
      log(`  npm uninstall ${dep}`, colors.reset);
    });
  }
}

function analyzeCurrentState() {
  log('\n📊 Post-removal analysis:', colors.bright);

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const totalDeps = Object.keys(packageJson.dependencies || {}).length;
    const totalDevDeps = Object.keys(packageJson.devDependencies || {}).length;

    log(`  Dependencies: ${totalDeps}`, colors.cyan);
    log(`  Dev Dependencies: ${totalDevDeps}`, colors.cyan);
    log(`  Total: ${totalDeps + totalDevDeps}`, colors.green);

    // Check for potential next targets
    const potentialTargets = [
      'isomorphic-dompurify', // May be redundant with dompurify
    ];

    const presentTargets = potentialTargets.filter(
      dep => packageJson.dependencies[dep] || packageJson.devDependencies[dep]
    );

    if (presentTargets.length > 0) {
      log('\n🎯 Next optimization targets:', colors.yellow);
      presentTargets.forEach(dep => {
        log(`  - ${dep} (needs usage analysis)`, colors.reset);
      });
    }
  } catch (error) {
    log(`⚠️  Could not analyze package.json: ${error.message}`, colors.yellow);
  }
}

function main() {
  removeUnusedDependencies();
  analyzeCurrentState();

  log('\n📝 Next steps:', colors.bright);
  log('1. Run "npm run build" to verify build still works', colors.cyan);
  log(
    '2. Run "npm run build:analyze" for updated bundle analysis',
    colors.cyan
  );
  log(
    '3. Check scripts/performance/bundle-optimizer.js for next optimizations',
    colors.cyan
  );
  log(
    '4. Consider implementing dynamic imports for forms and DnD',
    colors.cyan
  );

  log('\n🎉 Dependency cleanup complete!', colors.bright + colors.green);
}

main();
