import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const neonBorderVariants = cva(
  // Base classes
  'rounded-lg',
  {
    variants: {
      color: {
        blue: 'border-blue-400',
        purple: 'border-purple-400',
        pink: 'border-pink-400',
        green: 'border-green-400',
        yellow: 'border-yellow-400',
        red: 'border-red-400',
        cyan: 'border-cyan-400',
        fuchsia: 'border-fuchsia-400',
      },
      intensity: {
        low: 'border opacity-60',
        medium: 'border-2',
        high: 'border-2 brightness-110',
        ultra: 'border-4',
      },
      glow: {
        none: '',
        subtle: '',
        medium: '',
        strong: '',
        ultra: '',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
        ping: 'animate-ping',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-lg',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
      },
    },
    compoundVariants: [
      // Glow effects for each color and intensity
      {
        color: 'blue',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
      },
      {
        color: 'blue',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      },
      {
        color: 'blue',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(59,130,246,0.8)]',
      },
      {
        color: 'blue',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(59,130,246,1.0)]',
      },
      {
        color: 'purple',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(147,51,234,0.3)]',
      },
      {
        color: 'purple',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(147,51,234,0.6)]',
      },
      {
        color: 'purple',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(147,51,234,0.8)]',
      },
      {
        color: 'purple',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(147,51,234,1.0)]',
      },
      {
        color: 'pink',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(236,72,153,0.3)]',
      },
      {
        color: 'pink',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(236,72,153,0.6)]',
      },
      {
        color: 'pink',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(236,72,153,0.8)]',
      },
      {
        color: 'pink',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(236,72,153,1.0)]',
      },
      {
        color: 'green',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(34,197,94,0.3)]',
      },
      {
        color: 'green',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
      },
      {
        color: 'green',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(34,197,94,0.8)]',
      },
      {
        color: 'green',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(34,197,94,1.0)]',
      },
      {
        color: 'yellow',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(250,204,21,0.3)]',
      },
      {
        color: 'yellow',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(250,204,21,0.6)]',
      },
      {
        color: 'yellow',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(250,204,21,0.8)]',
      },
      {
        color: 'yellow',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(250,204,21,1.0)]',
      },
      {
        color: 'red',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
      },
      {
        color: 'red',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]',
      },
      {
        color: 'red',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(239,68,68,0.8)]',
      },
      {
        color: 'red',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(239,68,68,1.0)]',
      },
      {
        color: 'cyan',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      },
      {
        color: 'cyan',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(6,182,212,0.6)]',
      },
      {
        color: 'cyan',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(6,182,212,0.8)]',
      },
      {
        color: 'cyan',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(6,182,212,1.0)]',
      },
      {
        color: 'fuchsia',
        glow: 'subtle',
        class: 'shadow-[0_0_8px_rgba(217,70,239,0.3)]',
      },
      {
        color: 'fuchsia',
        glow: 'medium',
        class: 'shadow-[0_0_12px_rgba(217,70,239,0.6)]',
      },
      {
        color: 'fuchsia',
        glow: 'strong',
        class: 'shadow-[0_0_16px_rgba(217,70,239,0.8)]',
      },
      {
        color: 'fuchsia',
        glow: 'ultra',
        class: 'shadow-[0_0_24px_rgba(217,70,239,1.0)]',
      },
    ],
    defaultVariants: {
      color: 'cyan',
      intensity: 'medium',
      glow: 'medium',
      animation: 'none',
      radius: 'default',
    },
  }
);

export interface NeonBorderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof neonBorderVariants> {
  children: React.ReactNode;
  /** Screen reader description for decorative borders */
  'aria-label'?: string;
}

const NeonBorder = React.forwardRef<HTMLDivElement, NeonBorderProps>(
  (
    {
      className,
      children,
      color,
      intensity,
      glow,
      animation,
      radius,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          neonBorderVariants({ color, intensity, glow, animation, radius }),
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NeonBorder.displayName = 'NeonBorder';

export { NeonBorder, neonBorderVariants };
export default NeonBorder;
