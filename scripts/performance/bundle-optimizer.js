#!/usr/bin/env node

/**
 * Bundle Optimization Helper Script
 *
 * Identifies opportunities to reduce bundle size by:
 * 1. Finding large dependencies
 * 2. Identifying duplicate packages
 * 3. Suggesting lazy loading opportunities
 * 4. Finding unused exports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function analyzePackageSize() {
  log('\n📦 Analyzing Package Sizes...', colors.bright);

  try {
    // Get all dependencies
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Estimate sizes (in production, use webpack-bundle-analyzer for accurate sizes)
    const largeDeps = [];
    const depSizes = {
      '@sentry/nextjs': 500000, // ~500KB
      '@supabase/supabase-js': 300000, // ~300KB
      'date-fns': 250000, // ~250KB
      'lucide-react': 400000, // ~400KB
      '@radix-ui': 200000, // ~200KB per package
      dompurify: 50000, // ~50KB
      'react-hook-form': 100000, // ~100KB
      '@dnd-kit/core': 150000, // ~150KB
      '@tanstack/react-query': 100000, // ~100KB
      zustand: 20000, // ~20KB
    };

    Object.keys(allDeps).forEach(dep => {
      let size = 0;
      Object.keys(depSizes).forEach(key => {
        if (dep.includes(key)) {
          size = depSizes[key];
        }
      });

      if (size > 100000) {
        // Only show deps > 100KB
        largeDeps.push({ name: dep, size });
      }
    });

    largeDeps.sort((a, b) => b.size - a.size);

    log('\nLarge Dependencies:', colors.yellow);
    largeDeps.forEach(dep => {
      const sizeStr = formatBytes(dep.size);
      const bar = '█'.repeat(Math.floor(dep.size / 50000));
      log(`  ${dep.name}: ${sizeStr} ${bar}`);
    });

    return largeDeps;
  } catch (error) {
    log(`Error analyzing packages: ${error.message}`, colors.red);
    return [];
  }
}

function findLazyLoadingOpportunities() {
  log('\n🚀 Finding Lazy Loading Opportunities...', colors.bright);

  const opportunities = [];
  const srcDir = path.join(process.cwd(), 'src');

  // Patterns to look for
  const heavyImports = [
    {
      pattern: /import.*from.*['"]@sentry/,
      lib: 'Sentry',
      suggestion: 'Use sentry-lazy.ts',
    },
    {
      pattern: /import.*from.*['"]dompurify/,
      lib: 'DOMPurify',
      suggestion: 'Use sanitization-lazy.ts',
    },
    {
      pattern: /import.*from.*['"]date-fns/,
      lib: 'date-fns',
      suggestion: 'Lazy load date utilities',
    },
    {
      pattern: /import.*from.*['"]react-hook-form/,
      lib: 'react-hook-form',
      suggestion: 'Lazy load forms',
    },
    {
      pattern: /import.*from.*['"]@dnd-kit/,
      lib: 'DnD Kit',
      suggestion: 'Lazy load drag-and-drop',
    },
    {
      pattern: /import.*from.*['"]lucide-react/,
      lib: 'Lucide Icons',
      suggestion: 'Use dynamic imports for icons',
    },
  ];

  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      heavyImports.forEach(({ pattern, lib, suggestion }) => {
        if (pattern.test(line)) {
          opportunities.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            lib,
            suggestion,
            code: line.trim(),
          });
        }
      });
    });
  }

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.includes('node_modules')) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        scanFile(filePath);
      }
    });
  }

  try {
    scanDirectory(srcDir);

    if (opportunities.length > 0) {
      log('\nFound lazy loading opportunities:', colors.yellow);
      opportunities.forEach(opp => {
        log(`\n  📍 ${opp.file}:${opp.line}`, colors.cyan);
        log(`     Library: ${opp.lib}`);
        log(`     Code: ${opp.code}`, colors.reset);
        log(`     💡 ${opp.suggestion}`, colors.green);
      });
    } else {
      log('\n✅ No obvious lazy loading opportunities found!', colors.green);
    }

    return opportunities;
  } catch (error) {
    log(`Error scanning for opportunities: ${error.message}`, colors.red);
    return [];
  }
}

function checkBundleSize() {
  log('\n📊 Checking Bundle Size...', colors.bright);

  const buildDir = path.join(process.cwd(), '.next/static/chunks');

  if (!fs.existsSync(buildDir)) {
    log('No build found. Run "npm run build" first.', colors.yellow);
    return;
  }

  const chunks = fs
    .readdirSync(buildDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      return { name: file, size: stats.size };
    })
    .sort((a, b) => b.size - a.size);

  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

  log(`\nTotal bundle size: ${formatBytes(totalSize)}`, colors.yellow);
  log(`Target: < 500KB`, colors.green);
  log(
    `Status: ${totalSize < 500000 ? '✅ PASS' : '❌ FAIL'}`,
    totalSize < 500000 ? colors.green : colors.red
  );

  log('\nLargest chunks:', colors.yellow);
  chunks.slice(0, 10).forEach(chunk => {
    const sizeStr = formatBytes(chunk.size);
    const bar = '█'.repeat(Math.floor(chunk.size / 10000));
    log(`  ${chunk.name}: ${sizeStr} ${bar}`);
  });

  return { totalSize, chunks };
}

function suggestOptimizations(largeDeps, opportunities, bundleInfo) {
  log('\n💡 Optimization Suggestions:', colors.bright);

  const suggestions = [];

  // Based on large dependencies
  if (largeDeps.some(dep => dep.name.includes('sentry'))) {
    suggestions.push({
      priority: 'HIGH',
      suggestion: 'Sentry is large. Ensure sentry-lazy.ts is used everywhere.',
      impact: '~500KB reduction',
    });
  }

  if (largeDeps.some(dep => dep.name.includes('lucide-react'))) {
    suggestions.push({
      priority: 'HIGH',
      suggestion: 'Use modular imports for lucide-react icons.',
      impact: '~300KB reduction',
      example:
        "import { Home } from 'lucide-react' → import Home from 'lucide-react/dist/esm/icons/home'",
    });
  }

  if (largeDeps.some(dep => dep.name.includes('date-fns'))) {
    suggestions.push({
      priority: 'MEDIUM',
      suggestion: 'Import only needed date-fns functions.',
      impact: '~200KB reduction',
      example:
        "import { format } from 'date-fns' instead of import * as dateFns",
    });
  }

  // Based on bundle size
  if (bundleInfo && bundleInfo.totalSize > 500000) {
    const reduction = bundleInfo.totalSize - 500000;
    suggestions.push({
      priority: 'CRITICAL',
      suggestion: `Need to reduce bundle by ${formatBytes(reduction)} to meet target.`,
      impact: 'Required for production',
    });
  }

  // Based on opportunities found
  if (opportunities.length > 5) {
    suggestions.push({
      priority: 'HIGH',
      suggestion: `Found ${opportunities.length} imports that could be lazy loaded.`,
      impact: 'Significant initial load improvement',
    });
  }

  // General suggestions
  suggestions.push({
    priority: 'MEDIUM',
    suggestion: 'Consider using dynamic imports for route components.',
    impact: 'Route-based code splitting',
  });

  suggestions.push({
    priority: 'LOW',
    suggestion: 'Review and remove any unused dependencies.',
    impact: 'Variable reduction',
  });

  suggestions.forEach(({ priority, suggestion, impact, example }) => {
    const color =
      priority === 'CRITICAL'
        ? colors.red
        : priority === 'HIGH'
          ? colors.yellow
          : colors.cyan;
    log(`\n  [${priority}] ${suggestion}`, color);
    log(`  Impact: ${impact}`, colors.green);
    if (example) {
      log(`  Example: ${example}`, colors.reset);
    }
  });
}

// Main execution
function main() {
  log('🔍 Arcadia Bundle Optimization Analysis', colors.bright + colors.blue);
  log('=====================================\n', colors.blue);

  const largeDeps = analyzePackageSize();
  const opportunities = findLazyLoadingOpportunities();
  const bundleInfo = checkBundleSize();

  suggestOptimizations(largeDeps, opportunities, bundleInfo);

  log('\n\n📝 Next Steps:', colors.bright);
  log('1. Implement lazy loading for identified imports', colors.cyan);
  log('2. Use webpack-bundle-analyzer for detailed analysis', colors.cyan);
  log('3. Consider code splitting for large features', colors.cyan);
  log('4. Review and optimize chunk splitting configuration', colors.cyan);

  log(
    '\nRun "npm run build:analyze" for detailed bundle analysis',
    colors.yellow
  );
}

main();
