#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to update - these are using next/image directly
const filesToUpdate = [
  'src/features/landing/components/FeaturedGamesCarousel.tsx',
  'src/features/landing/components/UpcomingEventsSection.tsx',
  'src/features/landing/components/PartnersSection.tsx',
  'src/features/user/components/ProfileHeader.tsx',
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = content;

  // Replace next/image import with OptimizedImage import
  updated = updated.replace(
    /import\s+(?:Image|NextImage)\s+from\s+['"]next\/image['"]/g,
    "import { OptimizedImage } from '@/components/ui/image'"
  );

  // Replace Image usage with OptimizedImage
  updated = updated.replace(/<Image\s+/g, '<OptimizedImage ');

  // Remove unoptimized prop if present (not needed with OptimizedImage)
  updated = updated.replace(/\s*unoptimized(?:={true})?/g, '');

  // Add responsive sizes for common image patterns
  updated = updated.replace(/(<OptimizedImage[^>]+)(?!sizes=)/g, match => {
    // Only add sizes if it doesn't already have one
    if (!match.includes('sizes=')) {
      return (
        match +
        '\n          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"'
      );
    }
    return match;
  });

  if (updated !== content) {
    fs.writeFileSync(fullPath, updated);
    console.log(`✅ Updated ${filePath}`);
    return true;
  }

  console.log(`📝 No changes needed for ${filePath}`);
  return false;
}

console.log('🖼️  Optimizing image usage...\n');

let updatedCount = 0;
filesToUpdate.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✨ Updated ${updatedCount} files`);
console.log(
  '\n💡 Note: Consider adding blur placeholders for hero images for better UX.'
);
