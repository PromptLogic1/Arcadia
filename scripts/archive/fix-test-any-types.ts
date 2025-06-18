#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// List of replacements to make
const replacements = [
  // Window type replacements
  { from: /\(window as any\)/g, to: '(window as TestWindow)' },
  { from: /\(window as Window & \{ [^}]+ \}\)/g, to: '(window as TestWindow)' },
  { from: /window as unknown as \w+Window/g, to: 'window as TestWindow' },
  
  // Callback replacements
  { from: /: \(event: any\) => void/g, to: ': EventCallback' },
  { from: /: \(\.\.\.args: any\[\]\) => void/g, to: ': (...args: unknown[]) => void' },
  { from: /: \(payload: any\) => void/g, to: ': (payload: unknown) => void' },
  
  // Array replacements
  { from: /: any\[\]/g, to: ': unknown[]' },
  { from: /Array<any>/g, to: 'Array<unknown>' },
  
  // Function replacements
  { from: /: \(\) => any/g, to: ': () => unknown' },
  { from: /: \(arg: any\) => any/g, to: ': (arg: unknown) => unknown' },
  
  // Route handler replacements
  { from: /async route =>/g, to: 'async (route: Route) =>' },
  { from: /async \(route\) =>/g, to: 'async (route: Route) =>' },
  
  // Type annotations
  { from: /: any(?![a-zA-Z])/g, to: ': unknown' },
  { from: /as any(?![a-zA-Z])/g, to: 'as unknown' },
];

// Files to add imports to
const importAdditions = new Map<string, string[]>([
  ['realtime-test-utils.ts', ['import type { TestWindow, SupabaseRealtimeChannel, EventCallback } from \'../../types/test-types\';']],
  ['helpers/community-helpers.ts', ['import type { TestWindow } from \'../../../types/test-types\';']],
  ['websocket-helpers.ts', ['import type { TestWindow } from \'../types/test-types\';']],
]);

function processFile(filePath: string) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Apply replacements
  for (const { from, to } of replacements) {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  // Add imports if needed
  const filename = filePath.split('/').pop() || '';
  const imports = importAdditions.get(filename);
  if (imports) {
    for (const importLine of imports) {
      if (!content.includes(importLine)) {
        // Find the last import line
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
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
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

console.log('Completed fixing any types in test files');