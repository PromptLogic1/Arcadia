#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Replacement {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  description: string;
}

// Only replace console.logs that are clearly debug/development artifacts
const safeReplacements: Replacement[] = [
  // Debug logs that just print test names or status
  {
    pattern: /console\.log\(`Responsive test: \${[^}]+}\`\);?/g,
    replacement: '// Test: Responsive validation',
    description: 'Remove debug test name logs'
  },
  {
    pattern: /console\.log\('Using mock [^']+'\);?/g,
    replacement: '// Using mock service',
    description: 'Remove mock service logs'
  },
  {
    pattern: /console\.log\(`[^`]*API calls made: \${[^}]+}\`\);?/g,
    replacement: '// API call tracking',
    description: 'Remove API call count logs'
  },
  
  // Performance logs that should be assertions instead
  {
    pattern: /console\.log\(`([^`]*time|Time|duration|Duration): \${([^}]+)}(ms)?\`\);?/g,
    replacement: (match: string, label: string, variable: string) => {
      return `// Performance: ${label} = ${variable}ms`;
    },
    description: 'Comment out performance logs (should be assertions)'
  },
  
  // Simple value logging
  {
    pattern: /console\.log\((['"`])([^'"`]+)\1\);?/g,
    replacement: (match: string, quote: string, content: string) => {
      // Only replace if it's a simple debug message
      if (content.match(/^(test|debug|check|value|result)/i)) {
        return `// Debug: ${content}`;
      }
      return match; // Keep the original
    },
    description: 'Replace simple debug logs'
  }
];

// Patterns to definitely keep (test scenarios, error handling, etc.)
const keepPatterns = [
  /circuit breaker/i,
  /retry attempt/i,
  /state recover/i,
  /connection/i,
  /websocket/i,
  /realtime/i,
  /error|failed|exception/i,
  /rollback/i,
  /performance improvements/i,
];

function shouldKeepLog(line: string): boolean {
  return keepPatterns.some(pattern => pattern.test(line));
}

function processFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacementCount = 0;
  
  // First pass: check if logs should be kept
  const lines = content.split('\n');
  const linesToKeep = new Set<number>();
  
  lines.forEach((line, index) => {
    if (line.includes('console.log') && shouldKeepLog(line)) {
      linesToKeep.add(index);
    }
  });
  
  // Second pass: apply safe replacements
  for (const { pattern, replacement, description } of safeReplacements) {
    const newContent = content.replace(pattern, (match, ...args) => {
      const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
      
      // Skip if this line should be kept
      if (linesToKeep.has(lineNumber - 1)) {
        return match;
      }
      
      replacementCount++;
      return typeof replacement === 'string' ? replacement : replacement(match, ...args);
    });
    
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`Updated ${filePath} - Replaced ${replacementCount} console.log statements`);
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

console.log('Replacing safe console.log statements in test files...');
console.log('Keeping: test scenarios, error simulations, and other intentional logs\n');

// Process test directory
const testDir = join(process.cwd(), 'tests');
processDirectory(testDir);

console.log('\nCompleted safe console.log replacement');
console.log('Note: Many console.logs were kept as they simulate real application behavior');