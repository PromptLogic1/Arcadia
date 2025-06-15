/**
 * Image optimization utilities for Arcadia
 */

// Collection of pre-generated blur data URLs for common images
export const BLUR_DATA_URLS = {
  // Default transparent blur placeholder
  DEFAULT:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==',

  // Cyberpunk themed blur (cyan/purple gradient)
  CYBERPUNK:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAeEAABAwQDAAAAAAAAAAAAAAABAAIDERIhBDFRYf/EABUBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFxEAAwEAAAAAAAAAAAAAAAAAAAECEf/aAAwDAQACEQMRAD8AuOJk4TZXAXuaHODcgE/V8RFUmf/Z',

  // Dark blur for hero sections
  HERO: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAYEAADAQEAAAAAAAAAAAAAAAABAgMAEf/EABUBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFxEBAQEBAAAAAAAAAAAAAAAAAAECEf/aAAwDAQACEQMRAD8Amy01bN0yMNgYnxRDHzP/2Q==',

  // Game-specific blur placeholders
  GAMES: {
    WOW: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAYEAACAwAAAAAAAAAAAAAAAAABAgADBP/EABUBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQAR/9oADAMBAAIRAxEAPwCPmprdbW8N7sAwm5MiJEg//9k=',
    ELDEN_RING:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAYEAADAQEAAAAAAAAAAAAAAAABAgMRBP/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQAR/9oADAMBAAIRAxEAPwCHOJLaJGTQ1QrBv//Z',
    CYBERPUNK:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAZEAABBQAAAAAAAAAAAAAAAAEAAgMSMf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFxEAAwEAAAAAAAAAAAAAAAAAAAECEf/aAAwDAQACEQMRAD8AlOZQTBuOiNrEH//Z',
    FORTNITE:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAXEAADAQAAAAAAAAAAAAAAAAABAgME/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEQMRAD8AjRdJaqQoqgP/2Q==',
    WITCHER:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAXEAADAQAAAAAAAAAAAAAAAAABAwQC/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAH/xAAWEQEBAQAAAAAAAAAAAAAAAAABABH/2gAMAwEAAhEDEQA/AJGjVPLkB0OwH//Z',
  },

  // Avatar blur placeholder
  AVATAR:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAYEAADAQEAAAAAAAAAAAAAAAABAgMEBf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEAAwAAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwCPnNnCjBlJP//Z',
} as const;

/**
 * Get the appropriate blur data URL for an image
 * @param imagePath The path to the image
 * @returns The blur data URL
 */
export function getBlurDataUrl(imagePath: string): string {
  // Check for specific game images
  if (imagePath.includes('wow')) return BLUR_DATA_URLS.GAMES.WOW;
  if (imagePath.includes('elden-ring')) return BLUR_DATA_URLS.GAMES.ELDEN_RING;
  if (imagePath.includes('cyberpunk')) return BLUR_DATA_URLS.GAMES.CYBERPUNK;
  if (imagePath.includes('fortnite')) return BLUR_DATA_URLS.GAMES.FORTNITE;
  if (imagePath.includes('witcher')) return BLUR_DATA_URLS.GAMES.WITCHER;

  // Check for avatar images
  if (imagePath.includes('avatar')) return BLUR_DATA_URLS.AVATAR;

  // Check for hero images
  if (imagePath.includes('hero') || imagePath.includes('banner'))
    return BLUR_DATA_URLS.HERO;

  // Default to cyberpunk theme for other images
  return BLUR_DATA_URLS.CYBERPUNK;
}

/**
 * Preload an image for faster loading
 * @param src The image source URL
 */
export function preloadImage(src: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Generate srcSet for responsive images
 * @param src The base image source
 * @param widths Array of widths to generate
 * @returns The srcSet string
 */
export function generateSrcSet(
  src: string,
  widths: number[] = [640, 768, 1024, 1280, 1536]
): string {
  // For Next.js image optimization, we'd typically use the _next/image endpoint
  // But since we're using public images, we'll return the original for now
  return widths.map(w => `${src} ${w}w`).join(', ');
}

/**
 * Get optimized sizes attribute based on layout
 * @param layout The layout type
 * @returns The sizes attribute string
 */
export function getOptimizedSizes(
  layout: 'full' | 'half' | 'third' | 'quarter' = 'full'
): string {
  switch (layout) {
    case 'full':
      return '100vw';
    case 'half':
      return '(max-width: 640px) 100vw, 50vw';
    case 'third':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'quarter':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw';
    default:
      return '100vw';
  }
}
