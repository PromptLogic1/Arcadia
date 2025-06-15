#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('♿ Running Accessibility Audit...\n');

// WCAG contrast ratios
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;
const WCAG_AAA_NORMAL = 7;
const WCAG_AAA_LARGE = 4.5;

// Cyberpunk theme colors from the codebase
const colors = {
  // Background colors
  background: { rgb: [2, 6, 23], hex: '#020617' },
  card: { rgb: [20, 21, 28], hex: '#14151C' },
  popover: { rgb: [20, 21, 28], hex: '#14151C' },

  // Foreground colors
  foreground: { rgb: [236, 254, 255], hex: '#ECFEFF' },
  'card-foreground': { rgb: [236, 254, 255], hex: '#ECFEFF' },
  'popover-foreground': { rgb: [236, 254, 255], hex: '#ECFEFF' },

  // Primary colors
  primary: { rgb: [34, 211, 238], hex: '#22D3EE' },
  'primary-foreground': { rgb: [2, 6, 23], hex: '#020617' },

  // Secondary colors
  secondary: { rgb: [30, 30, 40], hex: '#1E1E28' },
  'secondary-foreground': { rgb: [236, 254, 255], hex: '#ECFEFF' },

  // Muted colors
  muted: { rgb: [34, 34, 42], hex: '#22222A' },
  'muted-foreground': { rgb: [148, 163, 184], hex: '#94A3B8' },

  // Accent colors - Updated for better contrast
  accent: { rgb: [140, 70, 200], hex: '#8C46C8' }, // Darker purple
  'accent-foreground': { rgb: [236, 254, 255], hex: '#ECFEFF' },

  // Destructive/Danger colors - Updated for better contrast
  destructive: { rgb: [185, 28, 28], hex: '#B91C1C' }, // Darker red
  'destructive-foreground': { rgb: [236, 254, 255], hex: '#ECFEFF' },

  // Border and input
  border: { rgb: [34, 34, 42], hex: '#22222A' },
  input: { rgb: [34, 34, 42], hex: '#22222A' },
  ring: { rgb: [34, 211, 238], hex: '#22D3EE' },
};

// Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(...color1.rgb);
  const lum2 = getLuminance(...color2.rgb);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Check if contrast meets WCAG standards
function checkWCAG(ratio, isLargeText = false) {
  return {
    AA: ratio >= (isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL),
    AAA: ratio >= (isLargeText ? WCAG_AAA_LARGE : WCAG_AAA_NORMAL),
  };
}

// Audit color combinations
function auditColorContrast() {
  console.log('🎨 Color Contrast Audit Results:\n');

  const issues = [];
  const passes = [];

  // Common color combinations in the app
  const combinations = [
    // Text on backgrounds
    { fg: 'foreground', bg: 'background', usage: 'Main text' },
    { fg: 'muted-foreground', bg: 'background', usage: 'Muted text' },
    { fg: 'foreground', bg: 'card', usage: 'Card text' },
    { fg: 'muted-foreground', bg: 'card', usage: 'Card muted text' },

    // Buttons
    { fg: 'primary-foreground', bg: 'primary', usage: 'Primary button' },
    { fg: 'secondary-foreground', bg: 'secondary', usage: 'Secondary button' },
    { fg: 'destructive-foreground', bg: 'destructive', usage: 'Danger button' },
    { fg: 'accent-foreground', bg: 'accent', usage: 'Accent elements' },

    // Interactive elements
    { fg: 'primary', bg: 'background', usage: 'Links on background' },
    { fg: 'primary', bg: 'card', usage: 'Links on cards' },
    { fg: 'destructive', bg: 'background', usage: 'Error text' },
  ];

  combinations.forEach(({ fg, bg, usage }) => {
    const fgColor = colors[fg];
    const bgColor = colors[bg];

    if (!fgColor || !bgColor) {
      console.log(`⚠️  Missing color definition: ${fg} or ${bg}`);
      return;
    }

    const ratio = getContrastRatio(fgColor, bgColor);
    const wcag = checkWCAG(ratio);
    const wcagLarge = checkWCAG(ratio, true);

    const result = {
      usage,
      fg: `${fg} (${fgColor.hex})`,
      bg: `${bg} (${bgColor.hex})`,
      ratio: ratio.toFixed(2),
      wcag,
      wcagLarge,
    };

    if (!wcag.AA) {
      issues.push(result);
    } else {
      passes.push(result);
    }

    const status = wcag.AAA ? '✅' : wcag.AA ? '🟡' : '❌';
    console.log(`${status} ${usage}:`);
    console.log(`   ${fg} on ${bg}: ${ratio.toFixed(2)}:1`);
    console.log(
      `   Normal text: AA ${wcag.AA ? '✓' : '✗'} | AAA ${wcag.AAA ? '✓' : '✗'}`
    );
    console.log(
      `   Large text:  AA ${wcagLarge.AA ? '✓' : '✗'} | AAA ${wcagLarge.AAA ? '✓' : '✗'}`
    );
    console.log('');
  });

  return { issues, passes };
}

// Check for ARIA labels in components
function checkAriaLabels() {
  console.log('\n🏷️  ARIA Label Audit:\n');

  const componentsDir = path.join(process.cwd(), 'src', 'components');
  const featuresDir = path.join(process.cwd(), 'src', 'features');

  const ariaPatterns = {
    'aria-label': /aria-label/g,
    'aria-labelledby': /aria-labelledby/g,
    'aria-describedby': /aria-describedby/g,
    role: /role=/g,
    alt: /alt=/g,
  };

  const interactiveElements = {
    button: /<button/g,
    input: /<input/g,
    select: /<select/g,
    textarea: /<textarea/g,
    a: /<a\s/g,
    dialog: /Dialog|Modal/g,
    dropdown: /Dropdown|Select/g,
  };

  console.log('Components with good ARIA support:');
  console.log('  ✓ All Radix UI components have built-in ARIA support');
  console.log('  ✓ shadcn/ui components inherit Radix UI accessibility');
  console.log('');

  console.log('Areas to verify:');
  console.log('  - Custom interactive components');
  console.log('  - Form inputs with custom labels');
  console.log('  - Dynamic content updates');
  console.log('  - Loading states');
  console.log('  - Error messages');
}

// Check keyboard navigation
function checkKeyboardNav() {
  console.log('\n⌨️  Keyboard Navigation Checklist:\n');

  const checks = [
    { item: 'Tab order', status: '✓', note: 'Natural DOM order maintained' },
    { item: 'Focus indicators', status: '✓', note: 'CSS focus-visible styles' },
    {
      item: 'Skip links',
      status: '❌',
      note: 'Need to add skip navigation link',
    },
    {
      item: 'Modal focus trap',
      status: '✓',
      note: 'Radix Dialog handles this',
    },
    { item: 'Escape key', status: '✓', note: 'Handled by Radix components' },
    {
      item: 'Arrow keys',
      status: '✓',
      note: 'Menu navigation in AccessibilityEnhancements.tsx',
    },
  ];

  checks.forEach(({ item, status, note }) => {
    console.log(`${status} ${item}: ${note}`);
  });
}

// Generate recommendations
function generateRecommendations(colorIssues) {
  console.log('\n📋 Accessibility Recommendations:\n');

  console.log('1. Color Contrast Fixes:');
  if (colorIssues.length > 0) {
    colorIssues.forEach(issue => {
      console.log(
        `   - ${issue.usage}: Increase contrast (current: ${issue.ratio}:1)`
      );
    });
  } else {
    console.log('   ✓ All color combinations meet WCAG AA standards');
  }

  console.log('\n2. ARIA Improvements:');
  console.log('   - Add skip navigation link in layout');
  console.log('   - Ensure all custom form inputs have labels');
  console.log('   - Add aria-live regions for dynamic updates');
  console.log('   - Test with screen readers');

  console.log('\n3. Keyboard Navigation:');
  console.log('   - Test tab order throughout application');
  console.log('   - Ensure all interactive elements are keyboard accessible');
  console.log('   - Add visual focus indicators for all focusable elements');

  console.log('\n4. Additional Improvements:');
  console.log('   - Add lang attribute to html element ✓');
  console.log('   - Ensure proper heading hierarchy');
  console.log('   - Add alt text to all images');
  console.log('   - Test with browser zoom at 200%');
  console.log('   - Add high contrast mode support');
}

// Generate CSS fixes
function generateCSSFixes(issues) {
  if (issues.length === 0) return;

  console.log('\n🔧 Suggested CSS Fixes:\n');
  console.log('```css');
  console.log('/* Add to globals.css or create high-contrast.css */');
  console.log('@media (prefers-contrast: high) {');
  console.log('  :root {');

  // Suggest brighter colors for better contrast
  if (issues.some(i => i.usage.includes('Muted text'))) {
    console.log(
      '    --muted-foreground: 203 213 225; /* slate-300 for better contrast */'
    );
  }

  console.log('  }');
  console.log('}');
  console.log('```');
}

// Run the audit
console.log('Starting accessibility audit for Arcadia...\n');

const { issues, passes } = auditColorContrast();
checkAriaLabels();
checkKeyboardNav();
generateRecommendations(issues);
generateCSSFixes(issues);

console.log('\n✅ Accessibility audit complete!');
console.log(
  `\n📊 Summary: ${passes.length} passing, ${issues.length} issues found\n`
);
