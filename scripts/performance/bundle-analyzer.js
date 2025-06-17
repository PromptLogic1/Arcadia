#!/usr/bin/env node

/**
 * Bundle Analysis Script for Arcadia
 * Analyzes build output and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Updated thresholds based on Phase 3 optimization goals
const BUNDLE_SIZE_TARGET = 500 * 1024; // 500KB target (from CLAUDE.md)
const CHUNK_SIZE_TARGET = 100 * 1024; // 100KB for vendor chunks
const ROUTE_SIZE_TARGET = 50 * 1024; // 50KB for individual routes
const CI_MODE = process.env.CI === 'true' || process.argv.includes('--ci');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  if (!CI_MODE) {
    console.log('🔍 Analyzing Arcadia bundle...\n');
  }

  const nextDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(nextDir, 'static');
  const chunksDir = path.join(staticDir, 'chunks');

  if (!fs.existsSync(chunksDir)) {
    console.error('❌ Build output not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Analyze chunks
  const chunks = fs.readdirSync(chunksDir);
  let totalSize = 0;
  const largeChunks = [];
  const chunkAnalysis = [];

  chunks.forEach(chunk => {
    const chunkPath = path.join(chunksDir, chunk);
    const stats = fs.statSync(chunkPath);
    totalSize += stats.size;

    const analysis = {
      name: chunk,
      size: stats.size,
      formattedSize: formatBytes(stats.size),
    };

    chunkAnalysis.push(analysis);

    if (stats.size > CHUNK_SIZE_TARGET) {
      largeChunks.push(analysis);
    }
  });

  // Sort by size
  chunkAnalysis.sort((a, b) => b.size - a.size);

  // Results
  if (!CI_MODE) {
    console.log('📊 Bundle Analysis Results:');
    console.log('='.repeat(50));
    console.log(`Total bundle size: ${formatBytes(totalSize)}`);
    console.log(`Target size: ${formatBytes(BUNDLE_SIZE_TARGET)}`);
    console.log(
      `Status: ${totalSize > BUNDLE_SIZE_TARGET ? '❌ EXCEEDS TARGET' : '✅ WITHIN TARGET'}`
    );
    console.log(`Total chunks: ${chunks.length}`);
    console.log();
  }

  // Top 10 largest chunks
  if (!CI_MODE) {
    console.log('🔝 Top 10 Largest Chunks:');
    console.log('-'.repeat(50));
  }
  if (!CI_MODE) {
    chunkAnalysis.slice(0, 10).forEach((chunk, index) => {
      const status = chunk.size > CHUNK_SIZE_TARGET ? '⚠️' : '✅';
      console.log(
        `${index + 1}. ${chunk.name} - ${chunk.formattedSize} ${status}`
      );
    });
    console.log();
  }

  // Large chunks analysis
  if (largeChunks.length > 0 && !CI_MODE) {
    console.log('⚠️  Chunks Exceeding 100KB Target:');
    console.log('-'.repeat(50));
    largeChunks.forEach(chunk => {
      console.log(`• ${chunk.name} - ${chunk.formattedSize}`);
    });
    console.log();
  }

  // Recommendations
  if (!CI_MODE) {
    console.log('💡 Optimization Recommendations:');
    console.log('-'.repeat(50));

    if (totalSize > BUNDLE_SIZE_TARGET) {
      const excess = totalSize - BUNDLE_SIZE_TARGET;
      console.log(`❌ Bundle exceeds target by ${formatBytes(excess)}`);
      console.log('📋 Priority Actions:');
      console.log('   1. Implement dynamic imports for features');
      console.log('   2. Optimize library imports (tree shaking)');
      console.log('   3. Remove unused dependencies');
      console.log('   4. Split large chunks further');
    } else {
      console.log('✅ Bundle size within target');
    }

    if (largeChunks.length > 0) {
      console.log(`⚠️  ${largeChunks.length} chunks exceed 100KB target`);
      console.log('📋 Chunk Optimization:');
      console.log('   1. Review webpack splitChunks configuration');
      console.log('   2. Consider feature-based splitting');
      console.log('   3. Analyze large dependencies');
    }

    console.log();
    console.log('🛠️  Next Steps:');
    console.log('   1. Run: npm run build:analyze');
    console.log('   2. Review bundle composition');
    console.log('   3. Implement dynamic imports');
    console.log('   4. Monitor with performance budget');
  }

  const result = {
    totalSize,
    targetSize: BUNDLE_SIZE_TARGET,
    withinTarget: totalSize <= BUNDLE_SIZE_TARGET,
    chunkCount: chunks.length,
    largeChunkCount: largeChunks.length,
    chunks: chunkAnalysis,
    timestamp: new Date().toISOString(),
  };

  // CI mode: output JSON and exit with appropriate code
  if (CI_MODE) {
    console.log(JSON.stringify(result, null, 2));

    // Write to file for artifact storage
    const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

    // Exit with error code if bundle exceeds target
    if (!result.withinTarget) {
      console.error(
        `\n❌ Bundle size (${formatBytes(totalSize)}) exceeds target (${formatBytes(BUNDLE_SIZE_TARGET)})`
      );
      process.exit(1);
    }
  }

  return result;
}

if (require.main === module) {
  const result = analyzeBundle();

  // Exit with appropriate code in non-CI mode too
  if (!result.withinTarget) {
    process.exit(1);
  }
}

module.exports = {
  analyzeBundle,
  formatBytes,
  BUNDLE_SIZE_TARGET,
  CHUNK_SIZE_TARGET,
};
