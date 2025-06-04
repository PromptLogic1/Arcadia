'use client';

import React, { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface ElementStyle {
  left: string;
  top: string;
  width?: string;
  height?: string;
  animationDelay: string;
  transform?: string; // For lines variant
}

interface FloatingElementsProps {
  variant?: 'particles' | 'circuits' | 'hexagons' | 'orbs' | 'lines';
  count?: number;
  speed?: 'slow' | 'medium' | 'fast';
  color?: 'cyan' | 'purple' | 'fuchsia' | 'emerald' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  repositioning?: boolean; // Use smooth repositioning animations
  className?: string;
}

export const FloatingElements: React.FC<FloatingElementsProps> = memo(({
  variant = 'particles',
  count = 15,
  speed = 'medium',
  color = 'cyan',
  size = 'md',
  repositioning = false,
  className,
}) => {
  const [elementStyles, setElementStyles] = useState<ElementStyle[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || count === 0) {
      setElementStyles([]);
      return;
    }

    // Use a fixed seed for consistent server/client rendering
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const styles: ElementStyle[] = [];
    const numElements = count;
    
    // Define edge zones and minimum distance between elements
    const edgeZonePercentage = 8;
    const minDistance = 18; // Further increased minimum distance for better spread
    
    // Store positions to check for overlaps
    const usedPositions: { x: number; y: number; size: number }[] = [];

    // Function to check if a position overlaps with existing elements
    const isPositionValid = (x: number, y: number, size = 3): boolean => {
      for (const pos of usedPositions) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        const minRequiredDistance = minDistance + (size + pos.size) * 0.5;
        if (distance < minRequiredDistance) {
          return false;
        }
      }
      return true;
    };

    // Function to find a valid position with collision detection
    const findValidPosition = (preferredX?: number, preferredY?: number, maxAttempts = 100): { x: number; y: number } => {
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        let x, y;
        
        if (preferredX !== undefined && preferredY !== undefined && attempts < 20) {
          // Try near preferred position first with increasing radius
          const offset = (attempts + 1) * 3;
          x = Math.max(8, Math.min(92, preferredX + (seededRandom() - 0.5) * offset));
          y = Math.max(8, Math.min(92, preferredY + (seededRandom() - 0.5) * offset));
        } else {
          // Generate random position with better distribution
          const zoneSelector = seededRandom();
          
          if (zoneSelector < 0.5) {
            // Center zones (25-75% of viewport) - increased probability
            x = 25 + seededRandom() * 50;
            y = 25 + seededRandom() * 50;
          } else if (zoneSelector < 0.75) {
            // Mid zones (10-90% with center bias)
            x = 10 + seededRandom() * 80;
            y = 15 + seededRandom() * 70;
          } else {
            // Edge zones
            const edgeChoice = seededRandom();
            if (edgeChoice < 0.25) { // Top
              x = 10 + seededRandom() * 80;
              y = seededRandom() * 20;
            } else if (edgeChoice < 0.5) { // Bottom
              x = 10 + seededRandom() * 80;
              y = 80 + seededRandom() * 20;
            } else if (edgeChoice < 0.75) { // Left
              x = seededRandom() * 20;
              y = 10 + seededRandom() * 80;
            } else { // Right
              x = 80 + seededRandom() * 20;
              y = 10 + seededRandom() * 80;
            }
          }
        }
        
        if (isPositionValid(x, y)) {
          return { x, y };
        }
        
        attempts++;
      }
      
      // Better fallback: distribute in a grid pattern if collision detection fails
      const gridSize = Math.ceil(Math.sqrt(numElements));
      const cellWidth = 80 / gridSize; // Leave margins
      const cellHeight = 80 / gridSize;
      const gridIndex = usedPositions.length % (gridSize * gridSize);
      const gridX = 10 + (gridIndex % gridSize) * cellWidth + seededRandom() * cellWidth * 0.5;
      const gridY = 10 + Math.floor(gridIndex / gridSize) * cellHeight + seededRandom() * cellHeight * 0.5;
      
      return { x: gridX, y: gridY };
    };

    const generateStyle = (x: number, y: number, index: number): ElementStyle => {
      const style: ElementStyle = {
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${(index * 0.5) % 5}s`,
      };
      
      let elementSize = 3; // Default size for collision detection
      
      if (variant === 'circuits' || variant === 'orbs') {
        const baseSize = variant === 'circuits' ? 10 : 8;
        const randomSize = variant === 'circuits' ? 20 : 12;
        const sizeVariation = seededRandom() * randomSize;
        const finalSize = baseSize + sizeVariation;
        style.width = `${finalSize}px`;
        style.height = style.width;
        elementSize = finalSize / 10; // Convert to percentage-like value for collision
      }
      if (variant === 'lines') {
        const width = 20 + seededRandom() * 40;
        style.width = `${width}px`;
        style.height = '1px';
        style.transform = `rotate(${seededRandom() * 360}deg)`;
        elementSize = width / 20; // Lines are thinner but longer
      }
      
      // Store position for collision detection
      usedPositions.push({ x, y, size: elementSize });
      
      return style;
    };

    // Initialize counters
    let distributedCount = 0;
    const elementsPerDirectEdge = Math.floor(numElements * 0.1); // Reduced to 10% per edge to allow more center elements

    // Top Edge
    for (let i = 0; i < elementsPerDirectEdge && distributedCount < numElements; i++) {
      const preferredX = seededRandom() * 100;
      const preferredY = seededRandom() * edgeZonePercentage;
      const { x, y } = findValidPosition(preferredX, preferredY);
      styles.push(generateStyle(x, y, distributedCount));
      distributedCount++;
    }

    // Bottom Edge
    for (let i = 0; i < elementsPerDirectEdge && distributedCount < numElements; i++) {
      const preferredX = seededRandom() * 100;
      const preferredY = (100 - edgeZonePercentage) + (seededRandom() * edgeZonePercentage);
      const { x, y } = findValidPosition(preferredX, preferredY);
      styles.push(generateStyle(x, y, distributedCount));
      distributedCount++;
    }

    // Left Edge
    for (let i = 0; i < elementsPerDirectEdge && distributedCount < numElements; i++) {
      const preferredX = seededRandom() * edgeZonePercentage;
      const preferredY = seededRandom() * 100;
      const { x, y } = findValidPosition(preferredX, preferredY);
      styles.push(generateStyle(x, y, distributedCount));
      distributedCount++;
    }

    // Right Edge
    for (let i = 0; i < elementsPerDirectEdge && distributedCount < numElements; i++) {
      const preferredX = (100 - edgeZonePercentage) + (seededRandom() * edgeZonePercentage);
      const preferredY = seededRandom() * 100;
      const { x, y } = findValidPosition(preferredX, preferredY);
      styles.push(generateStyle(x, y, distributedCount));
      distributedCount++;
    }
    
    // Distribute remaining elements using collision detection
    while (distributedCount < numElements) {
      const { x, y } = findValidPosition(); // Let it choose position automatically
      styles.push(generateStyle(x, y, distributedCount));
      distributedCount++;
    }

    setElementStyles(styles);
  }, [count, variant, isClient, size]);

  const speedClasses = repositioning ? {
    slow: 'animate-float-repositioning-slow',
    medium: 'animate-float-repositioning-medium',
    fast: 'animate-float-repositioning-fast',
  } : {
    slow: 'animate-float-smooth-slow',
    medium: 'animate-float-smooth',
    fast: 'animate-float-smooth-fast',
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

  const renderElement = (style: ElementStyle | undefined, index: number) => {
    if (!style) {
      return null; 
    }

    switch (variant) {
      case 'particles':
        return (
          <div
            key={index}
            className={cn(
              'absolute rounded-full blur-sm',
              speedClasses[speed],
              colorClasses[color],
              sizeClasses[size] // size prop is used here
            )}
            style={style}
          />
        );

      case 'circuits':
        return (
          <div
            key={index}
            className={cn(
              'absolute border border-current opacity-10',
              speedClasses[speed],
              `text-${color.replace('/', '-')}-400`
            )}
            style={style}
          />
        );

      case 'hexagons':
        return (
          <div
            key={index}
            className={cn(
              'absolute opacity-10',
              speedClasses[speed],
              `text-${color.replace('/', '-')}-400`
            )}
            style={style}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="13,2 21,7 21,17 13,22 5,17 5,7" strokeWidth="1" />
            </svg>
          </div>
        );

      case 'orbs':
        return (
          <div
            key={index}
            className={cn(
              'absolute rounded-full',
              speedClasses[speed],
              colorClasses[color],
              'shadow-lg blur-[1px]'
            )}
            style={style}
          />
        );

      case 'lines':
        return (
          <div
            key={index}
            className={cn(
              'absolute opacity-10',
              speedClasses[speed],
              `bg-${color.replace('/', '-')}-400`
            )}
            style={style}
          />
        );

      default:
        return null;
    }
  };

  if (!isClient) {
    return null; 
  }

  return (
    <div className={cn('absolute pointer-events-none overflow-hidden z-0', className)} style={{ 
      left: '50%', 
      top: '0',
      width: '100vw', 
      height: '100%',
      transform: 'translateX(-50%)'
    }}>
      {Array.from({ length: count }, (_, i) => renderElement(elementStyles[i], i))}
    </div>
  );
});

FloatingElements.displayName = 'FloatingElements';

export default FloatingElements;