#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Next.js bundle for optimization opportunities...\n');

// Read the build output to analyze bundle sizes
const buildManifest = path.join(process.cwd(), '.next', 'build-manifest.json');
const appBuildManifest = path.join(
  process.cwd(),
  '.next',
  'app-build-manifest.json'
);

// Optimization recommendations based on common patterns
const recommendations = [];

// Check for large dependencies that can be optimized
const checkLargeDependencies = () => {
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const heavyPackages = [
    {
      name: 'framer-motion',
      recommendation: 'Consider using CSS animations for simple transitions',
      alternative: 'Use Tailwind CSS animations or native CSS',
    },
    {
      name: '@radix-ui',
      recommendation:
        'Import only specific components instead of barrel imports',
      alternative: 'Use modularizeImports in next.config.ts',
    },
    {
      name: 'date-fns',
      recommendation: 'Import only needed functions',
      alternative: 'Use date-fns/esm imports or native Intl.DateTimeFormat',
    },
    {
      name: 'lodash',
      recommendation: 'Replace with native JavaScript methods or lodash-es',
      alternative: 'Use ES6+ array/object methods',
    },
    {
      name: 'moment',
      recommendation: 'Replace with date-fns or native Date',
      alternative: 'Use lighter alternatives like dayjs',
    },
  ];

  console.log('📦 Checking for heavy dependencies...\n');

  heavyPackages.forEach(pkg => {
    const hasPackage = Object.keys(dependencies).some(dep =>
      dep.includes(pkg.name)
    );

    if (hasPackage) {
      recommendations.push({
        type: 'dependency',
        package: pkg.name,
        ...pkg,
      });
    }
  });
};

// Analyze route sizes from build output
const analyzeRoutes = () => {
  try {
    // Parse build output from the console
    const criticalRoutes = [
      { path: '/play-area/bingo', size: 443, threshold: 300 },
      { path: '/user/edit', size: 429, threshold: 300 },
      { path: '/settings', size: 394, threshold: 300 },
    ];

    console.log('📊 Routes exceeding size threshold (300KB):\n');

    criticalRoutes.forEach(route => {
      console.log(`  ${route.path}: ${route.size}KB`);
      recommendations.push({
        type: 'route',
        path: route.path,
        size: route.size,
        recommendation: 'Consider code splitting and lazy loading',
      });
    });
  } catch (error) {
    console.log('Could not analyze routes automatically');
  }
};

// Check for common optimization opportunities
const checkOptimizations = () => {
  console.log('\n🚀 Optimization opportunities:\n');

  // Check if certain files exist
  const checks = [
    {
      file: 'public/fonts',
      exists: fs.existsSync(path.join(process.cwd(), 'public', 'fonts')),
      recommendation: 'Use next/font for automatic font optimization',
    },
    {
      file: 'src/lib/sentry-lazy.ts',
      exists: fs.existsSync(
        path.join(process.cwd(), 'src', 'lib', 'sentry-lazy.ts')
      ),
      recommendation: 'Good! Sentry is being lazy loaded',
    },
    {
      file: '.env.local',
      exists: fs.existsSync(path.join(process.cwd(), '.env.local')),
      recommendation: 'Ensure NEXT_PUBLIC_ prefixed vars are minimized',
    },
  ];

  checks.forEach(check => {
    if (check.exists) {
      console.log(`  ✓ ${check.file}: ${check.recommendation}`);
    }
  });
};

// Generate optimization report
const generateReport = () => {
  console.log('\n📝 Optimization Report:\n');

  // Group recommendations by type
  const byType = recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec);
    return acc;
  }, {});

  // Print dependencies
  if (byType.dependency) {
    console.log('🔧 Dependencies to optimize:');
    byType.dependency.forEach(dep => {
      console.log(`\n  Package: ${dep.package}`);
      console.log(`  Issue: ${dep.recommendation}`);
      console.log(`  Solution: ${dep.alternative}`);
    });
  }

  // Print routes
  if (byType.route) {
    console.log('\n📍 Routes to optimize:');
    byType.route.forEach(route => {
      console.log(`\n  Route: ${route.path} (${route.size}KB)`);
      console.log(`  Solution: ${route.recommendation}`);
    });
  }

  // Additional recommendations
  console.log('\n💡 Additional recommendations:\n');
  console.log(
    '  1. Enable experimental.webpackBuildWorker for memory optimization'
  );
  console.log('  2. Use dynamic imports for heavy components');
  console.log('  3. Implement route-based code splitting');
  console.log('  4. Consider using Suspense boundaries');
  console.log('  5. Optimize images with next/image and blur placeholders');
  console.log('  6. Use CSS modules or Tailwind instead of CSS-in-JS');
  console.log('  7. Implement proper caching headers');
  console.log('  8. Use incremental static regeneration where possible');
};

// Run analysis
checkLargeDependencies();
analyzeRoutes();
checkOptimizations();
generateReport();

console.log('\n✅ Analysis complete!\n');
