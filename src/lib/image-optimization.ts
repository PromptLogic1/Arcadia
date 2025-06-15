/**
 * Image optimization utilities
 *
 * Provides helpers for responsive images, srcset generation, and performance optimization
 */

/**
 * Generate optimized image URLs for different device pixel ratios
 * This helps serve appropriately sized images based on device capabilities
 */
export function generateImageSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
): string {
  // For Next.js image optimization, we can use the _next/image endpoint
  if (src.startsWith('http') || src.startsWith('//')) {
    // External images - return as is (Next.js will handle optimization)
    return widths.map(w => `${src} ${w}w`).join(', ');
  }

  // For local images, use Next.js image optimization API
  return widths
    .map(w => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`)
    .join(', ');
}

/**
 * Calculate optimal sizes attribute based on layout type
 */
export function getOptimalSizes(
  layoutType: 'hero' | 'card' | 'thumbnail' | 'gallery' | 'full'
): string {
  const sizeMap = {
    hero: '100vw',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    thumbnail: '(max-width: 640px) 100px, 200px',
    gallery: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
    full: '100vw',
  };

  return sizeMap[layoutType] || sizeMap.card;
}

/**
 * Get image dimensions for responsive loading
 */
export function getResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalHeight / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * aspectRatio),
  };
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(src: string, sizes?: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  if (sizes) {
    link.setAttribute('imagesizes', sizes);
  }
  document.head.appendChild(link);
}

/**
 * Generate placeholder for lazy loaded images
 */
export function generatePlaceholder(
  width: number,
  height: number,
  color = '#e5e7eb'
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Check if image format is supported
 */
export function isFormatSupported(format: 'webp' | 'avif'): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'avif' | 'webp' | 'jpeg' {
  if (isFormatSupported('avif')) return 'avif';
  if (isFormatSupported('webp')) return 'webp';
  return 'jpeg';
}

/**
 * Calculate optimal quality based on image type and size
 */
export function getOptimalQuality(
  imageType: 'photo' | 'illustration' | 'screenshot',
  width: number
): number {
  // Higher quality for smaller images, lower for larger
  const sizeMultiplier = width > 1920 ? 0.9 : width > 1280 ? 0.95 : 1;

  const baseQuality = {
    photo: 85,
    illustration: 90,
    screenshot: 95,
  };

  return Math.round(baseQuality[imageType] * sizeMultiplier);
}

/**
 * Create responsive picture element configuration
 */
export interface PictureSource {
  srcSet: string;
  type: string;
  media?: string;
  sizes?: string;
}

export function generatePictureSources(
  baseSrc: string,
  options: {
    formats?: ('avif' | 'webp' | 'jpeg')[];
    breakpoints?: { width: number; sizes: string }[];
  } = {}
): PictureSource[] {
  const formats = options.formats || ['avif', 'webp', 'jpeg'];
  const breakpoints = options.breakpoints || [
    { width: 640, sizes: '100vw' },
    { width: 1024, sizes: '50vw' },
    { width: 1536, sizes: '33vw' },
  ];

  const sources: PictureSource[] = [];

  // Generate sources for each format except the fallback
  formats.slice(0, -1).forEach(format => {
    breakpoints.forEach(({ width, sizes }) => {
      sources.push({
        srcSet: `${baseSrc}?fm=${format}&w=${width} ${width}w`,
        type: `image/${format}`,
        media: `(max-width: ${width}px)`,
        sizes,
      });
    });
  });

  return sources;
}
