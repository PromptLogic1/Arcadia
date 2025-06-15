'use client';

import NextImage from 'next/image';
import type { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLazyLoad } from '@/hooks/useIntersectionObserver';

interface OptimizedImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  enableIntersectionObserver?: boolean;
  responsiveSizes?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    wide?: string;
  };
}

// Base64 encoded 1x1 pixel transparent image for blur placeholder
const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

// Aspect ratio classes
const ASPECT_RATIOS = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]',
} as const;

// Default responsive sizes for common layouts
const DEFAULT_SIZES = {
  // Full width on mobile, half on tablet, third on desktop, quarter on wide
  default:
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw',
  // Full width responsive
  full: '100vw',
  // Hero images: full width on all devices
  hero: '100vw',
  // Card images: full on mobile, half on tablet, third on desktop
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  // Thumbnail: fixed sizes
  thumbnail: '(max-width: 640px) 100px, 200px',
  // Gallery: full on mobile, half on tablet, quarter on desktop
  gallery: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
};

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.svg',
  width,
  height,
  className,
  aspectRatio,
  objectFit = 'cover',
  priority = false,
  loading,
  enableIntersectionObserver = false,
  responsiveSizes,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  // Use intersection observer for enhanced lazy loading
  const { targetRef, hasIntersected } = useLazyLoad<HTMLDivElement>({
    enabled: enableIntersectionObserver && !priority,
    rootMargin: '100px', // Start loading 100px before entering viewport
  });

  // Determine loading strategy
  const loadingStrategy = loading || (priority ? 'eager' : 'lazy');

  // Only load image if priority, or if intersection observer is disabled, or if element has intersected
  const shouldLoadImage =
    priority || !enableIntersectionObserver || hasIntersected;

  // Generate responsive sizes string
  const generateSizes = () => {
    if (props.sizes) return props.sizes;

    if (responsiveSizes) {
      const sizes: string[] = [];
      if (responsiveSizes.mobile)
        sizes.push(`(max-width: 640px) ${responsiveSizes.mobile}`);
      if (responsiveSizes.tablet)
        sizes.push(`(max-width: 1024px) ${responsiveSizes.tablet}`);
      if (responsiveSizes.desktop)
        sizes.push(`(max-width: 1536px) ${responsiveSizes.desktop}`);
      if (responsiveSizes.wide) sizes.push(responsiveSizes.wide);
      return sizes.join(', ');
    }

    return DEFAULT_SIZES.default;
  };

  return (
    <div
      ref={enableIntersectionObserver ? targetRef : null}
      className={cn(
        'relative overflow-hidden',
        aspectRatio && ASPECT_RATIOS[aspectRatio],
        className
      )}
    >
      {/* Placeholder while image hasn't loaded */}
      {(!shouldLoadImage || isLoading) && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800',
            'flex animate-pulse items-center justify-center'
          )}
        >
          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      )}

      {/* Actual image */}
      {shouldLoadImage && (
        <NextImage
          {...props}
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'duration-700 ease-in-out',
            isLoading ? 'scale-110 blur-sm' : 'blur-0 scale-100',
            aspectRatio && 'absolute inset-0 h-full w-full',
            // Object fit classes
            objectFit === 'contain' && 'object-contain',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down',
            className
          )}
          onError={() => setImgSrc(fallbackSrc)}
          onLoad={() => setIsLoading(false)}
          placeholder="blur"
          blurDataURL={props.blurDataURL || BLUR_DATA_URL}
          sizes={generateSizes()}
          quality={props.quality || 75}
          priority={priority}
          loading={loadingStrategy}
        />
      )}
    </div>
  );
}

// Re-export NextImage for cases where OptimizedImage is not needed
export { NextImage as Image };
