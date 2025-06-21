'use client';

import React, { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';

interface CyberpunkBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'grid' | 'circuit' | 'particles';
  intensity?: 'subtle' | 'medium';
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

// Generate particles once with a fixed seed for consistency
const generateParticles = (count = 5): ParticleStyle[] => {
  let seed = 54321;
  const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const styles: ParticleStyle[] = [];
  for (let i = 0; i < count; i++) {
    styles.push({
      left: `${seededRandom() * 100}%`,
      top: `${seededRandom() * 100}%`,
      animationDelay: `${seededRandom() * 3}s`,
      animationDuration: `${3 + seededRandom() * 2}s`,
    });
  }
  return styles;
};

// Pre-generate particles to avoid recalculation
const PARTICLE_STYLES = generateParticles(5);

// Intensity opacity map for better performance
const INTENSITY_OPACITY = {
  subtle: '0.05',
  medium: '0.1',
} as const;

export const CyberpunkBackground: React.FC<CyberpunkBackgroundProps> = memo(
  ({
    variant = 'grid',
    intensity = 'subtle',
    animated = true,
    className,
    children,
    ...props
  }) => {
    const opacity = INTENSITY_OPACITY[intensity];

    // Always render the same content on server and initial client render
    // Use CSS media queries for responsive behavior instead of JS detection
    const shouldAnimate = animated;

    // Memoize dynamic styles
    const gridStyle = useMemo(
      () => ({
        backgroundImage: `linear-gradient(rgba(6,182,212,${opacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,${opacity}) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }),
      [opacity]
    );

    const circuitStyle = useMemo(
      () => ({
        backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(6,182,212,${opacity}) 25%, rgba(6,182,212,${opacity}) 26%, transparent 27%, transparent 74%, rgba(6,182,212,${opacity}) 75%, rgba(6,182,212,${opacity}) 76%, transparent 77%)`,
        backgroundSize: '100px 100px',
      }),
      [opacity]
    );

    const backgroundElement = useMemo(() => {
      switch (variant) {
        case 'grid':
          return (
            <div
              className={cn(
                'absolute inset-0 will-change-transform',
                shouldAnimate && 'animate-pulse motion-reduce:animate-none',
                '[mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]'
              )}
              style={gridStyle}
            />
          );

        case 'circuit':
          return (
            <div className="absolute inset-0 will-change-transform">
              <div
                className={cn(
                  'absolute inset-0',
                  shouldAnimate && 'animate-pulse motion-reduce:animate-none'
                )}
                style={circuitStyle}
              />
            </div>
          );

        case 'particles':
          return (
            <div className="absolute inset-0 overflow-hidden will-change-transform">
              {PARTICLE_STYLES.map((style, i) => (
                <div
                  key={i}
                  className={cn(
                    'absolute h-1 w-1 rounded-full bg-cyan-400/20',
                    shouldAnimate && 'animate-float motion-reduce:animate-none',
                    // Hide extra particles on mobile using CSS
                    i >= 3 && 'hidden md:block'
                  )}
                  style={{
                    ...style,
                    transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
                  }}
                />
              ))}
            </div>
          );

        default:
          return null;
      }
    }, [variant, shouldAnimate, gridStyle, circuitStyle]);

    return (
      <div 
        {...props}
        data-variant={variant}
        data-intensity={intensity}
        className={cn('relative', className)}
      >
        {backgroundElement}
        {children && <div className="relative z-10">{children}</div>}
      </div>
    );
  }
);

CyberpunkBackground.displayName = 'CyberpunkBackground';

export default CyberpunkBackground;
