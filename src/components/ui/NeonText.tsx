import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const neonTextVariants = cva(
  // Base classes
  'font-bold tracking-wide',
  {
    variants: {
      variant: {
        solid: '',
        gradient: 'bg-gradient-to-r bg-clip-text text-transparent',
      },
      color: {
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
        pink: 'text-pink-400',
        yellow: 'text-yellow-400',
        cyan: 'text-cyan-400',
        fuchsia: 'text-fuchsia-400',
        red: 'text-red-400',
      },
      intensity: {
        low: 'opacity-75',
        medium: '',
        high: 'brightness-110',
      },
      glow: {
        none: '',
        subtle: '',
        medium: '',
        strong: '',
      },
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
      },
    },
    compoundVariants: [
      // Glow effects for each color
      {
        variant: 'solid',
        color: 'blue',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]',
      },
      {
        variant: 'solid',
        color: 'blue',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]',
      },
      {
        variant: 'solid',
        color: 'blue',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(59,130,246,0.7)]',
      },
      {
        variant: 'solid',
        color: 'green',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]',
      },
      {
        variant: 'solid',
        color: 'green',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]',
      },
      {
        variant: 'solid',
        color: 'green',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(34,197,94,0.7)]',
      },
      {
        variant: 'solid',
        color: 'purple',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]',
      },
      {
        variant: 'solid',
        color: 'purple',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]',
      },
      {
        variant: 'solid',
        color: 'purple',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(168,85,247,0.7)]',
      },
      {
        variant: 'solid',
        color: 'pink',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]',
      },
      {
        variant: 'solid',
        color: 'pink',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]',
      },
      {
        variant: 'solid',
        color: 'pink',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(236,72,153,0.7)]',
      },
      {
        variant: 'solid',
        color: 'yellow',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]',
      },
      {
        variant: 'solid',
        color: 'yellow',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]',
      },
      {
        variant: 'solid',
        color: 'yellow',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(234,179,8,0.7)]',
      },
      {
        variant: 'solid',
        color: 'cyan',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      },
      {
        variant: 'solid',
        color: 'cyan',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]',
      },
      {
        variant: 'solid',
        color: 'cyan',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(6,182,212,0.7)]',
      },
      {
        variant: 'solid',
        color: 'fuchsia',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(217,70,239,0.3)]',
      },
      {
        variant: 'solid',
        color: 'fuchsia',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(217,70,239,0.5)]',
      },
      {
        variant: 'solid',
        color: 'fuchsia',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(217,70,239,0.7)]',
      },
      {
        variant: 'solid',
        color: 'red',
        glow: 'subtle',
        class: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]',
      },
      {
        variant: 'solid',
        color: 'red',
        glow: 'medium',
        class: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]',
      },
      {
        variant: 'solid',
        color: 'red',
        glow: 'strong',
        class: 'drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      color: 'cyan',
      intensity: 'medium',
      glow: 'medium',
      size: 'default',
    },
  }
);

const gradientVariants = {
  'cyan-fuchsia': 'from-cyan-400 to-fuchsia-500',
  'blue-purple': 'from-blue-400 to-purple-500',
  'green-blue': 'from-green-400 to-blue-500',
  'pink-yellow': 'from-pink-400 to-yellow-500',
  'purple-pink': 'from-purple-400 to-pink-500',
  'yellow-red': 'from-yellow-400 to-red-500',
  'cyan-blue': 'from-cyan-400 to-blue-500',
  rainbow: 'from-cyan-400 via-fuchsia-500 to-yellow-400',
} as const;

export interface NeonTextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof neonTextVariants> {
  children: React.ReactNode;
  /** Custom gradient variant for gradient text */
  gradientVariant?: keyof typeof gradientVariants;
  /** Custom gradient classes (overrides gradientVariant) */
  customGradient?: string;
  /** Whether the text should animate (subtle pulse) */
  animate?: boolean;
  /** Screen reader description for decorative text */
  'aria-label'?: string;
}

const NeonText = React.forwardRef<HTMLSpanElement, NeonTextProps>(
  (
    {
      className,
      children,
      variant,
      color,
      intensity,
      glow,
      size,
      gradientVariant = 'cyan-fuchsia',
      customGradient,
      animate = false,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const gradientClasses = React.useMemo(() => {
      if (variant !== 'gradient') return '';
      if (customGradient) return customGradient;
      return gradientVariants[gradientVariant];
    }, [variant, customGradient, gradientVariant]);

    return (
      <span
        ref={ref}
        className={cn(
          neonTextVariants({ variant, color, intensity, glow, size }),
          variant === 'gradient' && gradientClasses,
          animate && 'animate-pulse',
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </span>
    );
  }
);

NeonText.displayName = 'NeonText';

export { NeonText, neonTextVariants };
export default NeonText;
