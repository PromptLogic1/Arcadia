#!/usr/bin/env node

/**
 * Icon Import Replacement Script
 *
 * Automatically replaces direct lucide-react imports with centralized icon imports
 * to reduce bundle size through proper tree-shaking.
 */

const fs = require('fs');
const path = require('path');

const ICONS_TO_REPLACE = [
  'Menu',
  'X',
  'Search',
  'Bell',
  'Download',
  'ChevronDown',
  'ChevronRight',
  'ChevronLeft',
  'ArrowUp',
  'ArrowLeft',
  'ExternalLink',
  'Gamepad2',
  'GamepadIcon',
  'Trophy',
  'Crown',
  'Star',
  'Sparkles',
  'Zap',
  'Puzzle',
  'Grid3x3',
  'Grid',
  'User',
  'Users',
  'Users2',
  'UserPlus',
  'UserMinus',
  'Settings',
  'Lock',
  'Key',
  'Mail',
  'Play',
  'Pause',
  'RefreshCw',
  'RotateCcw',
  'Plus',
  'PlusCircle',
  'Minus',
  'Edit',
  'Edit3',
  'Pencil',
  'Trash2',
  'Archive',
  'GripVertical',
  'Check',
  'CheckCircle2',
  'AlertCircle',
  'AlertTriangle',
  'Info',
  'Loader2',
  'Loader',
  'WifiOff',
  'MessageCircle',
  'Calendar',
  'Clock',
  'Timer',
  'Heart',
  'ThumbsUp',
  'Video',
  'VideoOff',
  'Volume2',
  'Home',
  'Activity',
  'Package',
  'Globe',
  'Hash',
  'Tags',
  'Layers',
  'Gauge',
  'Wand2',
  'Lightbulb',
  'Grid3X3',
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern to match lucide-react imports
  const importPattern = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;

  const matches = [...content.matchAll(importPattern)];

  if (matches.length === 0) return false;

  matches.forEach(match => {
    const fullImport = match[0];
    const iconsList = match[1];

    // Extract individual icons
    const icons = iconsList.split(',').map(icon => icon.trim());
    const validIcons = icons.filter(icon => {
      const iconName = icon.split(' as ')[0].trim();
      return ICONS_TO_REPLACE.includes(iconName);
    });

    if (validIcons.length > 0) {
      // Replace with centralized import
      const newImport = `import { ${validIcons.join(', ')} } from '@/components/ui/icons'`;
      content = content.replace(fullImport, newImport);
      modified = true;

      console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
      console.log(`   Replaced: ${fullImport}`);
      console.log(`   With: ${newImport}\n`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return modified;
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalModified = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (
      stat.isDirectory() &&
      !file.includes('node_modules') &&
      !file.includes('.next')
    ) {
      totalModified += scanDirectory(filePath);
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.includes('.test.')
    ) {
      if (processFile(filePath)) {
        totalModified++;
      }
    }
  });

  return totalModified;
}

console.log('🔄 Replacing lucide-react imports...\n');

const srcDir = path.join(process.cwd(), 'src');
const totalModified = scanDirectory(srcDir);

console.log(`\n✨ Done! Modified ${totalModified} files.`);
console.log(
  '\nNote: You may need to run "npm run type-check" to ensure all imports are correct.'
);
