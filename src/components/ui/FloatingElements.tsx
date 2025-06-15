'use client';

import React, { useMemo, memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FloatingElementsProps {
  variant?: 'particles' | 'circuits' | 'hexagons' | 'orbs' | 'lines';
  count?: number;
  speed?: 'slow' | 'medium' | 'fast';
  color?: 'cyan' | 'purple' | 'fuchsia' | 'emerald' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Hook to detect if we should disable animations for performance
const usePerformanceMode = () => {
  const [shouldDisable, setShouldDisable] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Check for mobile device (basic heuristic)
    const isMobile = window.innerWidth < 768;

    // Check for low-end device indicators
    const isLowEnd = Boolean(
      navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
    );

    setShouldDisable(prefersReducedMotion || (isMobile && isLowEnd));
  }, []);

  return shouldDisable;
};

export const FloatingElements: React.FC<FloatingElementsProps> = memo(
  ({
    variant = 'particles',
    count = 5,
    speed = 'medium',
    color = 'cyan',
    size = 'md',
    className,
  }) => {
    // Performance optimization: disable on low-end devices
    const shouldDisableAnimations = usePerformanceMode();

    // Reduce count on mobile for better performance
    const effectiveCount = count;
    // Generate positions deterministically based on index
    const elements = useMemo(() => {
      const items = [];
      const goldenRatio = 1.618033988749895;
      const angleIncrement = 360 / goldenRatio;

      for (let i = 0; i < effectiveCount; i++) {
        // Use golden ratio spiral for better distribution
        const angle = (i * angleIncrement) % 360;
        const radius = 30 + (i / effectiveCount) * 40; // 30-70% from center
        const radian = (angle * Math.PI) / 180;

        // Position elements in a spiral pattern
        const x = 50 + radius * Math.cos(radian) * 0.8;
        const y = 50 + radius * Math.sin(radian) * 0.8;

        // Animation delay based on position
        const delay = (i * 0.2) % 3;

        items.push({
          x: Math.max(10, Math.min(90, x)),
          y: Math.max(10, Math.min(90, y)),
          delay,
          size: variant === 'orbs' ? 8 + (i % 3) * 4 : undefined,
          rotation: variant === 'lines' ? (i * 45) % 180 : undefined,
        });
      }
      return items;
    }, [effectiveCount, variant]);

    // Early return for performance-critical scenarios
    if (shouldDisableAnimations) {
      return null;
    }

    const speedClasses = {
      slow: 'animate-subtle-float',
      medium: 'animate-gentle-glow',
      fast: 'animate-soft-pulse',
    };

    const colorClasses = {
      cyan: 'bg-cyan-400/15 shadow-cyan-400/25',
      purple: 'bg-purple-400/15 shadow-purple-400/25',
      fuchsia: 'bg-fuchsia-400/15 shadow-fuchsia-400/25',
      emerald: 'bg-emerald-400/15 shadow-emerald-400/25',
      yellow: 'bg-yellow-400/15 shadow-yellow-400/25',
    };

    const sizeClasses = {
      sm: 'w-1 h-1',
      md: 'w-2 h-2',
      lg: 'w-3 h-3',
    };

    const renderElement = (
      element: {
        x: number;
        y: number;
        delay: number;
        size?: number;
        rotation?: number;
      },
      index: number
    ) => {
      const baseStyle = {
        left: `${element.x}%`,
        top: `${element.y}%`,
        animationDelay: `${element.delay}s`,
      };

      switch (variant) {
        case 'particles':
          return (
            <div
              key={index}
              className={cn(
                'absolute transform-gpu rounded-full blur-sm will-change-transform',
                speedClasses[speed],
                'motion-reduce:animate-none',
                colorClasses[color],
                sizeClasses[size],
                // Hide extra particles on mobile
                index >= 3 && 'hidden md:block'
              )}
              style={baseStyle}
            />
          );

        case 'circuits':
          return (
            <div
              key={index}
              className={cn(
                'absolute transform-gpu border border-current opacity-10 will-change-transform',
                speedClasses[speed],
                'motion-reduce:animate-none',
                color === 'cyan' && 'text-cyan-400',
                color === 'purple' && 'text-purple-400',
                color === 'fuchsia' && 'text-fuchsia-400',
                color === 'emerald' && 'text-emerald-400',
                color === 'yellow' && 'text-yellow-400',
                // Hide extra elements on mobile
                index >= 3 && 'hidden md:block'
              )}
              style={{
                ...baseStyle,
                width: element.size ? `${element.size}px` : '20px',
                height: element.size ? `${element.size}px` : '20px',
              }}
            />
          );

        case 'hexagons':
          return (
            <div
              key={index}
              className={cn(
                'absolute transform-gpu opacity-10 will-change-transform',
                speedClasses[speed],
                'motion-reduce:animate-none',
                color === 'cyan' && 'text-cyan-400',
                color === 'purple' && 'text-purple-400',
                color === 'fuchsia' && 'text-fuchsia-400',
                color === 'emerald' && 'text-emerald-400',
                color === 'yellow' && 'text-yellow-400',
                // Hide extra elements on mobile
                index >= 3 && 'hidden md:block'
              )}
              style={baseStyle}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="transform-gpu"
              >
                <polygon
                  points="13,2 21,7 21,17 13,22 5,17 5,7"
                  strokeWidth="1"
                />
              </svg>
            </div>
          );

        case 'orbs':
          return (
            <div
              key={index}
              className={cn(
                'absolute transform-gpu rounded-full will-change-transform',
                speedClasses[speed],
                'motion-reduce:animate-none',
                colorClasses[color],
                'shadow-lg blur-[1px]',
                // Hide extra elements on mobile
                index >= 3 && 'hidden md:block'
              )}
              style={{
                ...baseStyle,
                width: element.size ? `${element.size}px` : '10px',
                height: element.size ? `${element.size}px` : '10px',
              }}
            />
          );

        case 'lines':
          return (
            <div
              key={index}
              className={cn(
                'absolute transform-gpu opacity-10 will-change-transform',
                speedClasses[speed],
                'motion-reduce:animate-none',
                color === 'cyan' && 'bg-cyan-400',
                color === 'purple' && 'bg-purple-400',
                color === 'fuchsia' && 'bg-fuchsia-400',
                color === 'emerald' && 'bg-emerald-400',
                color === 'yellow' && 'bg-yellow-400',
                // Hide extra elements on mobile
                index >= 3 && 'hidden md:block'
              )}
              style={{
                ...baseStyle,
                width: '40px',
                height: '1px',
                transform: element.rotation
                  ? `rotate(${element.rotation}deg)`
                  : undefined,
              }}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div
        className={cn(
          'floating-elements pointer-events-none absolute inset-0 overflow-hidden contain-layout',
          className
        )}
      >
        {elements.map((element, index) => renderElement(element, index))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.variant === nextProps.variant &&
      prevProps.count === nextProps.count &&
      prevProps.speed === nextProps.speed &&
      prevProps.color === nextProps.color &&
      prevProps.size === nextProps.size &&
      prevProps.className === nextProps.className
    );
  }
);

FloatingElements.displayName = 'FloatingElements';

export default FloatingElements;
