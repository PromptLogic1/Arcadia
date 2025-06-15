/**
 * Modern image format detection and support utilities
 */

// Check if browser supports WebP
export function supportsWebP(): Promise<boolean> {
  return new Promise(resolve => {
    const webp = new Image();
    webp.onload = webp.onerror = () => resolve(webp.height === 2);
    webp.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

// Check if browser supports AVIF
export function supportsAVIF(): Promise<boolean> {
  return new Promise(resolve => {
    const avif = new Image();
    avif.onload = avif.onerror = () => resolve(avif.height === 2);
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

// Get the best supported format for an image URL
export async function getBestImageFormat(originalUrl: string): Promise<string> {
  // Don't modify data URLs or external URLs
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('http')) {
    return originalUrl;
  }

  const [supportsAVIFFormat, supportsWebPFormat] = await Promise.all([
    supportsAVIF(),
    supportsWebP(),
  ]);

  // Parse the original URL
  const url = new URL(originalUrl, window.location.origin);
  const pathParts = url.pathname.split('.');
  const extension = pathParts.pop()?.toLowerCase();
  const basePath = pathParts.join('.');

  // Only optimize common image formats
  if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return originalUrl;
  }

  // Return best supported format in order of preference
  if (supportsAVIFFormat) {
    return `${basePath}.avif${url.search}`;
  }

  if (supportsWebPFormat && extension !== 'webp') {
    return `${basePath}.webp${url.search}`;
  }

  return originalUrl;
}

// Generate srcSet for responsive images with modern formats
export async function generateSrcSet(
  basePath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
): Promise<string> {
  const [supportsAVIFFormat, supportsWebPFormat] = await Promise.all([
    supportsAVIF(),
    supportsWebP(),
  ]);

  let extension = 'jpg';
  if (supportsAVIFFormat) {
    extension = 'avif';
  } else if (supportsWebPFormat) {
    extension = 'webp';
  }

  return sizes
    .map(size => `${basePath}-${size}w.${extension} ${size}w`)
    .join(', ');
}

// Preload critical images with modern format support
export async function preloadImage(
  src: string,
  priority: 'high' | 'low' = 'low'
): Promise<void> {
  const optimizedSrc = await getBestImageFormat(src);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedSrc;
  link.fetchPriority = priority;

  document.head.appendChild(link);
}

// Create a Picture element with multiple format sources
export function createPictureElement(
  src: string,
  alt: string,
  options: {
    avifSrc?: string;
    webpSrc?: string;
    className?: string;
    sizes?: string;
  } = {}
): HTMLPictureElement {
  const picture = document.createElement('picture');

  // Add AVIF source if provided
  if (options.avifSrc) {
    const avifSource = document.createElement('source');
    avifSource.srcset = options.avifSrc;
    avifSource.type = 'image/avif';
    if (options.sizes) avifSource.sizes = options.sizes;
    picture.appendChild(avifSource);
  }

  // Add WebP source if provided
  if (options.webpSrc) {
    const webpSource = document.createElement('source');
    webpSource.srcset = options.webpSrc;
    webpSource.type = 'image/webp';
    if (options.sizes) webpSource.sizes = options.sizes;
    picture.appendChild(webpSource);
  }

  // Add fallback img element
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  if (options.className) img.className = options.className;
  picture.appendChild(img);

  return picture;
}
