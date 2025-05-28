import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-b-2',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        default: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
      color: {
        default: 'border-white',
        primary: 'border-primary',
        secondary: 'border-secondary',
        accent: 'border-accent',
        muted: 'border-muted-foreground',
      },
    },
    defaultVariants: {
      size: 'default',
      color: 'default',
    },
  }
);

const containerVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      fullSize: {
        true: 'h-full w-full',
        false: '',
      },
    },
    defaultVariants: {
      fullSize: true,
    },
  }
);

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof spinnerVariants>,
    VariantProps<typeof containerVariants> {
  'aria-label'?: string;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    { 
      className, 
      size, 
      color, 
      fullSize, 
      'aria-label': ariaLabel = 'Loading...', 
      ...props 
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(containerVariants({ fullSize }), className)}
        role="status"
        aria-label={ariaLabel}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, color }))} />
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
