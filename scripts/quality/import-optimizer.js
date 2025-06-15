#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const IMPORT_PATTERNS = {
  barrelImport: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"];?/g,
  defaultImport: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
  namedImport: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"];?/g,
  typeImport: /import\s+type\s+/,
  unusedImport: /import\s+[^;]+;\s*\/\/\s*unused/i,
};

const KNOWN_BARREL_EXPORTS = {
  'react-icons': true,
  '@radix-ui': true,
  'lucide-react': false, // Good - already optimized
  '@/components': true,
  '@/features': true,
  '@/hooks': true,
  '@/lib': true,
  '@/utils': true,
};

async function analyzeImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const analysis = {
    barrelImports: [],
    duplicateImports: new Map(),
    unusedImports: [],
    largeImports: [],
  };

  // Track all imports to find duplicates
  const importMap = new Map();

  lines.forEach((line, index) => {
    // Skip type imports
    if (IMPORT_PATTERNS.typeImport.test(line)) return;

    // Check for barrel imports
    const barrelMatch = line.match(IMPORT_PATTERNS.barrelImport);
    if (barrelMatch && barrelMatch.length >= 3) {
      const [, imports, source] = barrelMatch;
      if (!imports || !source) return;

      const importCount = imports.split(',').length;

      // Check if it's a known barrel export
      const isBarrel = Object.keys(KNOWN_BARREL_EXPORTS).some(
        key => source.includes(key) && KNOWN_BARREL_EXPORTS[key]
      );

      if (isBarrel || importCount > 5) {
        analysis.barrelImports.push({
          file: filePath,
          line: index + 1,
          source,
          imports: imports.trim(),
          count: importCount,
        });
      }

      // Track for duplicates
      if (!importMap.has(source)) {
        importMap.set(source, []);
      }
      importMap.get(source).push({ line: index + 1, imports });
    }
  });

  // Find duplicate imports from same source
  importMap.forEach((imports, source) => {
    if (imports.length > 1) {
      analysis.duplicateImports.set(source, imports);
    }
  });

  return analysis;
}

function generateModularizeConfig(barrelImports) {
  const config = {};

  // Group by source
  const bySource = barrelImports.reduce((acc, imp) => {
    const baseSource = imp.source.split('/')[0];
    if (!acc[baseSource]) acc[baseSource] = new Set();
    imp.imports.split(',').forEach(i => acc[baseSource].add(i.trim()));
    return acc;
  }, {});

  // Generate config for each source
  Object.entries(bySource).forEach(([source, imports]) => {
    if (source === 'react-icons') {
      config['react-icons'] = {
        transform: 'react-icons/{{member}}',
      };
    } else if (source.startsWith('@radix-ui')) {
      config[source] = {
        transform: `${source}/dist/{{member}}`,
      };
    }
  });

  return config;
}

async function main() {
  console.log('🔍 Import Optimizer - Analyzing import patterns...\n');

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

  const allBarrelImports = [];
  const allDuplicates = new Map();
  let filesWithIssues = 0;

  for (const file of files) {
    const analysis = await analyzeImports(file);

    if (analysis.barrelImports.length > 0) {
      filesWithIssues++;
      allBarrelImports.push(...analysis.barrelImports);
    }

    if (analysis.duplicateImports.size > 0) {
      analysis.duplicateImports.forEach((imports, source) => {
        if (!allDuplicates.has(file)) {
          allDuplicates.set(file, new Map());
        }
        allDuplicates.get(file).set(source, imports);
      });
    }
  }

  // Display results
  if (allBarrelImports.length === 0 && allDuplicates.size === 0) {
    console.log('✅ No import optimization opportunities found!');
    process.exit(0);
  }

  console.log(
    `📊 Found optimization opportunities in ${filesWithIssues} files:\n`
  );

  // Barrel imports
  if (allBarrelImports.length > 0) {
    console.log(`\n🛢️  Barrel Imports (${allBarrelImports.length} total):`);
    console.log('These imports could increase bundle size:\n');

    // Group by source
    const bySource = allBarrelImports.reduce((acc, imp) => {
      if (!acc[imp.source]) acc[imp.source] = [];
      acc[imp.source].push(imp);
      return acc;
    }, {});

    Object.entries(bySource)
      .slice(0, 5)
      .forEach(([source, imports]) => {
        console.log(`  From "${source}" (${imports.length} files):`);
        imports.slice(0, 3).forEach(imp => {
          console.log(`    ${imp.file}:${imp.line}`);
          console.log(`    > import { ${imp.imports} } from '${source}'`);
        });
        if (imports.length > 3) {
          console.log(`    ... and ${imports.length - 3} more\n`);
        }
      });
  }

  // Duplicate imports
  if (allDuplicates.size > 0) {
    console.log(`\n🔁 Duplicate Imports:`);
    console.log('These files import from the same source multiple times:\n');

    let shown = 0;
    allDuplicates.forEach((sources, file) => {
      if (shown++ < 5) {
        console.log(`  ${file}:`);
        sources.forEach((imports, source) => {
          console.log(`    "${source}" imported ${imports.length} times`);
        });
        console.log('');
      }
    });
  }

  // Generate optimization suggestions
  console.log('\n💡 Optimization Suggestions:\n');

  console.log('1. Add to next.config.ts for automatic optimization:');
  const modularizeConfig = generateModularizeConfig(
    allBarrelImports.slice(0, 10)
  );
  if (Object.keys(modularizeConfig).length > 0) {
    console.log(`
module.exports = {
  modularizeImports: ${JSON.stringify(modularizeConfig, null, 2).replace(/\n/g, '\n  ')}
}`);
  }

  console.log('\n2. For internal barrel imports (@/components, @/features):');
  console.log('   - Import specific files: @/components/ui/Button');
  console.log('   - Or create named export files: @/components/ui/index.ts');

  console.log('\n3. Combine duplicate imports:');
  console.log('   Before: import { A } from "lib"; import { B } from "lib";');
  console.log('   After:  import { A, B } from "lib";');

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    filesAnalyzed: files.length,
    filesWithIssues,
    barrelImports: allBarrelImports.length,
    duplicateImports: allDuplicates.size,
    suggestions: {
      modularizeImports: modularizeConfig,
      topBarrelImports: Object.entries(
        allBarrelImports.reduce((acc, imp) => {
          acc[imp.source] = (acc[imp.source] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    },
  };

  fs.writeFileSync(
    path.join(__dirname, 'import-optimization-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(
    '\n📊 Full report saved to scripts/import-optimization-report.json'
  );

  process.exit(0);
}

main().catch(console.error);
