#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ConsoleLogInstance {
  file: string;
  line: number;
  content: string;
  context: string;
  category:
    | 'test-scenario'
    | 'debug'
    | 'error-simulation'
    | 'performance'
    | 'unknown';
}

const consoleLogs: ConsoleLogInstance[] = [];

function categorizeConsoleLog(
  content: string,
  context: string
): ConsoleLogInstance['category'] {
  const lowerContent = content.toLowerCase();
  const lowerContext = context.toLowerCase();

  // Test scenario logs (simulating real app behavior)
  if (
    lowerContent.includes('circuit breaker') ||
    lowerContent.includes('retry attempt') ||
    lowerContent.includes('state recovered') ||
    lowerContent.includes('connection') ||
    lowerContent.includes('websocket') ||
    lowerContent.includes('realtime')
  ) {
    return 'test-scenario';
  }

  // Error simulation logs
  if (
    lowerContent.includes('error') ||
    lowerContent.includes('failed') ||
    lowerContent.includes('exception') ||
    lowerContext.includes('catch')
  ) {
    return 'error-simulation';
  }

  // Performance measurement logs
  if (
    lowerContent.includes('time') ||
    lowerContent.includes('duration') ||
    lowerContent.includes('performance') ||
    lowerContent.includes('metrics')
  ) {
    return 'performance';
  }

  // Debug logs (might be removable)
  if (
    lowerContent.includes('debug') ||
    lowerContent.includes('test') ||
    lowerContent.includes('check')
  ) {
    return 'debug';
  }

  return 'unknown';
}

function analyzeFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('console.log')) {
      // Get surrounding context (3 lines before and after)
      const contextStart = Math.max(0, index - 3);
      const contextEnd = Math.min(lines.length - 1, index + 3);
      const context = lines.slice(contextStart, contextEnd + 1).join('\n');

      const logInstance: ConsoleLogInstance = {
        file: filePath,
        line: index + 1,
        content: line.trim(),
        context: context,
        category: categorizeConsoleLog(line, context),
      };

      consoleLogs.push(logInstance);
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
    } else if (
      stat.isFile() &&
      (entry.endsWith('.ts') || entry.endsWith('.tsx'))
    ) {
      analyzeFile(fullPath);
    }
  }
}

// Analyze test directory
const testDir = join(process.cwd(), 'tests');
processDirectory(testDir);

// Generate report
console.log('Console.log Analysis Report');
console.log('===========================\n');

const byCategory = consoleLogs.reduce(
  (acc, log) => {
    acc[log.category] = (acc[log.category] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

console.log('Summary by Category:');
Object.entries(byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count}`);
});
console.log(`  Total: ${consoleLogs.length}\n`);

// Show examples from each category
const categories: ConsoleLogInstance['category'][] = [
  'test-scenario',
  'error-simulation',
  'performance',
  'debug',
  'unknown',
];

categories.forEach(category => {
  const examples = consoleLogs
    .filter(log => log.category === category)
    .slice(0, 3);
  if (examples.length > 0) {
    console.log(`\n${category.toUpperCase()} Examples:`);
    examples.forEach(example => {
      console.log(`  ${example.file}:${example.line}`);
      console.log(`    ${example.content}`);
    });
  }
});

// Recommendations
console.log('\nRecommendations:');
console.log('================');
console.log(
  '1. test-scenario logs: Keep these as they simulate real application behavior'
);
console.log(
  '2. error-simulation logs: Keep these as they are part of error handling tests'
);
console.log(
  '3. performance logs: Consider replacing with proper performance assertions'
);
console.log('4. debug logs: Safe to remove or replace with test utilities');
console.log('5. unknown logs: Review individually');

// Export findings for potential automated fixing
const findings = {
  total: consoleLogs.length,
  byCategory,
  logs: consoleLogs,
};

console.log('\nDetailed findings saved to console-logs-analysis.json');
