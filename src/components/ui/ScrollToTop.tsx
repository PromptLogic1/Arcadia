'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowUp } from 'lucide-react';
import { Button } from './button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const scrollToTopVariants = cva(
  // Base classes
  'fixed z-50 transition-all duration-300',
  {
    variants: {
      position: {
        'bottom-right': 'bottom-8 right-8',
        'bottom-left': 'bottom-8 left-8',
        'bottom-center': 'bottom-8 left-1/2 -translate-x-1/2',
        'top-right': 'top-8 right-8',
        'top-left': 'top-8 left-8',
      },
      size: {
        sm: 'h-10 w-10',
        default: 'h-12 w-12',
        lg: 'h-14 w-14',
        xl: 'h-16 w-16',
      },
      color: {
        default: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/50',
        primary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/50',
        secondary: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/50',
        accent: 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/50',
        dark: 'bg-gray-800 hover:bg-gray-700 text-white shadow-gray-800/50',
        glass: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20',
      },
      effect: {
        none: '',
        glow: 'shadow-lg',
        neon: 'shadow-2xl',
        pulse: 'animate-pulse',
      },
      animation: {
        fade: '',
        scale: '',
        slide: '',
        bounce: '',
      },
    },
    compoundVariants: [
      // Glow effects for different colors
      {
        effect: 'glow',
        color: 'default',
        class: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
      },
      {
        effect: 'glow',
        color: 'primary',
        class: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      },
      {
        effect: 'glow',
        color: 'secondary',
        class: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
      },
      {
        effect: 'glow',
        color: 'accent',
        class: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
      },
      
      // Neon effects
      {
        effect: 'neon',
        color: 'default',
        class: 'shadow-[0_0_30px_rgba(6,182,212,0.8)]',
      },
      {
        effect: 'neon',
        color: 'primary',
        class: 'shadow-[0_0_30px_rgba(59,130,246,0.8)]',
      },
      {
        effect: 'neon',
        color: 'secondary',
        class: 'shadow-[0_0_30px_rgba(168,85,247,0.8)]',
      },
      {
        effect: 'neon',
        color: 'accent',
        class: 'shadow-[0_0_30px_rgba(34,197,94,0.8)]',
      },
    ],
    defaultVariants: {
      position: 'bottom-right',
      size: 'default',
      color: 'default',
      effect: 'glow',
      animation: 'scale',
    },
  }
);

const getAnimationVariants = (animation: string) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.5 },
    },
    slide: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    bounce: {
      initial: { opacity: 0, scale: 0.3 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.3 },
    },
  };
  
  const defaultVariant = variants[animation as keyof typeof variants] || variants.scale;
  
  // Return variant with optional transition
  if (animation === 'bounce') {
    return {
      ...defaultVariant,
      transition: { type: 'spring', stiffness: 500, damping: 15 },
    };
  }
  
  return defaultVariant;
};

export interface ScrollToTopProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'size'>,
    VariantProps<typeof scrollToTopVariants> {
  /** Scroll threshold to show the button (in pixels) */
  threshold?: number;
  /** Smooth scroll behavior */
  smooth?: boolean;
  /** Custom scroll target (defaults to window) */
  scrollTarget?: React.RefObject<HTMLElement>;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Callback when button becomes visible */
  onVisibilityChange?: (visible: boolean) => void;
  /** Custom scroll function */
  onScroll?: () => void;
}

const ScrollToTop = React.forwardRef<HTMLButtonElement, ScrollToTopProps>(
  (
    {
      className,
      position,
      size,
      color,
      effect,
      animation,
      threshold = 500,
      smooth = true,
      scrollTarget,
      icon,
      onVisibilityChange,
      onScroll,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    const checkScrollPosition = useCallback(() => {
      const scrollElement = scrollTarget?.current || window;
      const scrollY = scrollTarget?.current 
        ? scrollTarget.current.scrollTop 
        : window.pageYOffset;
      
      const visible = scrollY > threshold;
      
      if (visible !== isVisible) {
        setIsVisible(visible);
        onVisibilityChange?.(visible);
      }
    }, [threshold, isVisible, scrollTarget, onVisibilityChange]);

    useEffect(() => {
      const scrollElement = scrollTarget?.current || window;
      
      scrollElement.addEventListener('scroll', checkScrollPosition, { passive: true });
      
      // Check initial position
      checkScrollPosition();
      
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollPosition);
      };
    }, [checkScrollPosition, scrollTarget]);

    const handleScrollToTop = useCallback(() => {
      if (onScroll) {
        onScroll();
        return;
      }

      const scrollElement = scrollTarget?.current || window;
      
      if (scrollTarget?.current) {
        scrollTarget.current.scrollTo({
          top: 0,
          behavior: smooth ? 'smooth' : 'auto',
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }, [smooth, scrollTarget, onScroll]);

    const animationVariants = getAnimationVariants(animation || 'scale');
    const customTransition = animation === 'bounce' 
      ? { type: 'spring', stiffness: 500, damping: 15 }
      : { duration: 0.2 };

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(scrollToTopVariants({ position }))}
            initial={animationVariants.initial}
            animate={animationVariants.animate}
            exit={animationVariants.exit}
            transition={customTransition}
          >
            <Button
              ref={ref}
              onClick={handleScrollToTop}
              size="icon"
              className={cn(
                'rounded-full shadow-lg',
                scrollToTopVariants({ size, color, effect }),
                className
              )}
              aria-label="Scroll to top"
              {...props}
            >
              {icon || <ArrowUp className={cn(
                'transition-transform duration-200 hover:scale-110',
                size === 'sm' && 'h-4 w-4',
                size === 'default' && 'h-5 w-5',
                size === 'lg' && 'h-6 w-6',
                size === 'xl' && 'h-7 w-7'
              )} />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

ScrollToTop.displayName = 'ScrollToTop';

export { ScrollToTop, scrollToTopVariants };
export default ScrollToTop;
