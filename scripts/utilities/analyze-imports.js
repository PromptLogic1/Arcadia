#!/usr/bin/env node

/**
 * Import Analyzer - Identifies barrel exports and large modules
 */

const fs = require('fs');
const path = require('path');

function analyzeImports(directory) {
  const results = {
    barrelExports: [],
    largeModules: [],
    circularDeps: [],
  };

  function isBarrelExport(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const exportCount = (content.match(/export \{|export \*/g) || []).length;
    return exportCount > 3; // More than 3 exports suggests a barrel
  }

  function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !file.includes('node_modules') &&
        !file.startsWith('.')
      ) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        // Check for barrel exports
        if (file === 'index.ts' || file === 'index.tsx') {
          if (isBarrelExport(filePath)) {
            results.barrelExports.push(filePath);
          }
        }

        // Check for large modules
        const size = getFileSize(filePath);
        if (size > 50000) {
          // 50KB
          results.largeModules.push({
            path: filePath,
            size: (size / 1024).toFixed(2) + 'KB',
          });
        }
      }
    });
  }

  walkDir(directory);
  return results;
}

// Run analysis
const srcDir = path.join(process.cwd(), 'src');
const results = analyzeImports(srcDir);

console.log('\n🔍 Import Analysis Report\n');

if (results.barrelExports.length > 0) {
  console.log('📦 Barrel Exports Found:');
  results.barrelExports.forEach(file => {
    console.log(`  - ${file.replace(process.cwd(), '.')}`);
  });
  console.log(
    '\n  💡 Consider replacing barrel exports with direct imports for better tree-shaking\n'
  );
}

if (results.largeModules.length > 0) {
  console.log('📊 Large Modules (>50KB):');
  results.largeModules.forEach(module => {
    console.log(
      `  - ${module.path.replace(process.cwd(), '.')} (${module.size})`
    );
  });
  console.log('\n  💡 Consider splitting these modules or lazy loading them\n');
}

console.log('✅ Analysis complete!\n');
