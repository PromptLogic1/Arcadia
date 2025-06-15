#!/usr/bin/env node

/**
 * Lazy Loading Implementation Script
 *
 * Identifies opportunities to implement lazy loading for heavy libraries
 * and provides code snippets for implementation.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

const lazyLoadingPatterns = {
  'date-fns': {
    imports: ['format', 'formatDistanceToNow', 'formatRelative', 'parseISO'],
    replacement: `// Replace:
// import { format } from 'date-fns';
// With:
import { formatLazy as format } from '@/lib/date-utils-lazy';

// For synchronous usage (SSR):
import { formatDateFallback } from '@/lib/date-utils-lazy';`,
    async: true,
  },
  'react-hook-form': {
    imports: ['useForm', 'Controller', 'useWatch'],
    replacement: `// For form-heavy pages, keep direct imports
// For occasional forms, consider lazy loading:
// import { createLazyFormHook } from '@/lib/form-utils-lazy';`,
    async: false,
  },
  '@dnd-kit': {
    imports: ['useDraggable', 'useDroppable', 'DndContext'],
    replacement: `// Lazy load the entire editor component instead:
const BingoBoardEdit = dynamic(
  () => import('@/features/bingo-boards/components/bingo-boards-edit/BingoBoardEdit'),
  { ssr: false }
);`,
    async: false,
  },
  dompurify: {
    imports: ['DOMPurify'],
    replacement: `// Replace:
// import DOMPurify from 'dompurify';
// With:
import { sanitizeHtmlLazy } from '@/lib/sanitization-lazy';

// For immediate needs (SSR):
import { sanitizeHtmlSync } from '@/lib/sanitization-lazy';`,
    async: true,
  },
  '@sentry': {
    imports: ['captureException', 'captureMessage', 'setUser'],
    replacement: `// Replace:
// import * as Sentry from '@sentry/nextjs';
// With:
import { captureException, captureMessage, setUser } from '@/lib/sentry-lazy';`,
    async: true,
  },
};

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const recommendations = [];

  Object.entries(lazyLoadingPatterns).forEach(([lib, config]) => {
    const importRegex = new RegExp(
      `import\\s*{([^}]+)}\\s*from\\s*['"]${lib}[^'"]*['"]`,
      'g'
    );

    const matches = [...content.matchAll(importRegex)];

    if (matches.length > 0) {
      const importedItems = matches.flatMap(match =>
        match[1].split(',').map(item => item.trim())
      );

      const relevantImports = importedItems.filter(item =>
        config.imports.some(configImport => item.includes(configImport))
      );

      if (relevantImports.length > 0) {
        recommendations.push({
          file: filePath,
          library: lib,
          imports: relevantImports,
          config: config,
        });
      }
    }
  });

  return recommendations;
}

function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if it's a page component
  const isPage = filePath.includes('/app/') && filePath.endsWith('/page.tsx');

  // Check if it's already using dynamic imports
  const hasDynamic = content.includes('dynamic(') || content.includes('lazy(');

  // Check component size (rough estimate based on lines)
  const lines = content.split('\n').length;
  const isLarge = lines > 200;

  // Check for heavy library usage
  const usesHeavyLibs = Object.keys(lazyLoadingPatterns).some(lib =>
    content.includes(`from '${lib}`)
  );

  return {
    isPage,
    hasDynamic,
    isLarge,
    usesHeavyLibs,
    lines,
  };
}

function scanDirectory(dir) {
  const results = {
    recommendations: [],
    pageComponents: [],
    largeComponents: [],
  };

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !file.includes('node_modules') &&
        !file.includes('.next')
      ) {
        scan(filePath);
      } else if (
        (file.endsWith('.tsx') || file.endsWith('.ts')) &&
        !file.includes('.test.')
      ) {
        // Analyze for lazy loading opportunities
        const fileRecommendations = analyzeFile(filePath);
        results.recommendations.push(...fileRecommendations);

        // Analyze component characteristics
        if (file.endsWith('.tsx')) {
          const analysis = analyzeComponent(filePath);

          if (
            analysis.isPage &&
            !analysis.hasDynamic &&
            analysis.usesHeavyLibs
          ) {
            results.pageComponents.push({
              file: path.relative(process.cwd(), filePath),
              ...analysis,
            });
          }

          if (analysis.isLarge && analysis.usesHeavyLibs) {
            results.largeComponents.push({
              file: path.relative(process.cwd(), filePath),
              ...analysis,
            });
          }
        }
      }
    });
  }

  scan(dir);
  return results;
}

function generateReport(results) {
  log('\n📊 Lazy Loading Implementation Report', colors.bright + colors.blue);
  log('=====================================\n', colors.blue);

  // Group recommendations by library
  const byLibrary = {};
  results.recommendations.forEach(rec => {
    if (!byLibrary[rec.library]) {
      byLibrary[rec.library] = [];
    }
    byLibrary[rec.library].push(rec);
  });

  // Report by library
  Object.entries(byLibrary).forEach(([lib, recs]) => {
    log(`\n📦 ${lib} (${recs.length} files)`, colors.yellow);

    const config = lazyLoadingPatterns[lib];
    log('\nImplementation:', colors.green);
    console.log(config.replacement);

    log('\nAffected files:', colors.cyan);
    recs.slice(0, 5).forEach(rec => {
      console.log(`  - ${path.relative(process.cwd(), rec.file)}`);
      console.log(`    Imports: ${rec.imports.join(', ')}`);
    });

    if (recs.length > 5) {
      log(`  ... and ${recs.length - 5} more files`, colors.reset);
    }
  });

  // Page components that could use dynamic imports
  if (results.pageComponents.length > 0) {
    log('\n\n📄 Page Components for Dynamic Import', colors.yellow);
    log(
      'These page components use heavy libraries and could benefit from dynamic imports:',
      colors.reset
    );

    results.pageComponents.forEach(comp => {
      log(`\n  ${comp.file}`, colors.cyan);
      log(`    Lines: ${comp.lines}, Uses heavy libs: ${comp.usesHeavyLibs}`);
      log(
        '    Recommendation: Consider using dynamic imports for heavy features'
      );
    });
  }

  // Large components
  if (results.largeComponents.length > 0) {
    log('\n\n📏 Large Components', colors.yellow);
    log('These components are large and use heavy libraries:', colors.reset);

    results.largeComponents.slice(0, 10).forEach(comp => {
      log(`  ${comp.file} (${comp.lines} lines)`, colors.cyan);
    });
  }

  // Summary
  log('\n\n📝 Summary', colors.bright);
  log(
    `Total files with optimization opportunities: ${results.recommendations.length}`,
    colors.green
  );
  log(
    `Page components that could use dynamic imports: ${results.pageComponents.length}`,
    colors.green
  );
  log(
    `Large components that could be split: ${results.largeComponents.length}`,
    colors.green
  );

  // Estimated impact
  const estimatedReduction = {
    'date-fns': 200,
    'react-hook-form': 100,
    '@dnd-kit': 150,
    dompurify: 50,
    '@sentry': 100,
  };

  let totalEstimatedReduction = 0;
  Object.entries(byLibrary).forEach(([lib, recs]) => {
    if (estimatedReduction[lib]) {
      totalEstimatedReduction += estimatedReduction[lib];
    }
  });

  log(
    `\nEstimated bundle size reduction: ~${totalEstimatedReduction}KB`,
    colors.green
  );

  // Next steps
  log('\n\n🚀 Next Steps:', colors.bright);
  log(
    '1. Implement lazy loading for date-fns in non-critical paths',
    colors.cyan
  );
  log('2. Use dynamic imports for heavy page components', colors.cyan);
  log('3. Lazy load form libraries on non-form pages', colors.cyan);
  log('4. Consider code splitting for large components', colors.cyan);
  log('5. Implement route-based code splitting for features', colors.cyan);
}

// Main execution
const srcDir = path.join(process.cwd(), 'src');
const results = scanDirectory(srcDir);
generateReport(results);
