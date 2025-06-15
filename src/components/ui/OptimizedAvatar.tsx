import * as React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar';
import { cn } from '@/lib/utils';

export interface OptimizedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  priority?: boolean;
  onError?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
  xxl: 'h-20 w-20 text-2xl',
} as const;

/**
 * Optimized Avatar component with lazy loading, error handling, and performance optimizations
 */
export const OptimizedAvatar = React.memo<OptimizedAvatarProps>(
  ({
    src,
    alt = 'Avatar',
    fallback,
    className,
    size = 'md',
    priority = false,
    onError,
    children,
    style,
  }) => {
    const [imageError, setImageError] = React.useState(false);
    const [isInView, setIsInView] = React.useState(priority);
    const avatarRef = React.useRef<HTMLSpanElement>(null);

    // Intersection Observer for lazy loading (if not priority)
    React.useEffect(() => {
      if (priority || !avatarRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '50px' }
      );

      observer.observe(avatarRef.current);
      return () => observer.disconnect();
    }, [priority]);

    const handleImageError = React.useCallback(() => {
      setImageError(true);
      onError?.();
    }, [onError]);

    // Generate fallback text from alt or use provided fallback
    const fallbackText = React.useMemo(() => {
      if (fallback) return fallback;
      if (!alt) return '?';

      // Extract initials from name
      const words = alt.split(' ').filter(Boolean);
      if (words.length >= 2) {
        const first = words[0]?.[0] || '';
        const second = words[1]?.[0] || '';
        return `${first}${second}`.toUpperCase();
      }
      return words[0]?.[0]?.toUpperCase() || '?';
    }, [alt, fallback]);

    const shouldShowImage = src && !imageError && isInView;

    // If children are provided, render them inside Avatar (for compatibility)
    if (children) {
      return (
        <Avatar
          ref={avatarRef}
          className={cn(sizeClasses[size], className)}
          style={style}
        >
          {children}
        </Avatar>
      );
    }

    return (
      <Avatar
        ref={avatarRef}
        className={cn(sizeClasses[size], className)}
        style={style}
      >
        {shouldShowImage && (
          <AvatarImage
            src={src}
            alt={alt}
            onError={handleImageError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        )}
        <AvatarFallback>{fallbackText}</AvatarFallback>
      </Avatar>
    );
  }
);

OptimizedAvatar.displayName = 'OptimizedAvatar';

// Export individual components for compatibility with existing usage
export const OptimizedAvatarImage = AvatarImage;
export const OptimizedAvatarFallback = AvatarFallback;

export default OptimizedAvatar;
