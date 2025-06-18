#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FileProcessor {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  files?: string[];
}

// Complex replacements that need special handling
const processors: FileProcessor[] = [
  // Fix any in function parameters
  {
    pattern: /\(([^)]*)\s*:\s*any\)/g,
    replacement: (_match, param) => {
      // Common parameter patterns
      if (param.includes('event')) return `(${param}: unknown)`;
      if (param.includes('error')) return `(${param}: Error | unknown)`;
      if (param.includes('data')) return `(${param}: unknown)`;
      if (param.includes('value')) return `(${param}: unknown)`;
      if (param.includes('arg')) return `(${param}: unknown)`;
      return `(${param}: unknown)`;
    }
  },
  
  // Fix any in arrow functions
  {
    pattern: /=>\s*\(([^)]*)\s*:\s*any\)/g,
    replacement: '=> ($1: unknown)'
  },
  
  // Fix any in destructuring
  {
    pattern: /\{\s*([^}]+)\s*\}\s*:\s*any/g,
    replacement: '{ $1 }: unknown'
  },
  
  // Fix specific window.any patterns
  {
    pattern: /\(window as any\)\./g,
    replacement: '(window as TestWindow).'
  },
  
  // Fix any[] in forEach/map/filter
  {
    pattern: /\.forEach\(\(([^:)]+):\s*any\)/g,
    replacement: '.forEach(($1: unknown)'
  },
  {
    pattern: /\.map\(\(([^:)]+):\s*any\)/g,
    replacement: '.map(($1: unknown)'
  },
  {
    pattern: /\.filter\(\(([^:)]+):\s*any\)/g,
    replacement: '.filter(($1: unknown)'
  },
  
  // Fix any in type assertions
  {
    pattern: /as\s+any\s*;/g,
    replacement: 'as unknown;'
  },
  
  // Fix any in variable declarations
  {
    pattern: /let\s+(\w+)\s*:\s*any\s*=/g,
    replacement: 'let $1: unknown ='
  },
  {
    pattern: /const\s+(\w+)\s*:\s*any\s*=/g,
    replacement: 'const $1: unknown ='
  },
  
  // Fix any in object properties
  {
    pattern: /(\w+)\s*:\s*any;/g,
    replacement: (_match, prop) => {
      // Common property patterns
      if (prop.includes('handler') || prop.includes('callback')) return `${prop}: (...args: unknown[]) => unknown;`;
      if (prop.includes('data')) return `${prop}: unknown;`;
      if (prop.includes('error')) return `${prop}: Error | unknown;`;
      return `${prop}: unknown;`;
    }
  },
  
  // Fix Record<string, any>
  {
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>'
  },
  
  // Fix Promise<any>
  {
    pattern: /Promise<any>/g,
    replacement: 'Promise<unknown>'
  },
  
  // Fix specific test patterns
  {
    pattern: /\(e:\s*any\)/g,
    replacement: '(e: unknown)'
  },
  {
    pattern: /\(item:\s*any\)/g,
    replacement: '(item: unknown)'
  },
  
  // SEO test specific fixes
  {
    pattern: /item\['@type'\]/g,
    replacement: "(item as Record<string, unknown>)['@type']",
    files: ['seo.spec.ts']
  },
  
  // Analytics test specific fixes
  {
    pattern: /\(window as any\)\.gtag/g,
    replacement: '(window as TestWindow).gtag',
    files: ['analytics.spec.ts', 'analytics.ts']
  },
  {
    pattern: /\(window as any\)\.dataLayer/g,
    replacement: '(window as TestWindow).dataLayer',
    files: ['analytics.spec.ts', 'analytics.ts']
  },
  
  // Accessibility test specific fixes
  {
    pattern: /violations:\s*any\[\]/g,
    replacement: 'violations: unknown[]',
    files: ['accessibility.spec.ts', 'accessibility-helpers.ts']
  },
  
  // Mock helper specific fixes
  {
    pattern: /__originalOpen:\s*any/g,
    replacement: '__originalOpen?: typeof window.open',
    files: ['board-sharing.spec.ts']
  },
  {
    pattern: /__originalCreateObjectURL:\s*any/g,
    replacement: '__originalCreateObjectURL?: typeof URL.createObjectURL',
    files: ['board-sharing.spec.ts']
  }
];

function processFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  const filename = filePath.split('/').pop() || '';
  
  // Check if file needs TestWindow import
  const needsTestWindowImport = content.includes('window as any') || 
                               content.includes('window as TestWindow');
  
  if (needsTestWindowImport && !content.includes("from '../types/test-types'") && 
      !content.includes("from '../../types/test-types'") && 
      !content.includes("from '../../../types/test-types'")) {
    // Determine correct import path based on file location
    const testPathParts = filePath.split('/tests/')[1];
    const depth = testPathParts ? testPathParts.split('/').length - 1 : 0;
    const importPath = '../'.repeat(depth) + 'types/test-types';
    const importLine = `import type { TestWindow } from '${importPath}';`;
    
    // Add import after last import
    const importMatch = content.match(/^import[^;]+;$/gm);
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      if (lastImport) {
        const index = content.lastIndexOf(lastImport);
        content = content.slice(0, index + lastImport.length) + '\n' + importLine + content.slice(index + lastImport.length);
        modified = true;
      }
    }
  }
  
  // Apply processors
  for (const processor of processors) {
    // Skip if processor is for specific files and this isn't one of them
    if (processor.files && !processor.files.some(f => filename.includes(f))) {
      continue;
    }
    
    const newContent = typeof processor.replacement === 'string'
      ? content.replace(processor.pattern, processor.replacement)
      : content.replace(processor.pattern, processor.replacement);
    
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  // Final cleanup - remove any remaining standalone 'any' types
  const finalCleanup = content
    .replace(/:\s*any(?![a-zA-Z])/g, ': unknown')
    .replace(/as\s+any(?![a-zA-Z])/g, 'as unknown');
  
  if (finalCleanup !== content) {
    content = finalCleanup;
    modified = true;
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`Fixed remaining any types in ${filePath}`);
  }
}

function processDirectory(dir: string) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !entry.includes('node_modules')) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  }
}

// Process test directory
const testDir = join(process.cwd(), 'tests');
processDirectory(testDir);

console.log('Completed fixing remaining any types in test files');