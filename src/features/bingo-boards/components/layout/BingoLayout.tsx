import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface BingoLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  animate?: boolean;
  delay?: number;
  direction?: 'left' | 'right';
  fullHeight?: boolean;
  variant?: 'default' | 'compact';
}

export const BingoLayout: React.FC<BingoLayoutProps> = ({
  children,
  title,
  description,
  className,
  contentClassName,
  animate = true,
  delay = 0,
  direction = 'left',
  fullHeight = false,
  variant = 'default',
}) => {
  return (
    <div
      className={cn(
        'w-full',
        fullHeight && 'h-full',
        animate &&
          cn(
            'animate-fade-in-slide',
            direction === 'left'
              ? '[--slide-from:-50px]'
              : '[--slide-from:50px]',
            // Use CSS custom property for animation delay
            `[--animation-delay:${delay}s]`
          )
      )}
    >
      <Card
        className={cn(
          'bg-gray-800/95 backdrop-blur-sm',
          'border-2 border-cyan-500/30 transition-colors hover:border-cyan-500/50',
          'flex flex-col shadow-lg shadow-cyan-500/10',
          fullHeight && 'h-full',
          className
        )}
      >
        {(title || description) && (
          <CardHeader
            className={cn(
              'flex-shrink-0',
              variant === 'compact' ? 'p-2 sm:p-3' : 'p-3 sm:p-4',
              'border-b border-cyan-500/20'
            )}
          >
            {title && (
              <CardTitle
                className={cn(
                  'bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text font-bold text-transparent',
                  variant === 'compact'
                    ? 'text-base sm:text-lg'
                    : 'text-lg sm:text-2xl'
                )}
              >
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-xs text-cyan-300/80 sm:text-sm">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent
          className={cn(
            'min-h-0 flex-1',
            variant === 'compact' ? 'p-2 sm:p-3' : 'p-3 sm:p-4',
            contentClassName
          )}
        >
          {children}
        </CardContent>
      </Card>
    </div>
  );
};

export const BingoSection: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
  collapsible?: boolean;
}> = ({
  title,
  icon,
  children,
  className,
  variant = 'default',
  collapsible = false,
}) => (
  <section
    className={cn(
      'flex min-h-0 flex-col rounded-lg',
      'border border-cyan-500/20 bg-gray-800/50',
      'transition-all duration-200 hover:border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/5',
      variant === 'compact' ? 'p-2 sm:p-3' : 'p-3 sm:p-4 lg:p-6',
      className
    )}
  >
    {title && (
      <h3
        className={cn(
          'flex items-center justify-between font-semibold text-cyan-400',
          variant === 'compact'
            ? 'mb-2 text-sm sm:text-base'
            : 'mb-3 text-base sm:text-lg',
          'leading-relaxed tracking-wide'
        )}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cn(
                'rounded-md bg-cyan-500/10',
                'transition-colors duration-200',
                variant === 'compact' ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2',
                variant === 'compact'
                  ? 'text-xs sm:text-sm'
                  : 'text-sm sm:text-base'
              )}
            >
              {icon}
            </span>
          )}
          <span className="truncate">{title}</span>
        </div>
      </h3>
    )}
    <div
      className={cn(
        'min-h-0 flex-1',
        collapsible
          ? 'overflow-hidden transition-all duration-300'
          : 'overflow-auto',
        'scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent'
      )}
    >
      {children}
    </div>
  </section>
);

export const BingoGrid: React.FC<{
  children: React.ReactNode;
  size: number;
  className?: string;
}> = ({ children, size, className }) => (
  <div
    className={cn(
      'grid rounded-lg bg-gray-800/80',
      'border border-cyan-500/20 shadow-inner',
      'p-1 sm:p-2 md:p-3',
      'aspect-square w-full',
      'overflow-hidden',
      // Use CSS custom properties for grid configuration
      `[--grid-size:${size}]`,
      '[grid-template-columns:repeat(var(--grid-size),minmax(0,1fr))]',
      '[gap:clamp(0.25rem,1vw,0.5rem)]',
      className
    )}
  >
    {children}
  </div>
);

export const BingoContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'h-full min-h-0 w-full',
      'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
      'p-2 sm:p-4 lg:p-6',
      'overflow-x-hidden',
      className
    )}
  >
    <div
      className={cn(
        'mx-auto h-full',
        'max-w-[100%] sm:max-w-[640px] md:max-w-[768px]',
        'lg:max-w-[1024px] xl:max-w-[1280px] 2xl:max-w-[1536px]',
        'px-2 sm:px-4 lg:px-6',
        'flex flex-col'
      )}
    >
      {children}
    </div>
  </div>
);
