import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sectionDividerVariants = cva('relative w-full overflow-hidden', {
  variants: {
    height: {
      sm: 'h-12',
      default: 'h-24',
      lg: 'h-32',
      xl: 'h-48',
    },
    gradient: {
      cyan: 'bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent',
      primary:
        'bg-gradient-to-b from-transparent via-primary/10 to-transparent',
      secondary:
        'bg-gradient-to-b from-transparent via-secondary/10 to-transparent',
      accent: 'bg-gradient-to-b from-transparent via-accent/10 to-transparent',
      fuchsia:
        'bg-gradient-to-b from-transparent via-fuchsia-500/10 to-transparent',
      rainbow:
        'bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-fuchsia-500/5 before:to-transparent',
    },
    orientation: {
      horizontal: '',
      vertical: 'rotate-90',
    },
  },
  defaultVariants: {
    height: 'default',
    gradient: 'cyan',
    orientation: 'horizontal',
  },
});

export interface SectionDividerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof sectionDividerVariants> {
  'aria-hidden'?: boolean;
}

const SectionDivider = React.forwardRef<HTMLDivElement, SectionDividerProps>(
  (
    {
      className,
      height,
      gradient,
      orientation,
      'aria-hidden': ariaHidden = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          sectionDividerVariants({ height, gradient, orientation }),
          className
        )}
        role="separator"
        aria-hidden={ariaHidden}
        {...props}
      >
        <div className="absolute inset-0" />
        {gradient === 'rainbow' && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-500/5 to-transparent" />
        )}
      </div>
    );
  }
);

SectionDivider.displayName = 'SectionDivider';

export { SectionDivider };
