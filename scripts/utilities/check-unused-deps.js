#!/usr/bin/env node

/**
 * Check for unused dependencies
 */

const fs = require('fs');
const path = require('path');

const packageJson = require('../../package.json');
const dependencies = Object.keys(packageJson.dependencies);

// Dependencies to exclude from checking (known to be used dynamically)
const excludeList = [
  '@sentry/nextjs', // Used in instrumentation
  '@vercel/analytics',
  '@vercel/speed-insights',
  '@vercel/edge-config',
  '@upstash/redis',
  '@upstash/ratelimit',
  'tailwindcss-animate',
  '@tailwindcss/forms',
  '@tailwindcss/typography',
  '@tailwindcss/postcss',
];

function searchForImport(depName, directory) {
  let found = false;

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !file.includes('node_modules') &&
        !file.startsWith('.')
      ) {
        walkDir(filePath);
      } else if (
        (file.endsWith('.ts') ||
          file.endsWith('.tsx') ||
          file.endsWith('.js') ||
          file.endsWith('.jsx')) &&
        !found
      ) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for various import patterns
        const patterns = [
          new RegExp(`from ['"]${depName}['"]`),
          new RegExp(`from ['"]${depName}/`),
          new RegExp(`require\\(['"]${depName}['"]\\)`),
          new RegExp(`require\\(['"]${depName}/`),
        ];

        if (patterns.some(pattern => pattern.test(content))) {
          found = true;
          return;
        }
      }
    }
  }

  walkDir(directory);
  return found;
}

console.log('\n🔍 Checking for unused dependencies...\n');

const srcDir = path.join(process.cwd(), 'src');
const unused = [];

for (const dep of dependencies) {
  if (excludeList.includes(dep)) {
    continue;
  }

  process.stdout.write(`Checking ${dep}...`);

  if (!searchForImport(dep, srcDir)) {
    unused.push(dep);
    console.log(' ❌ Not found');
  } else {
    console.log(' ✅ Found');
  }
}

if (unused.length > 0) {
  console.log('\n📦 Potentially unused dependencies:');
  unused.forEach(dep => console.log(`  - ${dep}`));
  console.log(
    '\n💡 Consider removing these dependencies to reduce bundle size'
  );
  console.log('   npm uninstall ' + unused.join(' '));
} else {
  console.log('\n✅ All dependencies appear to be in use!');
}

console.log('\n');
