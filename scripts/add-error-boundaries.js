#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of all page files that need error boundaries
const pageFiles = [
  // Auth pages
  'src/app/auth/login/page.tsx',
  'src/app/auth/signup/page.tsx',
  'src/app/auth/forgot-password/page.tsx',
  'src/app/auth/reset-password/page.tsx',
  'src/app/auth/verify-email/page.tsx',
  'src/app/auth/oauth-success/page.tsx',

  // Dynamic pages (CRITICAL)
  'src/app/challenge-hub/[boardId]/page.tsx',
  'src/app/join/[sessionId]/page.tsx',
  'src/app/play-area/session/[id]/page.tsx',
  'src/app/products/[slug]/page.tsx',

  // Feature pages
  'src/app/challenge-hub/page.tsx',
  'src/app/community/page.tsx',
  'src/app/play-area/page.tsx',
  'src/app/play-area/bingo/page.tsx',
  'src/app/play-area/quick/page.tsx',
  'src/app/play-area/tournaments/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/user/page.tsx',
  'src/app/user/edit/page.tsx',
  'src/app/test-multiplayer/page.tsx',
  'src/app/about/page.tsx',
  'src/app/page.tsx',
];

// Layout files
const layoutFiles = [
  'src/app/auth/layout.tsx',
  'src/app/challenge-hub/layout.tsx',
];

function addErrorBoundaryToPage(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has RouteErrorBoundary
  if (content.includes('RouteErrorBoundary')) {
    console.log(`✓ Already has error boundary: ${filePath}`);
    return;
  }

  // Add import if not present
  if (!content.includes("from '@/components/error-boundaries'")) {
    // Find the last import statement
    const importRegex = /^import.*from.*$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      content =
        content.slice(0, lastImportIndex + lastImport.length) +
        "\nimport { RouteErrorBoundary } from '@/components/error-boundaries';" +
        content.slice(lastImportIndex + lastImport.length);
    }
  }

  // Wrap the default export
  const exportRegex =
    /export\s+default\s+(?:async\s+)?function\s+\w+Page.*?\{[\s\S]*?return\s+\(([\s\S]*?)\n\);?\n\}/;
  const match = content.match(exportRegex);

  if (match) {
    const returnContent = match[1];
    const wrappedReturn = `(\n    <RouteErrorBoundary>\n${returnContent}\n    </RouteErrorBoundary>\n  )`;
    content = content.replace(
      match[0],
      match[0].replace(`return (${returnContent}\n)`, `return ${wrappedReturn}`)
    );

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Added error boundary to: ${filePath}`);
  } else {
    console.warn(`⚠️  Could not parse: ${filePath}`);
  }
}

function addErrorBoundaryToLayout(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has BaseErrorBoundary
  if (content.includes('BaseErrorBoundary')) {
    console.log(`✓ Already has error boundary: ${filePath}`);
    return;
  }

  // Add import if not present
  if (!content.includes("from '@/components/error-boundaries'")) {
    // Find the last import statement
    const importRegex = /^import.*from.*$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      content =
        content.slice(0, lastImportIndex + lastImport.length) +
        "\nimport { BaseErrorBoundary } from '@/components/error-boundaries';" +
        content.slice(lastImportIndex + lastImport.length);
    }
  }

  // Wrap the children in layout
  const childrenRegex = /{children}/;
  if (childrenRegex.test(content)) {
    content = content.replace(
      '{children}',
      '<BaseErrorBoundary level="layout">{children}</BaseErrorBoundary>'
    );

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Added error boundary to layout: ${filePath}`);
  } else {
    console.warn(`⚠️  Could not parse layout: ${filePath}`);
  }
}

// Process all files
console.log('Adding error boundaries to pages...\n');

pageFiles.forEach(addErrorBoundaryToPage);

console.log('\nAdding error boundaries to layouts...\n');

layoutFiles.forEach(addErrorBoundaryToLayout);

console.log('\n✨ Done!');
