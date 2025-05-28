import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const arcadeDecorationVariants = cva(
  // Base classes
  'relative rounded-lg transition-all duration-300',
  {
    variants: {
      variant: {
        border: 'border-4 border-dashed p-4',
        background: 'bg-gradient-to-br overflow-hidden p-6',
        corner: 'p-4',
        glow: 'border-2 p-4',
        neon: 'border-2 p-4',
        frame: 'border-4 border-solid p-4',
        outline: 'border border-dashed p-3',
      },
      color: {
        primary: '',
        secondary: '',
        accent: '',
        cyber: '',
        retro: '',
        electric: '',
      },
      size: {
        sm: 'p-2',
        default: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      intensity: {
        subtle: 'opacity-75',
        default: '',
        strong: 'brightness-110',
        ultra: 'brightness-125',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse',
        glow: 'animate-pulse',
        flicker: 'animate-pulse',
      },
    },
    compoundVariants: [
      // Primary color variants
      {
        variant: 'border',
        color: 'primary',
        class: 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      },
      {
        variant: 'background',
        color: 'primary',
        class: 'from-cyan-900/20 to-purple-900/20',
      },
      {
        variant: 'corner',
        color: 'primary',
        class: 'before:border-cyan-400 after:border-cyan-400',
      },
      {
        variant: 'glow',
        color: 'primary',
        class: 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] bg-cyan-400/5',
      },
      {
        variant: 'neon',
        color: 'primary',
        class: 'border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.8)] bg-cyan-400/10',
      },
      
      // Secondary color variants
      {
        variant: 'border',
        color: 'secondary',
        class: 'border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      },
      {
        variant: 'background',
        color: 'secondary',
        class: 'from-pink-900/20 to-yellow-900/20',
      },
      {
        variant: 'corner',
        color: 'secondary',
        class: 'before:border-pink-400 after:border-pink-400',
      },
      {
        variant: 'glow',
        color: 'secondary',
        class: 'border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.5)] bg-pink-400/5',
      },
      {
        variant: 'neon',
        color: 'secondary',
        class: 'border-pink-400 shadow-[0_0_40px_rgba(236,72,153,0.8)] bg-pink-400/10',
      },
      
      // Accent color variants
      {
        variant: 'border',
        color: 'accent',
        class: 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]',
      },
      {
        variant: 'background',
        color: 'accent',
        class: 'from-yellow-900/20 to-green-900/20',
      },
      {
        variant: 'corner',
        color: 'accent',
        class: 'before:border-yellow-400 after:border-yellow-400',
      },
      {
        variant: 'glow',
        color: 'accent',
        class: 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] bg-yellow-400/5',
      },
      {
        variant: 'neon',
        color: 'accent',
        class: 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.8)] bg-yellow-400/10',
      },
      
      // Cyber color variants
      {
        variant: 'border',
        color: 'cyber',
        class: 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]',
      },
      {
        variant: 'background',
        color: 'cyber',
        class: 'from-green-900/20 to-teal-900/20',
      },
      {
        variant: 'glow',
        color: 'cyber',
        class: 'border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.5)] bg-green-400/5',
      },
      
      // Retro color variants
      {
        variant: 'border',
        color: 'retro',
        class: 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      },
      {
        variant: 'background',
        color: 'retro',
        class: 'from-purple-900/20 to-indigo-900/20',
      },
      {
        variant: 'glow',
        color: 'retro',
        class: 'border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.5)] bg-purple-400/5',
      },
      
      // Electric color variants
      {
        variant: 'border',
        color: 'electric',
        class: 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      },
      {
        variant: 'background',
        color: 'electric',
        class: 'from-blue-900/20 to-cyan-900/20',
      },
      {
        variant: 'glow',
        color: 'electric',
        class: 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)] bg-blue-400/5',
      },
      
      // Size adjustments for padding
      {
        variant: ['border', 'glow', 'neon', 'frame'],
        size: 'sm',
        class: 'p-2',
      },
      {
        variant: ['border', 'glow', 'neon', 'frame'],
        size: 'lg',
        class: 'p-6',
      },
      {
        variant: ['border', 'glow', 'neon', 'frame'],
        size: 'xl',
        class: 'p-8',
      },
      {
        variant: 'background',
        size: 'sm',
        class: 'p-3',
      },
      {
        variant: 'background',
        size: 'lg',
        class: 'p-8',
      },
      {
        variant: 'background',
        size: 'xl',
        class: 'p-10',
      },
    ],
    defaultVariants: {
      variant: 'border',
      color: 'primary',
      size: 'default',
      intensity: 'default',
      animation: 'none',
    },
  }
);

export interface ArcadeDecorationProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof arcadeDecorationVariants> {
  children?: React.ReactNode;
  /** Screen reader description for decorative elements */
  'aria-label'?: string;
  /** Whether the decoration should be purely decorative */
  decorative?: boolean;
}

const ArcadeDecoration = React.forwardRef<HTMLDivElement, ArcadeDecorationProps>(
  (
    {
      className,
      children,
      variant,
      color,
      size,
      intensity,
      animation,
      'aria-label': ariaLabel,
      decorative = true,
      ...props
    },
    ref
  ) => {
    // Handle corner variant with special pseudo-element classes
    if (variant === 'corner') {
      return (
        <div
          ref={ref}
          className={cn(
            arcadeDecorationVariants({ variant, color, size, intensity, animation }),
            // Corner-specific pseudo-element classes
            'before:absolute before:left-0 before:top-0 before:h-4 before:w-4 before:border-l-2 before:border-t-2',
            'after:absolute after:bottom-0 after:right-0 after:h-4 after:w-4 after:border-b-2 after:border-r-2',
            className
          )}
          aria-label={decorative ? undefined : ariaLabel}
          aria-hidden={decorative}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          arcadeDecorationVariants({ variant, color, size, intensity, animation }),
          className
        )}
        role={decorative ? 'presentation' : undefined}
        aria-label={decorative ? undefined : ariaLabel}
        aria-hidden={decorative}
        {...props}
      >
        {variant === 'background' && (
          <div className="absolute inset-0 rounded-lg bg-black/10 backdrop-blur-sm" />
        )}
        <div className={cn('relative', variant === 'background' && 'z-10')}>
          {children}
        </div>
      </div>
    );
  }
);

ArcadeDecoration.displayName = 'ArcadeDecoration';

export { ArcadeDecoration, arcadeDecorationVariants };
export default ArcadeDecoration;
