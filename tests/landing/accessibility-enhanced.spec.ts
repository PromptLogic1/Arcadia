/**
 * Enhanced accessibility testing with axe-core integration
 * and comprehensive WCAG 2.1 AA compliance testing
 */

import { test, expect } from '@playwright/test';
import type { AccessibilityResult, AccessibilityConfig } from './types';

// Enhanced accessibility configuration
const ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  wcagLevel: 'AA',
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  rules: {
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'landmark-roles': { enabled: true },
    'heading-order': { enabled: true },
    'alt-text': { enabled: true },
    'form-labels': { enabled: true },
    'aria-usage': { enabled: true },
  },
  includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
  excludeTags: ['experimental'],
  resultTypes: ['violations', 'incomplete'],
};

// Install axe-core for accessibility testing
async function injectAxe(page: any) {
  await page.addScriptTag({
    url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
  });
}

// Run axe accessibility scan
async function runAxeAccessibilityScan(
  page: any,
  config: AccessibilityConfig = ACCESSIBILITY_CONFIG
): Promise<AccessibilityResult> {
  await injectAxe(page);
  
  const results = await page.evaluate((config) => {
    return new Promise((resolve) => {
      // @ts-ignore - axe is injected globally
      window.axe.run(document, {
        tags: config.tags,
        rules: Object.fromEntries(
          Object.entries(config.rules).map(([rule, settings]) => [rule, settings])
        ),
      }, (err: any, results: any) => {
        if (err) throw err;
        resolve(results);
      });
    });
  }, config);

  const axeResults = results as any;
  
  // Transform axe results to our format
  const accessibilityResult: AccessibilityResult = {
    violations: axeResults.violations.map((violation: any) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      tags: violation.tags,
      nodes: violation.nodes.map((node: any) => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary,
        element: node.element,
      })),
    })),
    passes: axeResults.passes.map((pass: any) => ({
      id: pass.id,
      description: pass.description,
      nodes: pass.nodes.map((node: any) => ({
        html: node.html,
        target: node.target,
      })),
    })),
    incomplete: axeResults.incomplete.map((incomplete: any) => ({
      id: incomplete.id,
      description: incomplete.description,
      nodes: incomplete.nodes.map((node: any) => ({
        html: node.html,
        target: node.target,
      })),
    })),
    wcagLevel: config.wcagLevel,
    testEngine: axeResults.testEngine,
    testRunner: axeResults.testRunner,
    url: axeResults.url,
    timestamp: axeResults.timestamp,
    summary: {
      totalViolations: axeResults.violations.length,
      criticalViolations: axeResults.violations.filter((v: any) => v.impact === 'critical').length,
      seriousViolations: axeResults.violations.filter((v: any) => v.impact === 'serious').length,
      moderateViolations: axeResults.violations.filter((v: any) => v.impact === 'moderate').length,
      minorViolations: axeResults.violations.filter((v: any) => v.impact === 'minor').length,
      passedRules: axeResults.passes.length,
      incompleteRules: axeResults.incomplete.length,
    },
  };

  return accessibilityResult;
}

test.describe('Enhanced Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should pass WCAG 2.1 AA automated accessibility tests @accessibility @critical', async ({ page }) => {
    const results = await runAxeAccessibilityScan(page, ACCESSIBILITY_CONFIG);
    
    // Log summary for visibility
    console.log('Accessibility Test Summary:');
    console.log(`  Total violations: ${results.summary.totalViolations}`);
    console.log(`  Critical: ${results.summary.criticalViolations}`);
    console.log(`  Serious: ${results.summary.seriousViolations}`);
    console.log(`  Moderate: ${results.summary.moderateViolations}`);
    console.log(`  Minor: ${results.summary.minorViolations}`);
    console.log(`  Passed rules: ${results.summary.passedRules}`);
    console.log(`  Incomplete: ${results.summary.incompleteRules}`);

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('\nAccessibility Violations:');
      results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id} (${violation.impact})`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help: ${violation.help}`);
        console.log(`   Help URL: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);
        violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
          console.log(`     ${nodeIndex + 1}. ${node.target.join(' > ')}`);
        });
        console.log('');
      });
    }

    // No critical or serious violations allowed
    expect(results.summary.criticalViolations).toBe(0);
    expect(results.summary.seriousViolations).toBe(0);
    
    // Moderate violations should be minimal
    expect(results.summary.moderateViolations).toBeLessThanOrEqual(2);
    
    // Should have some passing rules
    expect(results.summary.passedRules).toBeGreaterThan(10);
  });

  test('should have proper keyboard navigation support @accessibility @keyboard', async ({ page }) => {
    // Test tab navigation through interactive elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[tabindex="0"]',
      '[role="button"]',
      '[role="link"]',
    ];

    let focusableElements = [];
    for (const selector of interactiveSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible() && await element.isEnabled()) {
          focusableElements.push(element);
        }
      }
    }

    expect(focusableElements.length).toBeGreaterThan(0);

    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement);
    expect(focusedElement).toBeTruthy();

    // Test that Tab moves through elements
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab');
      const newFocusedElement = await page.evaluate(() => document.activeElement);
      
      // Focus should change (unless we've reached the end)
      if (i < focusableElements.length - 1) {
        expect(newFocusedElement).not.toEqual(focusedElement);
      }
      focusedElement = newFocusedElement;
    }

    // Test Shift+Tab (reverse navigation)
    await page.keyboard.press('Shift+Tab');
    const reverseFocusedElement = await page.evaluate(() => document.activeElement);
    expect(reverseFocusedElement).not.toEqual(focusedElement);
  });

  test('should have visible focus indicators @accessibility @focus', async ({ page }) => {
    const focusableElements = await page.locator('button, a[href], input, [tabindex="0"]').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
      const element = focusableElements[i];
      
      if (await element.isVisible()) {
        // Focus the element
        await element.focus();
        
        // Check if element has visible focus indicator
        const focusStyles = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          const pseudoStyles = window.getComputedStyle(el, ':focus');
          
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
            border: styles.border,
            pseudoOutline: pseudoStyles.outline,
            pseudoBoxShadow: pseudoStyles.boxShadow,
          };
        });

        // Should have visible focus indicator
        const hasVisibleFocus = 
          focusStyles.outlineWidth !== '0px' ||
          focusStyles.boxShadow !== 'none' ||
          focusStyles.pseudoOutline !== 'none' ||
          focusStyles.pseudoBoxShadow !== 'none';

        expect(hasVisibleFocus, 
          `Element ${await element.textContent()} should have visible focus indicator`
        ).toBe(true);
      }
    }
  });

  test('should have proper heading hierarchy @accessibility @headings', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading hierarchy
    const headingLevels = [];
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.substring(1));
      headingLevels.push(level);
    }

    // First heading should be h1
    expect(headingLevels[0]).toBe(1);

    // Check that heading levels don't skip (no jumping from h2 to h4)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];
      
      // Current level should not be more than 1 level deeper than previous
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
  });

  test('should have proper ARIA labels and roles @accessibility @aria', async ({ page }) => {
    // Check for elements that should have ARIA labels
    const buttonElements = await page.locator('button').all();
    
    for (const button of buttonElements) {
      const textContent = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have accessible name
      const hasAccessibleName = 
        (textContent && textContent.trim().length > 0) ||
        (ariaLabel && ariaLabel.length > 0) ||
        ariaLabelledBy;
        
      expect(hasAccessibleName, 
        'Button should have accessible name (text content, aria-label, or aria-labelledby)'
      ).toBe(true);
    }

    // Check landmark roles
    const mainLandmarks = await page.locator('main, [role="main"]').count();
    expect(mainLandmarks).toBeGreaterThanOrEqual(1);

    // Check navigation landmarks
    const navLandmarks = await page.locator('nav, [role="navigation"]').count();
    expect(navLandmarks).toBeGreaterThanOrEqual(1);

    // Check for proper list structure
    const lists = await page.locator('ul, ol').all();
    for (const list of lists.slice(0, 5)) {
      const listItems = await list.locator('li').count();
      if (listItems > 0) {
        // Lists should contain only li elements as direct children
        const directChildren = await list.evaluate(el => 
          Array.from(el.children).map(child => child.tagName.toLowerCase())
        );
        
        const nonListItems = directChildren.filter(tag => tag !== 'li');
        expect(nonListItems.length, 
          'Lists should only contain li elements as direct children'
        ).toBe(0);
      }
    }
  });

  test('should have adequate color contrast @accessibility @color-contrast', async ({ page }) => {
    const results = await runAxeAccessibilityScan(page, {
      ...ACCESSIBILITY_CONFIG,
      rules: { 'color-contrast': { enabled: true } }
    });

    // Check specifically for color contrast violations
    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
    
    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:');
      contrastViolations.forEach(violation => {
        violation.nodes.forEach(node => {
          console.log(`  - ${node.target.join(' > ')}: ${node.failureSummary}`);
        });
      });
    }

    expect(contrastViolations.length).toBe(0);
  });

  test('should have proper form accessibility @accessibility @forms', async ({ page }) => {
    // Navigate to a page with forms (if available)
    const formPages = ['/contact', '/auth/signup', '/auth/login'];
    let hasForm = false;

    for (const formPage of formPages) {
      try {
        await page.goto(formPage);
        await page.waitForLoadState('networkidle');
        
        const formCount = await page.locator('form').count();
        if (formCount > 0) {
          hasForm = true;
          break;
        }
      } catch (error) {
        // Page might not exist, continue to next
        continue;
      }
    }

    if (!hasForm) {
      test.skip('No forms found to test');
      return;
    }

    // Test form accessibility
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const inputType = await input.getAttribute('type');
      const hasLabel = await input.evaluate(el => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const placeholder = el.getAttribute('placeholder');
        
        // Check for associated label
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(label || ariaLabel || ariaLabelledBy || placeholder);
      });

      expect(hasLabel, 
        `Input of type "${inputType}" should have an associated label or aria-label`
      ).toBe(true);
    }

    // Check for form validation messages
    await page.locator('input[required]').first().focus();
    await page.keyboard.press('Tab'); // Move focus away to trigger validation
    
    // Error messages should be announced to screen readers
    const errorMessages = await page.locator('[role="alert"], .error-message').all();
    for (const errorMsg of errorMessages) {
      if (await errorMsg.isVisible()) {
        const role = await errorMsg.getAttribute('role');
        const ariaLive = await errorMsg.getAttribute('aria-live');
        
        const isAccessible = role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive';
        expect(isAccessible, 
          'Error messages should have role="alert" or aria-live attribute'
        ).toBe(true);
      }
    }
  });

  test('should be accessible with screen reader simulation @accessibility @screen-reader', async ({ page }) => {
    // Test basic screen reader navigation patterns
    const landmarks = await page.locator('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').all();
    
    expect(landmarks.length).toBeGreaterThan(0);

    // Test skip links
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? {
        tagName: el.tagName,
        textContent: el.textContent,
        href: el.getAttribute('href')
      } : null;
    });

    // Check if first focusable element is a skip link
    if (firstFocusedElement?.href?.includes('#')) {
      console.log('Skip link found:', firstFocusedElement.textContent);
      
      // Test skip link functionality
      await page.keyboard.press('Enter');
      const targetElement = await page.evaluate(() => document.activeElement);
      expect(targetElement).toBeTruthy();
    }

    // Test that all images have appropriate alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Decorative images should have empty alt or role="presentation"
      // Content images should have descriptive alt text
      if (role === 'presentation' || role === 'none') {
        expect(alt === '' || alt === null).toBe(true);
      } else {
        expect(alt).toBeTruthy();
        if (alt) {
          expect(alt.length).toBeGreaterThan(0);
          expect(alt.length).toBeLessThan(125); // Screen reader best practice
        }
      }
    }
  });

  test('should support reduced motion preferences @accessibility @motion', async ({ page }) => {
    // Test with prefers-reduced-motion enabled
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that animations are disabled or reduced
    const hasAnimations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      return Array.from(elements).some(el => {
        const styles = window.getComputedStyle(el);
        return (
          styles.animationDuration !== '0s' &&
          styles.animationDuration !== 'none' &&
          !el.matches('.motion-reduce\\:hidden')
        );
      });
    });

    // Should respect reduced motion preference
    expect(hasAnimations).toBe(false);

    // Check for motion-reduce utility classes
    const motionReduceElements = await page.locator('.motion-reduce\\:hidden').count();
    // If elements use motion-reduce classes, they should be hidden
    if (motionReduceElements > 0) {
      console.log(`Found ${motionReduceElements} elements with motion-reduce classes`);
    }
  });

  test('should have proper touch target sizes for mobile @accessibility @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const touchTargets = await page.locator('button, a[href], [role="button"], [tabindex="0"]').all();
    
    for (const target of touchTargets.slice(0, 10)) {
      if (await target.isVisible()) {
        const box = await target.boundingBox();
        
        if (box) {
          // WCAG 2.1 AA requires 44x44px minimum touch targets
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should validate accessibility across different pages @accessibility @comprehensive', async ({ page }) => {
    const pagesToTest = ['/', '/about'];
    const allResults: AccessibilityResult[] = [];

    for (const pagePath of pagesToTest) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const results = await runAxeAccessibilityScan(page, ACCESSIBILITY_CONFIG);
      allResults.push(results);
      
      console.log(`\nAccessibility results for ${pagePath}:`);
      console.log(`  Violations: ${results.summary.totalViolations}`);
      console.log(`  Critical: ${results.summary.criticalViolations}`);
      console.log(`  Serious: ${results.summary.seriousViolations}`);
      
      // No critical violations on any page
      expect(results.summary.criticalViolations).toBe(0);
      expect(results.summary.seriousViolations).toBeLessThanOrEqual(1);
    }

    // Overall accessibility health check
    const totalViolations = allResults.reduce((sum, result) => sum + result.summary.totalViolations, 0);
    const totalPassed = allResults.reduce((sum, result) => sum + result.summary.passedRules, 0);
    
    console.log(`\nOverall accessibility summary:`);
    console.log(`  Total violations across all pages: ${totalViolations}`);
    console.log(`  Total passed rules: ${totalPassed}`);
    console.log(`  Success rate: ${((totalPassed / (totalPassed + totalViolations)) * 100).toFixed(2)}%`);
    
    // Should have more passed rules than violations
    expect(totalPassed).toBeGreaterThan(totalViolations);
  });
});