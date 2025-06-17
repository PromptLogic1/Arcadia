/**
 * Bundle analysis and performance monitoring tests
 * Automated bundle size tracking and optimization validation
 */

import { test, expect } from '@playwright/test';
import type { BundleMetrics } from './types';

// Bundle size thresholds (in bytes)
const BUNDLE_THRESHOLDS = {
  mainBundle: 250 * 1024, // 250KB
  vendorBundle: 200 * 1024, // 200KB
  cssBundle: 50 * 1024, // 50KB
  totalBundle: 500 * 1024, // 500KB
  individualChunk: 100 * 1024, // 100KB per chunk
  imageOptimization: 200 * 1024, // 200KB per image
  fontBundle: 100 * 1024, // 100KB for fonts
};

// Performance budgets for different asset types
const ASSET_BUDGETS = {
  javascript: 300 * 1024,
  css: 50 * 1024,
  images: 500 * 1024,
  fonts: 100 * 1024,
  other: 100 * 1024,
};

interface DetailedBundleMetrics extends BundleMetrics {
  resourceBreakdown: {
    scripts: Array<{ name: string; size: number; url: string }>;
    stylesheets: Array<{ name: string; size: number; url: string }>;
    images: Array<{ name: string; size: number; url: string }>;
    fonts: Array<{ name: string; size: number; url: string }>;
    other: Array<{ name: string; size: number; url: string }>;
  };
  compressionRatio: number;
  duplicates: Array<{ name: string; count: number; totalSize: number }>;
  criticalPath: Array<{ name: string; size: number; loadTime: number }>;
}

// Enhanced bundle analysis function
async function analyzeDetailedBundles(page: any): Promise<DetailedBundleMetrics> {
  // Get all network resources
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return entries.map(entry => ({
      name: entry.name,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      startTime: entry.startTime,
      responseEnd: entry.responseEnd,
      initiatorType: entry.initiatorType,
    }));
  });

  // Categorize resources
  const resourceBreakdown = {
    scripts: [] as Array<{ name: string; size: number; url: string }>,
    stylesheets: [] as Array<{ name: string; size: number; url: string }>,
    images: [] as Array<{ name: string; size: number; url: string }>,
    fonts: [] as Array<{ name: string; size: number; url: string }>,
    other: [] as Array<{ name: string; size: number; url: string }>,
  };

  let mainBundle = 0;
  let vendorBundle = 0;
  let cssBundle = 0;
  const chunks: BundleMetrics['chunks'] = [];
  const assets: BundleMetrics['assets'] = [];

  resources.forEach(resource => {
    const url = resource.name;
    const filename = url.split('/').pop() || '';
    const size = resource.transferSize;
    const decodedSize = resource.decodedBodySize;

    // Categorize by file type
    if (resource.initiatorType === 'script' || url.includes('.js')) {
      resourceBreakdown.scripts.push({ name: filename, size, url });
      
      if (filename.includes('vendor') || filename.includes('node_modules') || filename.includes('chunk')) {
        vendorBundle += size;
      } else {
        mainBundle += size;
      }
      
      chunks.push({
        name: filename,
        size,
        gzipSize: Math.round(size * 0.3), // Estimate
      });
    } else if (resource.initiatorType === 'css' || url.includes('.css')) {
      resourceBreakdown.stylesheets.push({ name: filename, size, url });
      cssBundle += size;
    } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|webp|svg|gif)(\?|$)/i.test(url)) {
      resourceBreakdown.images.push({ name: filename, size, url });
    } else if (/\.(woff|woff2|ttf|eot)(\?|$)/i.test(url)) {
      resourceBreakdown.fonts.push({ name: filename, size, url });
    } else {
      resourceBreakdown.other.push({ name: filename, size, url });
    }

    assets.push({
      name: filename,
      size,
      type: getResourceType(url, resource.initiatorType),
    });
  });

  const totalSize = mainBundle + vendorBundle + cssBundle;
  
  // Calculate compression ratio
  const totalTransferred = resources.reduce((sum, r) => sum + r.transferSize, 0);
  const totalDecoded = resources.reduce((sum, r) => sum + r.decodedBodySize, 0);
  const compressionRatio = totalDecoded > 0 ? totalTransferred / totalDecoded : 1;

  // Find duplicates
  const duplicates = findDuplicateResources(resources);

  // Identify critical path resources (loaded within first 2 seconds)
  const criticalPath = resources
    .filter(r => r.responseEnd < 2000)
    .map(r => ({
      name: r.name.split('/').pop() || '',
      size: r.transferSize,
      loadTime: r.responseEnd - r.startTime,
    }))
    .sort((a, b) => b.size - a.size);

  return {
    mainBundle,
    vendorBundle,
    cssBundle,
    totalSize,
    gzipSize: Math.round(totalSize * 0.3),
    brotliSize: Math.round(totalSize * 0.25),
    chunks,
    assets,
    resourceBreakdown,
    compressionRatio,
    duplicates,
    criticalPath,
  };
}

function getResourceType(url: string, initiatorType: string): string {
  if (initiatorType === 'script' || url.includes('.js')) return 'javascript';
  if (initiatorType === 'css' || url.includes('.css')) return 'css';
  if (initiatorType === 'img' || /\.(jpg|jpeg|png|webp|svg|gif)(\?|$)/i.test(url)) return 'image';
  if (/\.(woff|woff2|ttf|eot)(\?|$)/i.test(url)) return 'font';
  return 'other';
}

function findDuplicateResources(resources: any[]): Array<{ name: string; count: number; totalSize: number }> {
  const resourceCounts = new Map<string, { count: number; totalSize: number }>();
  
  resources.forEach(resource => {
    const filename = resource.name.split('/').pop() || '';
    if (filename) {
      const existing = resourceCounts.get(filename) || { count: 0, totalSize: 0 };
      resourceCounts.set(filename, {
        count: existing.count + 1,
        totalSize: existing.totalSize + resource.transferSize,
      });
    }
  });

  return Array.from(resourceCounts.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([name, data]) => ({ name, ...data }));
}

test.describe('Bundle Analysis & Performance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache to get accurate measurements
    await page.context().clearCookies();
    await page.evaluate(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    });
  });

  test('should meet bundle size budgets @bundle @performance @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    console.log('\n📦 Bundle Analysis Report:');
    console.log(`Main Bundle: ${(bundleMetrics.mainBundle / 1024).toFixed(2)}KB`);
    console.log(`Vendor Bundle: ${(bundleMetrics.vendorBundle / 1024).toFixed(2)}KB`);
    console.log(`CSS Bundle: ${(bundleMetrics.cssBundle / 1024).toFixed(2)}KB`);
    console.log(`Total Size: ${(bundleMetrics.totalSize / 1024).toFixed(2)}KB`);
    console.log(`Estimated Gzip: ${(bundleMetrics.gzipSize / 1024).toFixed(2)}KB`);
    console.log(`Compression Ratio: ${(bundleMetrics.compressionRatio * 100).toFixed(1)}%`);

    // Assert bundle size thresholds
    expect(bundleMetrics.mainBundle).toBeLessThan(BUNDLE_THRESHOLDS.mainBundle);
    expect(bundleMetrics.vendorBundle).toBeLessThan(BUNDLE_THRESHOLDS.vendorBundle);
    expect(bundleMetrics.cssBundle).toBeLessThan(BUNDLE_THRESHOLDS.cssBundle);
    expect(bundleMetrics.totalSize).toBeLessThan(BUNDLE_THRESHOLDS.totalBundle);

    // Check individual chunk sizes
    const oversizedChunks = bundleMetrics.chunks.filter(chunk => 
      chunk.size > BUNDLE_THRESHOLDS.individualChunk
    );
    
    if (oversizedChunks.length > 0) {
      console.log('\n⚠️  Oversized chunks:');
      oversizedChunks.forEach(chunk => {
        console.log(`  - ${chunk.name}: ${(chunk.size / 1024).toFixed(2)}KB`);
      });
    }
    
    expect(oversizedChunks.length).toBeLessThanOrEqual(2); // Allow up to 2 large chunks
  });

  test('should optimize asset loading and compression @bundle @optimization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    console.log('\n🔧 Asset Optimization Analysis:');

    // Check compression effectiveness
    expect(bundleMetrics.compressionRatio).toBeLessThan(0.8); // At least 20% compression

    // Analyze resource breakdown
    Object.entries(bundleMetrics.resourceBreakdown).forEach(([type, resources]) => {
      const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
      console.log(`${type}: ${resources.length} files, ${(totalSize / 1024).toFixed(2)}KB`);
      
      // Check against budgets
      const budget = ASSET_BUDGETS[type as keyof typeof ASSET_BUDGETS] || ASSET_BUDGETS.other;
      expect(totalSize).toBeLessThan(budget);
    });

    // Check for duplicate resources
    if (bundleMetrics.duplicates.length > 0) {
      console.log('\n⚠️  Duplicate resources found:');
      bundleMetrics.duplicates.forEach(dup => {
        console.log(`  - ${dup.name}: ${dup.count} copies, ${(dup.totalSize / 1024).toFixed(2)}KB total`);
      });
    }

    // Should have minimal duplicates
    expect(bundleMetrics.duplicates.length).toBeLessThanOrEqual(3);
  });

  test('should optimize critical path resources @bundle @critical-path', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    console.log('\n🚀 Critical Path Analysis:');
    console.log(`Critical resources: ${bundleMetrics.criticalPath.length}`);
    
    bundleMetrics.criticalPath.forEach((resource, index) => {
      console.log(`  ${index + 1}. ${resource.name}: ${(resource.size / 1024).toFixed(2)}KB (${resource.loadTime.toFixed(0)}ms)`);
    });

    // Critical path should be optimized
    const criticalSize = bundleMetrics.criticalPath.reduce((sum, r) => sum + r.size, 0);
    expect(criticalSize).toBeLessThan(200 * 1024); // 200KB critical path budget

    // Critical resources should load quickly
    const slowCriticalResources = bundleMetrics.criticalPath.filter(r => r.loadTime > 1000);
    expect(slowCriticalResources.length).toBeLessThanOrEqual(2);
  });

  test('should implement effective code splitting @bundle @code-splitting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    // Analyze chunk distribution
    const jsChunks = bundleMetrics.chunks.filter(chunk => chunk.name.includes('.js'));
    
    console.log('\n✂️ Code Splitting Analysis:');
    console.log(`Total JavaScript chunks: ${jsChunks.length}`);
    
    // Should have multiple chunks (indicating code splitting)
    expect(jsChunks.length).toBeGreaterThan(2);

    // Check for vendor chunk separation
    const vendorChunks = jsChunks.filter(chunk => 
      chunk.name.includes('vendor') || 
      chunk.name.includes('node_modules') ||
      chunk.name.includes('chunk')
    );

    if (vendorChunks.length > 0) {
      console.log('Vendor chunks found:', vendorChunks.map(c => c.name));
    }

    // Analyze chunk size distribution
    const chunkSizes = jsChunks.map(c => c.size).sort((a, b) => b - a);
    const largestChunk = chunkSizes[0];
    const averageChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length;

    console.log(`Largest chunk: ${(largestChunk / 1024).toFixed(2)}KB`);
    console.log(`Average chunk size: ${(averageChunkSize / 1024).toFixed(2)}KB`);

    // Largest chunk shouldn't be too dominant
    expect(largestChunk).toBeLessThan(bundleMetrics.totalSize * 0.6); // Max 60% of total
  });

  test('should optimize image loading and formats @bundle @images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);
    const images = bundleMetrics.resourceBreakdown.images;

    console.log('\n🖼️ Image Optimization Analysis:');
    console.log(`Total images: ${images.length}`);

    if (images.length > 0) {
      const totalImageSize = images.reduce((sum, img) => sum + img.size, 0);
      const averageImageSize = totalImageSize / images.length;

      console.log(`Total image size: ${(totalImageSize / 1024).toFixed(2)}KB`);
      console.log(`Average image size: ${(averageImageSize / 1024).toFixed(2)}KB`);

      // Check image formats
      const imageFormats = images.reduce((formats, img) => {
        const ext = img.name.split('.').pop()?.toLowerCase() || 'unknown';
        formats[ext] = (formats[ext] || 0) + 1;
        return formats;
      }, {} as Record<string, number>);

      console.log('Image formats:', imageFormats);

      // Should use modern image formats
      const modernFormats = ['webp', 'avif'];
      const modernImageCount = Object.entries(imageFormats)
        .filter(([format]) => modernFormats.includes(format))
        .reduce((sum, [, count]) => sum + count, 0);

      const modernFormatRatio = modernImageCount / images.length;
      console.log(`Modern format usage: ${(modernFormatRatio * 100).toFixed(1)}%`);

      // Check for oversized images
      const oversizedImages = images.filter(img => img.size > BUNDLE_THRESHOLDS.imageOptimization);
      
      if (oversizedImages.length > 0) {
        console.log('Oversized images:');
        oversizedImages.forEach(img => {
          console.log(`  - ${img.name}: ${(img.size / 1024).toFixed(2)}KB`);
        });
      }

      // Assertions
      expect(averageImageSize).toBeLessThan(BUNDLE_THRESHOLDS.imageOptimization);
      expect(oversizedImages.length).toBeLessThanOrEqual(2);
      
      // Should have some modern format usage (if images present)
      if (images.length > 3) {
        expect(modernFormatRatio).toBeGreaterThan(0.3); // At least 30% modern formats
      }
    }
  });

  test('should implement effective font loading strategy @bundle @fonts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);
    const fonts = bundleMetrics.resourceBreakdown.fonts;

    console.log('\n🔤 Font Loading Analysis:');
    console.log(`Total fonts: ${fonts.length}`);

    if (fonts.length > 0) {
      const totalFontSize = fonts.reduce((sum, font) => sum + font.size, 0);
      console.log(`Total font size: ${(totalFontSize / 1024).toFixed(2)}KB`);

      // Check font formats
      const fontFormats = fonts.reduce((formats, font) => {
        const ext = font.name.split('.').pop()?.toLowerCase() || 'unknown';
        formats[ext] = (formats[ext] || 0) + 1;
        return formats;
      }, {} as Record<string, number>);

      console.log('Font formats:', fontFormats);

      // Should use modern font formats (woff2 preferred)
      const woff2Count = fontFormats.woff2 || 0;
      const woff2Ratio = woff2Count / fonts.length;
      console.log(`WOFF2 usage: ${(woff2Ratio * 100).toFixed(1)}%`);

      // Assertions
      expect(totalFontSize).toBeLessThan(BUNDLE_THRESHOLDS.fontBundle);
      if (fonts.length > 1) {
        expect(woff2Ratio).toBeGreaterThan(0.5); // At least 50% WOFF2
      }

      // Check for font display strategy
      const fontDisplayUsage = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        let hasFontDisplay = false;
        
        stylesheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach(rule => {
              if (rule.type === CSSRule.FONT_FACE_RULE) {
                const fontFaceRule = rule as CSSFontFaceRule;
                if (fontFaceRule.style.fontDisplay) {
                  hasFontDisplay = true;
                }
              }
            });
          } catch (e) {
            // Cross-origin stylesheets might throw errors
          }
        });
        
        return hasFontDisplay;
      });

      console.log(`Font display strategy implemented: ${fontDisplayUsage}`);
    }
  });

  test('should monitor bundle size regression over time @bundle @regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    // Create bundle report for tracking
    const bundleReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      metrics: {
        mainBundle: bundleMetrics.mainBundle,
        vendorBundle: bundleMetrics.vendorBundle,
        cssBundle: bundleMetrics.cssBundle,
        totalSize: bundleMetrics.totalSize,
        compressionRatio: bundleMetrics.compressionRatio,
        chunkCount: bundleMetrics.chunks.length,
        duplicateCount: bundleMetrics.duplicates.length,
      },
      breakdown: {
        javascript: bundleMetrics.resourceBreakdown.scripts.reduce((sum, s) => sum + s.size, 0),
        css: bundleMetrics.resourceBreakdown.stylesheets.reduce((sum, s) => sum + s.size, 0),
        images: bundleMetrics.resourceBreakdown.images.reduce((sum, i) => sum + i.size, 0),
        fonts: bundleMetrics.resourceBreakdown.fonts.reduce((sum, f) => sum + f.size, 0),
        other: bundleMetrics.resourceBreakdown.other.reduce((sum, o) => sum + o.size, 0),
      },
    };

    console.log('\n📊 Bundle Regression Report:');
    console.log(JSON.stringify(bundleReport, null, 2));

    // Size regression checks
    const regressionThresholds = {
      mainBundle: BUNDLE_THRESHOLDS.mainBundle * 1.1, // 10% tolerance
      vendorBundle: BUNDLE_THRESHOLDS.vendorBundle * 1.1,
      cssBundle: BUNDLE_THRESHOLDS.cssBundle * 1.1,
      totalSize: BUNDLE_THRESHOLDS.totalBundle * 1.1,
    };

    expect(bundleMetrics.mainBundle).toBeLessThan(regressionThresholds.mainBundle);
    expect(bundleMetrics.vendorBundle).toBeLessThan(regressionThresholds.vendorBundle);
    expect(bundleMetrics.cssBundle).toBeLessThan(regressionThresholds.cssBundle);
    expect(bundleMetrics.totalSize).toBeLessThan(regressionThresholds.totalSize);

    // Performance metrics should be reasonable
    expect(bundleMetrics.compressionRatio).toBeLessThan(0.9);
    expect(bundleMetrics.duplicates.length).toBeLessThanOrEqual(5);
  });

  test('should validate tree shaking and dead code elimination @bundle @tree-shaking', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleMetrics = await analyzeDetailedBundles(page);

    // Analyze JavaScript chunks for potential optimization
    const jsAssets = bundleMetrics.assets.filter(asset => asset.type === 'javascript');
    
    console.log('\n🌳 Tree Shaking Analysis:');
    
    // Check for common signs of ineffective tree shaking
    const suspiciouslyLargeChunks = jsAssets.filter(asset => 
      asset.size > 150 * 1024 && !asset.name.includes('vendor')
    );

    if (suspiciouslyLargeChunks.length > 0) {
      console.log('Suspiciously large non-vendor chunks:');
      suspiciouslyLargeChunks.forEach(chunk => {
        console.log(`  - ${chunk.name}: ${(chunk.size / 1024).toFixed(2)}KB`);
      });
    }

    // Check vendor vs application code ratio
    const vendorSize = bundleMetrics.vendorBundle;
    const appSize = bundleMetrics.mainBundle;
    const vendorRatio = vendorSize / (vendorSize + appSize);

    console.log(`Vendor/App ratio: ${(vendorRatio * 100).toFixed(1)}% vendor, ${((1 - vendorRatio) * 100).toFixed(1)}% app`);

    // Vendor bundle should not dominate too much (indicates potential tree shaking issues)
    expect(vendorRatio).toBeLessThan(0.8); // Max 80% vendor code

    // Application code should be reasonably sized
    expect(appSize).toBeLessThan(200 * 1024); // 200KB app code budget

    // Should not have too many suspiciously large chunks
    expect(suspiciouslyLargeChunks.length).toBeLessThanOrEqual(1);
  });
});