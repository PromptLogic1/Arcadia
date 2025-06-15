#!/usr/bin/env tsx
/**
 * Fix Component Naming Consistency
 * Renames kebab-case component files to PascalCase and updates all imports
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const componentsToRename = [
  { old: 'scroll-area.tsx', new: 'ScrollArea.tsx' },
  { old: 'dropdown-menu.tsx', new: 'DropdownMenu.tsx' },
  { old: 'loading-spinner.tsx', new: 'LoadingSpinner.tsx' },
  { old: 'alert-dialog.tsx', new: 'AlertDialog.tsx' },
  { old: 'loading-states.tsx', new: 'LoadingStates.tsx' },
  { old: 'theme-provider.tsx', new: 'ThemeProvider.tsx' },
  { old: 'toggle-group.tsx', new: 'ToggleGroup.tsx' },
  { old: 'form-field.tsx', new: 'FormField.tsx' },
  { old: 'form-message.tsx', new: 'FormMessage.tsx' },
  { old: 'toast-primitive.tsx', new: 'ToastPrimitive.tsx' },
  { old: 'use-toast.ts', new: 'UseToast.ts' },
];

const uiPath = path.join(process.cwd(), 'src/components/ui');

console.log('🔧 Fixing component naming consistency...\n');

// Step 1: Rename files
componentsToRename.forEach(({ old: oldName, new: newName }) => {
  const oldPath = path.join(uiPath, oldName);
  const newPath = path.join(uiPath, newName);

  if (fs.existsSync(oldPath)) {
    // Use git mv to preserve history
    try {
      execSync(`git mv "${oldPath}" "${newPath}"`, { stdio: 'pipe' });
      console.log(`✅ Renamed: ${oldName} → ${newName}`);
    } catch (error) {
      // If git mv fails, try regular rename
      fs.renameSync(oldPath, newPath);
      console.log(`✅ Renamed: ${oldName} → ${newName} (non-git)`);
    }
  } else {
    console.log(`⚠️  Skipped: ${oldName} (not found)`);
  }
});

console.log('\n🔍 Updating imports across the codebase...\n');

// Step 2: Update imports across the codebase
function updateImportsInFile(filePath: string) {
  if (
    !fs.existsSync(filePath) ||
    (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx'))
  ) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let hasChanges = false;

  componentsToRename.forEach(({ old: oldName, new: newName }) => {
    const oldNameWithoutExt = oldName.replace(/\.(ts|tsx)$/, '');
    const newNameWithoutExt = newName.replace(/\.(ts|tsx)$/, '');

    // Update import statements
    const importRegex = new RegExp(
      `from ['"](.*/ui/)${oldNameWithoutExt}['"]`,
      'g'
    );

    if (importRegex.test(content)) {
      content = content.replace(importRegex, `from '$1${newNameWithoutExt}'`);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(
      `✅ Updated imports in: ${path.relative(process.cwd(), filePath)}`
    );
  }
}

// Recursively find all TypeScript files
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !file.startsWith('.') &&
      file !== 'node_modules'
    ) {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      files.push(fullPath);
    }
  });

  return files;
}

// Update imports in all TypeScript files
const srcPath = path.join(process.cwd(), 'src');
const tsFiles = findTypeScriptFiles(srcPath);

tsFiles.forEach(updateImportsInFile);

console.log('\n✅ Component naming consistency fixed!');
console.log('📝 Note: Review the changes and commit when ready.');
