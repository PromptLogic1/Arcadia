'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from '@/components/ui/Icons';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  showBelow?: number;
}

export function ScrollToTop({
  className,
  position = 'bottom-right',
  showBelow = 400,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrollTop > showBelow);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showBelow]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  const positionClasses = {
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8',
    'bottom-center': 'bottom-8 left-1/2 -translate-x-1/2',
  };

  return (
    <Button
      onClick={scrollToTop}
      variant="primary"
      size="icon"
      className={cn(
        'fixed z-50 rounded-full shadow-lg transition-all duration-300 will-change-[opacity,transform]',
        positionClasses[position],
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-16 opacity-0',
        'hover:shadow-xl hover:shadow-cyan-500/25',
        className
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}

export default ScrollToTop;
