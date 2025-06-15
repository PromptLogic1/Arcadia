import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const neonTextVariants = cva(
  'font-bold tracking-wide transition-all duration-200',
  {
    variants: {
      variant: {
        solid: '',
        gradient: 'bg-gradient-to-r bg-clip-text text-transparent',
      },
      color: {
        cyan: 'text-cyan-400',
        fuchsia: 'text-fuchsia-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400',
      },
      glow: {
        none: '',
        subtle: '',
        medium: '',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
    },
    compoundVariants: [
      // Cyan glow effects
      {
        color: 'cyan',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      },
      {
        color: 'cyan',
        glow: 'medium',
        class: 'drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]',
      },
      // Fuchsia glow effects
      {
        color: 'fuchsia',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(217,70,239,0.3)]',
      },
      {
        color: 'fuchsia',
        glow: 'medium',
        class: 'drop-shadow-[0_0_20px_rgba(217,70,239,0.5)]',
      },
      // Blue glow effects
      {
        color: 'blue',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]',
      },
      {
        color: 'blue',
        glow: 'medium',
        class: 'drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      },
      // Yellow glow effects
      {
        color: 'yellow',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]',
      },
      {
        color: 'yellow',
        glow: 'medium',
        class: 'drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      color: 'cyan',
      glow: 'medium',
      size: 'md',
    },
  }
);

const gradientPresets = {
  'cyan-fuchsia': 'from-cyan-400 to-fuchsia-500',
  'blue-purple': 'from-blue-400 to-purple-500',
  'yellow-red': 'from-yellow-400 to-red-500',
} as const;

export interface NeonTextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof neonTextVariants> {
  children: React.ReactNode;
  gradientPreset?: keyof typeof gradientPresets;
  animate?: boolean;
}

const NeonText = React.forwardRef<HTMLSpanElement, NeonTextProps>(
  (
    {
      className,
      children,
      variant,
      color,
      glow,
      size,
      gradientPreset = 'cyan-fuchsia',
      animate = false,
      ...props
    },
    ref
  ) => {
    // Memoize className calculation to prevent recalculation on every render
    const computedClassName = React.useMemo(
      () =>
        cn(
          neonTextVariants({ variant, color, glow, size }),
          variant === 'gradient' && gradientPresets[gradientPreset],
          animate && 'animate-pulse',
          className
        ),
      [variant, color, glow, size, gradientPreset, animate, className]
    );

    return (
      <span ref={ref} className={computedClassName} {...props}>
        {children}
      </span>
    );
  }
);

NeonText.displayName = 'NeonText';

// Memoize the component to prevent unnecessary re-renders
const MemoizedNeonText = React.memo(NeonText);

export { MemoizedNeonText as NeonText, neonTextVariants };
export default MemoizedNeonText;
