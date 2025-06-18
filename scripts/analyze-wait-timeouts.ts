#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface WaitForTimeoutInstance {
  file: string;
  line: number;
  duration: number;
  context: string;
  purpose: 'network-simulation' | 'retry-wait' | 'animation' | 'debounce' | 'sync-wait' | 'unknown';
  canReplace: boolean;
  suggestion?: string;
}

const timeouts: WaitForTimeoutInstance[] = [];

function analyzeTimeout(line: string, context: string, duration: number): {
  purpose: WaitForTimeoutInstance['purpose'];
  canReplace: boolean;
  suggestion?: string;
} {
  const contextLower = context.toLowerCase();
  
  // Network simulation timeouts
  if (contextLower.includes('timeout') || 
      contextLower.includes('network') ||
      contextLower.includes('offline') ||
      contextLower.includes('connection')) {
    return {
      purpose: 'network-simulation',
      canReplace: false,
      suggestion: 'Keep - simulating network conditions'
    };
  }
  
  // Retry mechanism waits
  if (contextLower.includes('retry') ||
      contextLower.includes('attempt') ||
      contextLower.includes('circuit breaker')) {
    return {
      purpose: 'retry-wait',
      canReplace: false,
      suggestion: 'Keep - testing retry timing'
    };
  }
  
  // Animation waits
  if (contextLower.includes('animation') ||
      contextLower.includes('transition') ||
      contextLower.includes('fade')) {
    return {
      purpose: 'animation',
      canReplace: true,
      suggestion: 'Replace with: await page.waitForFunction(() => !document.querySelector(".animating"))'
    };
  }
  
  // Debounce waits
  if (contextLower.includes('debounce') ||
      contextLower.includes('search') ||
      contextLower.includes('input')) {
    return {
      purpose: 'debounce',
      canReplace: true,
      suggestion: 'Replace with: await page.waitForLoadState("networkidle")'
    };
  }
  
  // Sync waits
  if (contextLower.includes('sync') ||
      contextLower.includes('update') ||
      contextLower.includes('refresh')) {
    return {
      purpose: 'sync-wait',
      canReplace: true,
      suggestion: 'Replace with: await expect(element).toBeVisible() or waitForFunction'
    };
  }
  
  return {
    purpose: 'unknown',
    canReplace: duration < 1000, // Short waits might be replaceable
    suggestion: duration < 1000 ? 'Consider replacing with proper wait condition' : undefined
  };
}

function analyzeFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/waitForTimeout\((\d+)\)/);
    if (match && match[1]) {
      const duration = parseInt(match[1], 10);
      
      // Get surrounding context (5 lines before and after)
      const contextStart = Math.max(0, index - 5);
      const contextEnd = Math.min(lines.length - 1, index + 5);
      const context = lines.slice(contextStart, contextEnd + 1).join('\n');
      
      const analysis = analyzeTimeout(line, context, duration);
      
      timeouts.push({
        file: filePath,
        line: index + 1,
        duration,
        context,
        ...analysis
      });
    }
  });
}

function processDirectory(dir: string) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !entry.includes('node_modules')) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
      analyzeFile(fullPath);
    }
  }
}

// Analyze test directory
const testDir = join(process.cwd(), 'tests');
processDirectory(testDir);

// Generate report
console.log('waitForTimeout Analysis Report');
console.log('==============================\n');

const byPurpose = timeouts.reduce((acc, timeout) => {
  acc[timeout.purpose] = (acc[timeout.purpose] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Summary by Purpose:');
Object.entries(byPurpose).forEach(([purpose, count]) => {
  console.log(`  ${purpose}: ${count}`);
});
console.log(`  Total: ${timeouts.length}\n`);

const replaceable = timeouts.filter(t => t.canReplace);
console.log(`Potentially replaceable: ${replaceable.length} (${Math.round(replaceable.length / timeouts.length * 100)}%)\n`);

// Show examples of replaceable timeouts
console.log('Replaceable Examples:');
replaceable.slice(0, 5).forEach(timeout => {
  console.log(`\n${timeout.file}:${timeout.line}`);
  console.log(`  Duration: ${timeout.duration}ms`);
  console.log(`  Purpose: ${timeout.purpose}`);
  console.log(`  Suggestion: ${timeout.suggestion}`);
});

// Show examples that should be kept
const keepExamples = timeouts.filter(t => !t.canReplace).slice(0, 3);
console.log('\n\nExamples to Keep:');
keepExamples.forEach(timeout => {
  console.log(`\n${timeout.file}:${timeout.line}`);
  console.log(`  Duration: ${timeout.duration}ms`);
  console.log(`  Purpose: ${timeout.purpose}`);
  console.log(`  Reason: ${timeout.suggestion}`);
});

console.log('\n\nRecommendations:');
console.log('1. Network simulation timeouts: Keep these as they test timing-sensitive behavior');
console.log('2. Retry waits: Keep these as they test retry intervals');
console.log('3. Animation waits: Replace with waitForFunction checking animation state');
console.log('4. Debounce waits: Replace with waitForLoadState("networkidle")');
console.log('5. Sync waits: Replace with proper element visibility checks');