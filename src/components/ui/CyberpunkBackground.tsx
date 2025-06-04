'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CyberpunkBackgroundProps {
  variant?: 'grid' | 'circuit' | 'matrix' | 'particles' | 'waves';
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export const CyberpunkBackground: React.FC<CyberpunkBackgroundProps> = ({
  variant = 'grid',
  intensity = 'medium',
  animated = true,
  className,
  children,
  id,
}) => {
  const baseClasses = 'relative';
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (variant === 'particles' && isClient) {
      // Use a fixed seed for consistent server/client rendering
      let seed = 54321;
      const seededRandom = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      const styles: ParticleStyle[] = [];
      for (let i = 0; i < 20; i++) {
        styles.push({
          left: `${seededRandom() * 100}%`,
          top: `${seededRandom() * 100}%`,
          animationDelay: `${seededRandom() * 3}s`,
          animationDuration: `${2 + seededRandom() * 2}s`,
        });
      }
      setParticleStyles(styles);
    }
  }, [variant, isClient]);

  const intensityOpacity = {
    subtle: '0.05',
    medium: '0.1',
    strong: '0.15',
  };

  const renderBackground = () => {
    switch (variant) {
      case 'grid':
        return (
          <div 
            className={cn(
              'absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[length:50px_50px]',
              animated && 'animate-pulse',
              '[mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]'
            )}
            style={{ 
              backgroundImage: `linear-gradient(rgba(6,182,212,${intensityOpacity[intensity]}) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,${intensityOpacity[intensity]}) 1px, transparent 1px)`
            }}
          />
        );
      
      case 'circuit':
        return (
          <div className="absolute inset-0">
            {/* Horizontal lines */}
            <div 
              className={cn(
                'absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.1)_25%,rgba(6,182,212,0.1)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.1)_75%,rgba(6,182,212,0.1)_76%,transparent_77%)] bg-[length:100px_100px]',
                animated && 'animate-pulse'
              )}
              style={{
                backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(6,182,212,${intensityOpacity[intensity]}) 25%, rgba(6,182,212,${intensityOpacity[intensity]}) 26%, transparent 27%, transparent 74%, rgba(6,182,212,${intensityOpacity[intensity]}) 75%, rgba(6,182,212,${intensityOpacity[intensity]}) 76%, transparent 77%)`
              }}
            />
            {/* Vertical lines */}
            <div 
              className={cn(
                'absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(217,70,239,0.08)_25%,rgba(217,70,239,0.08)_26%,transparent_27%,transparent_74%,rgba(217,70,239,0.08)_75%,rgba(217,70,239,0.08)_76%,transparent_77%)] bg-[length:100px_100px]',
                animated && 'animate-pulse'
              )}
              style={{
                backgroundImage: `linear-gradient(90deg, transparent 24%, rgba(217,70,239,${intensityOpacity[intensity]}) 25%, rgba(217,70,239,${intensityOpacity[intensity]}) 26%, transparent 27%, transparent 74%, rgba(217,70,239,${intensityOpacity[intensity]}) 75%, rgba(217,70,239,${intensityOpacity[intensity]}) 76%, transparent 77%)`
              }}
            />
          </div>
        );
      
      case 'matrix':
        return (
          <div className="absolute inset-0">
            <div 
              className={cn(
                'absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(6,182,212,0.1)_0%,transparent_50%)] bg-[length:100px_100px]',
                animated && 'animate-pulse'
              )}
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(6,182,212,${intensityOpacity[intensity]}) 0%, transparent 50%)`
              }}
            />
            <div 
              className={cn(
                'absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(217,70,239,0.08)_0%,transparent_50%)] bg-[length:120px_120px]',
                animated && 'animate-pulse'
              )}
              style={{
                backgroundImage: `radial-gradient(circle at 75% 75%, rgba(217,70,239,${intensityOpacity[intensity]}) 0%, transparent 50%)`
              }}
            />
          </div>
        );
      
      case 'particles':
        if (!isClient) return null;
        return (
          <div className="absolute inset-0">
            {particleStyles.map((style, i) => (
              <div
                key={i}
                className={cn(
                  'absolute w-1 h-1 bg-cyan-400/30 rounded-full',
                  animated && 'animate-ping'
                )}
                style={style}
              />
            ))}
          </div>
        );
      
      case 'waves':
        return (
          <div className="absolute inset-0">
            <div 
              className={cn(
                'absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(6,182,212,0.1)_50%,transparent_70%)] bg-[length:200px_200px]',
                animated && 'animate-pulse'
              )}
              style={{
                backgroundImage: `linear-gradient(45deg, transparent 30%, rgba(6,182,212,${intensityOpacity[intensity]}) 50%, transparent 70%)`
              }}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div id={id} className={cn(baseClasses, className)}>
      {renderBackground()}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default CyberpunkBackground;