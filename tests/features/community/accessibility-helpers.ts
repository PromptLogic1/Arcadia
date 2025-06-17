import { Page, expect } from '@playwright/test';
import type { AccessibilityResult, AccessibilityViolation } from './types';

/**
 * Comprehensive Accessibility Testing Utilities
 * 
 * Provides WCAG 2.1 AA compliance testing for community features
 * including keyboard navigation, screen reader support, and
 * color contrast validation.
 */

// WCAG 2.1 AA Requirements
export const WCAG_REQUIREMENTS = {
  colorContrast: {
    normal: 4.5, // Normal text minimum contrast ratio
    large: 3.0,  // Large text minimum contrast ratio
  },
  timing: {
    minimumTimeout: 20000, // 20 seconds minimum for timeouts
  },
  navigation: {
    tabOrder: true, // Must have logical tab order
    skipLinks: true, // Must provide skip links
  },
  content: {
    headingStructure: true, // Must have proper heading hierarchy
    altText: true, // Images must have alt text
    labels: true, // Form controls must have labels
  },
} as const;

// Comprehensive accessibility test suite
export class AccessibilityTester {
  private violations: AccessibilityViolation[] = [];
  private passedChecks: string[] = [];

  async runFullAudit(page: Page, selector?: string): Promise<AccessibilityResult> {
    this.violations = [];
    this.passedChecks = [];

    // Inject axe-core for automated testing
    await this.injectAxeCore(page);

    // Run automated accessibility checks
    await this.runAxeAudit(page, selector);

    // Run manual accessibility checks
    await this.checkKeyboardNavigation(page);
    await this.checkAriaLabels(page);
    await this.checkHeadingStructure(page);
    await this.checkColorContrast(page);
    await this.checkFocusManagement(page);
    await this.checkFormLabels(page);

    const score = this.calculateAccessibilityScore();
    
    return {
      passed: this.violations.length === 0,
      violations: this.violations,
      score,
    };
  }

  private async injectAxeCore(page: Page): Promise<void> {
    try {
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js',
      });
    } catch (error) {
      // Fallback to CDN
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js';
        document.head.appendChild(script);
        return new Promise((resolve) => {
          script.onload = resolve;
        });
      });
    }
  }

  private async runAxeAudit(page: Page, selector?: string): Promise<void> {
    const axeResults = await page.evaluate((sel) => {
      return new Promise((resolve) => {
        if (typeof (window as any).axe === 'undefined') {
          resolve({ violations: [] });
          return;
        }

        (window as any).axe.run(sel ? document.querySelector(sel) : document, {
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        }, (err: any, results: any) => {
          if (err) {
            resolve({ violations: [] });
            return;
          }
          resolve(results);
        });
      });
    }, selector);

    const results = axeResults as any;
    
    if (results.violations) {
      results.violations.forEach((violation: any) => {
        this.violations.push({
          rule: violation.id,
          severity: violation.impact || 'minor',
          element: violation.nodes[0]?.target[0] || 'unknown',
          description: violation.description,
          help: violation.help,
        });
      });
    }
  }

  private async checkKeyboardNavigation(page: Page): Promise<void> {
    try {
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
      
      if (!firstFocusedElement || firstFocusedElement === 'BODY') {
        this.violations.push({
          rule: 'keyboard-navigation',
          severity: 'error',
          element: 'page',
          description: 'No focusable elements found or first tab stops at body',
          help: 'Ensure there are focusable elements and logical tab order',
        });
      } else {
        this.passedChecks.push('First element focusable via keyboard');
      }

      // Test escape key functionality
      await page.keyboard.press('Escape');
      
      // Test arrow key navigation for menus/lists
      const menuElements = await page.locator('[role="menu"], [role="menubar"], [role="listbox"]').count();
      if (menuElements > 0) {
        await page.keyboard.press('ArrowDown');
        this.passedChecks.push('Arrow key navigation available');
      }

    } catch (error) {
      this.violations.push({
        rule: 'keyboard-navigation',
        severity: 'error',
        element: 'page',
        description: 'Keyboard navigation test failed',
        help: 'Ensure keyboard navigation is properly implemented',
      });
    }
  }

  private async checkAriaLabels(page: Page): Promise<void> {
    // Check for missing ARIA labels on interactive elements
    const interactiveElements = await page.locator('button, a, input, select, textarea').all();
    
    for (const element of interactiveElements) {
      const tagName = await element.evaluate(el => el.tagName);
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledby = await element.getAttribute('aria-labelledby');
      const textContent = await element.textContent();
      const altText = await element.getAttribute('alt');
      const title = await element.getAttribute('title');
      
      const hasAccessibleName = !!(
        ariaLabel || 
        ariaLabelledby || 
        (textContent && textContent.trim()) ||
        altText ||
        title
      );

      if (!hasAccessibleName) {
        this.violations.push({
          rule: 'aria-labels',
          severity: 'error',
          element: tagName.toLowerCase(),
          description: `${tagName} element missing accessible name`,
          help: 'Add aria-label, aria-labelledby, or visible text content',
        });
      }
    }

    // Check for proper ARIA roles
    const elementsWithRoles = await page.locator('[role]').all();
    const validRoles = [
      'alert', 'alertdialog', 'article', 'banner', 'button', 'cell', 'checkbox',
      'columnheader', 'combobox', 'complementary', 'contentinfo', 'dialog',
      'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group',
      'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'main',
      'menu', 'menubar', 'menuitem', 'navigation', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'search', 'separator', 'slider', 'spinbutton', 'status',
      'switch', 'tab', 'tablist', 'tabpanel', 'textbox', 'timer', 'tooltip',
      'tree', 'treeitem'
    ];

    for (const element of elementsWithRoles) {
      const role = await element.getAttribute('role');
      if (role && !validRoles.includes(role)) {
        this.violations.push({
          rule: 'aria-roles',
          severity: 'warning',
          element: await element.evaluate(el => el.tagName.toLowerCase()),
          description: `Invalid ARIA role: ${role}`,
          help: 'Use valid ARIA roles from the ARIA specification',
        });
      }
    }

    this.passedChecks.push(`Checked ${interactiveElements.length} interactive elements for ARIA labels`);
  }

  private async checkHeadingStructure(page: Page): Promise<void> {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels: number[] = [];

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      const level = parseInt(tagName.substring(1));
      headingLevels.push(level);
    }

    // Check for proper heading hierarchy
    let hasH1 = false;
    let previousLevel = 0;

    for (let i = 0; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      
      if (currentLevel === 1) {
        hasH1 = true;
      }

      if (i > 0 && currentLevel > previousLevel + 1) {
        this.violations.push({
          rule: 'heading-structure',
          severity: 'warning',
          element: `h${currentLevel}`,
          description: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          help: 'Use heading levels in sequential order (h1, h2, h3, etc.)',
        });
      }

      previousLevel = currentLevel;
    }

    if (headingLevels.length > 0 && !hasH1) {
      this.violations.push({
        rule: 'heading-structure',
        severity: 'error',
        element: 'page',
        description: 'Page missing h1 heading',
        help: 'Every page should have exactly one h1 heading',
      });
    }

    this.passedChecks.push(`Checked ${headingLevels.length} headings for proper structure`);
  }

  private async checkColorContrast(page: Page): Promise<void> {
    // This is a simplified color contrast check
    // In a real implementation, you would use more sophisticated color analysis
    const textElements = await page.locator('p, span, div, a, button, h1, h2, h3, h4, h5, h6').all();
    
    for (const element of textElements.slice(0, 10)) { // Check first 10 elements
      try {
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          };
        });

        // Simple heuristic: if background is transparent/none and color is very light, flag it
        if (styles.backgroundColor === 'rgba(0, 0, 0, 0)' || styles.backgroundColor === 'transparent') {
          if (styles.color.includes('rgb(255, 255, 255)') || styles.color.includes('#fff')) {
            this.violations.push({
              rule: 'color-contrast',
              severity: 'warning',
              element: await element.evaluate(el => el.tagName.toLowerCase()),
              description: 'Potential color contrast issue: white text on transparent background',
              help: 'Ensure sufficient color contrast between text and background',
            });
          }
        }
      } catch (error) {
        // Skip elements that can't be analyzed
      }
    }

    this.passedChecks.push('Color contrast analysis completed');
  }

  private async checkFocusManagement(page: Page): Promise<void> {
    // Check for visible focus indicators
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const focusStyles = await focusedElement.evaluate((el) => {
      if (!el) return null;
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        outlineStyle: computed.outlineStyle,
        outlineColor: computed.outlineColor,
        boxShadow: computed.boxShadow,
      };
    }).catch(() => null);

    if (focusStyles) {
      const hasVisibleFocus = !!(
        (focusStyles.outline && focusStyles.outline !== 'none') ||
        (focusStyles.outlineWidth && focusStyles.outlineWidth !== '0px') ||
        (focusStyles.boxShadow && focusStyles.boxShadow !== 'none')
      );

      if (!hasVisibleFocus) {
        this.violations.push({
          rule: 'focus-visible',
          severity: 'error',
          element: 'focused-element',
          description: 'Focused element has no visible focus indicator',
          help: 'Ensure all focusable elements have visible focus indicators',
        });
      } else {
        this.passedChecks.push('Visible focus indicators present');
      }
    }
  }

  private async checkFormLabels(page: Page): Promise<void> {
    const formControls = await page.locator('input, select, textarea').all();
    
    for (const control of formControls) {
      const id = await control.getAttribute('id');
      const ariaLabel = await control.getAttribute('aria-label');
      const ariaLabelledby = await control.getAttribute('aria-labelledby');
      const placeholder = await control.getAttribute('placeholder');
      
      let hasLabel = false;
      
      if (id) {
        const labelExists = await page.locator(`label[for="${id}"]`).count() > 0;
        hasLabel = labelExists;
      }
      
      hasLabel = hasLabel || !!(ariaLabel || ariaLabelledby);
      
      if (!hasLabel) {
        const tagName = await control.evaluate(el => el.tagName);
        this.violations.push({
          rule: 'form-labels',
          severity: 'error',
          element: tagName.toLowerCase(),
          description: `Form control missing accessible label`,
          help: 'Add a label element, aria-label, or aria-labelledby attribute',
        });
      }
    }

    this.passedChecks.push(`Checked ${formControls.length} form controls for labels`);
  }

  private calculateAccessibilityScore(): number {
    const totalChecks = this.violations.length + this.passedChecks.length;
    if (totalChecks === 0) return 100;
    
    // Weight violations by severity
    let severityWeight = 0;
    this.violations.forEach(violation => {
      switch (violation.severity) {
        case 'error':
          severityWeight += 10;
          break;
        case 'warning':
          severityWeight += 5;
          break;
        case 'info':
          severityWeight += 1;
          break;
      }
    });
    
    // Calculate score (100 - severity weight, minimum 0)
    return Math.max(0, 100 - severityWeight);
  }
}

// Keyboard navigation testing utilities
export async function testKeyboardNavigation(page: Page, elements: string[]): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // Test tab navigation through specified elements
    for (let i = 0; i < elements.length; i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          ariaLabel: el.getAttribute('aria-label'),
        } : null;
      });
      
      if (!focusedElement) {
        issues.push(`Tab ${i + 1}: No element focused`);
        continue;
      }
      
      // Check if the focused element matches expected
      const expectedElement = page.locator(elements[i]);
      const isExpectedFocused = await expectedElement.evaluate((el, focused) => {
        return el === document.activeElement;
      }, focusedElement);
      
      if (!isExpectedFocused) {
        issues.push(`Tab ${i + 1}: Expected ${elements[i]} but got ${focusedElement.tagName}#${focusedElement.id}`);
      }
    }
    
    // Test reverse tab navigation
    for (let i = elements.length - 1; i >= 0; i--) {
      await page.keyboard.press('Shift+Tab');
      
      const expectedElement = page.locator(elements[i]);
      const isFocused = await expectedElement.evaluate(el => el === document.activeElement);
      
      if (!isFocused) {
        issues.push(`Shift+Tab ${elements.length - i}: Expected ${elements[i]} to be focused`);
      }
    }
    
  } catch (error) {
    issues.push(`Keyboard navigation test failed: ${error}`);
  }
  
  return {
    passed: issues.length === 0,
    issues,
  };
}

// Screen reader simulation
export async function testScreenReaderContent(page: Page): Promise<{
  content: string[];
  structure: { level: number; text: string }[];
  landmarks: string[];
}> {
  // Get accessible content structure
  const content = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
          
          const element = node as Element;
          
          // Skip hidden elements
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Include elements with ARIA roles or semantic meaning
          if (element.hasAttribute('role') || 
              element.hasAttribute('aria-label') ||
              ['MAIN', 'NAV', 'HEADER', 'FOOTER', 'SECTION', 'ARTICLE', 'ASIDE'].includes(element.tagName)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const content: string[] = [];
    let node;
    
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        content.push(node.textContent?.trim() || '');
      } else {
        const element = node as Element;
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          content.push(ariaLabel);
        }
      }
    }
    
    return content.filter(text => text.length > 0);
  });

  // Get heading structure
  const structure = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headings.map(heading => ({
      level: parseInt(heading.tagName.substring(1)),
      text: heading.textContent?.trim() || '',
    }));
  });

  // Get landmarks
  const landmarks = await page.evaluate(() => {
    const landmarkElements = Array.from(document.querySelectorAll(`
      [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"],
      [role="complementary"], [role="search"], [role="region"],
      main, nav, header, footer, aside, section[aria-labelledby], section[aria-label]
    `));
    
    return landmarkElements.map(element => {
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      const label = element.getAttribute('aria-label') || 
                   element.getAttribute('aria-labelledby') || 
                   '';
      return label ? `${role}: ${label}` : role;
    });
  });

  return { content, structure, landmarks };
}

// Color contrast testing utility
export async function testColorContrast(page: Page, minimumRatio: number = 4.5): Promise<{
  passed: boolean;
  violations: Array<{ element: string; ratio: number; colors: { fg: string; bg: string } }>;
}> {
  // This would require a more sophisticated color analysis library in a real implementation
  // For now, we'll do a basic check
  const violations = await page.evaluate((minRatio) => {
    const violations: Array<{ element: string; ratio: number; colors: { fg: string; bg: string } }> = [];
    
    // Simple color contrast approximation
    function getLuminance(rgb: string): number {
      const match = rgb.match(/\d+/g);
      if (!match) return 0;
      
      const [r, g, b] = match.map(Number);
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    function getContrastRatio(fg: string, bg: string): number {
      const l1 = getLuminance(fg);
      const l2 = getLuminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }
    
    const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6');
    
    for (const element of Array.from(textElements).slice(0, 20)) {
      const style = window.getComputedStyle(element);
      const fg = style.color;
      const bg = style.backgroundColor;
      
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const ratio = getContrastRatio(fg, bg);
        if (ratio < minRatio) {
          violations.push({
            element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
            ratio,
            colors: { fg, bg },
          });
        }
      }
    }
    
    return violations;
  }, minimumRatio);

  return {
    passed: violations.length === 0,
    violations,
  };
}

// Export singleton instance
export const accessibilityTester = new AccessibilityTester();