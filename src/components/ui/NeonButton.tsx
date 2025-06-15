import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const neonEffectVariants = cva(
  'group relative overflow-hidden transition-all duration-300 will-change-transform',
  {
    variants: {
      intensity: {
        none: '',
        subtle: 'hover:scale-[1.01] active:scale-[0.99]',
        default: 'hover:scale-[1.02] active:scale-[0.98]',
        strong: 'hover:scale-[1.03] active:scale-[0.97]',
      },
      glow: {
        cyan: [
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500/50 before:via-cyan-400/50 before:to-cyan-500/50',
          'before:opacity-0 before:blur-xl before:transition-opacity before:duration-300 hover:before:opacity-100',
        ],
        fuchsia: [
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-fuchsia-500/50 before:via-fuchsia-400/50 before:to-fuchsia-500/50',
          'before:opacity-0 before:blur-xl before:transition-opacity before:duration-300 hover:before:opacity-100',
        ],
        rainbow: [
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500/50 before:via-fuchsia-500/50 before:to-cyan-500/50',
          'before:opacity-0 before:blur-xl before:transition-opacity before:duration-300 hover:before:opacity-100',
        ],
        primary: [
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/50 before:via-primary/70 before:to-primary/50',
          'before:opacity-0 before:blur-xl before:transition-opacity before:duration-300 hover:before:opacity-100',
        ],
      },
      overlay: {
        none: '',
        subtle:
          'after:absolute after:inset-0 after:bg-gradient-to-r after:from-current after:to-current after:opacity-5 after:transition-opacity after:duration-300 group-hover:after:opacity-10',
        default:
          'after:absolute after:inset-0 after:bg-gradient-to-r after:from-cyan-500 after:to-fuchsia-500 after:opacity-20 after:transition-opacity after:duration-300 group-hover:after:opacity-30',
        strong:
          'after:absolute after:inset-0 after:bg-gradient-to-r after:from-cyan-500 after:to-fuchsia-500 after:opacity-30 after:transition-opacity after:duration-300 group-hover:after:opacity-40',
      },
    },
    defaultVariants: {
      intensity: 'default',
      glow: 'rainbow',
      overlay: 'default',
    },
  }
);

export interface NeonButtonProps
  extends Omit<ButtonProps, 'asChild' | 'glow'>,
    VariantProps<typeof neonEffectVariants> {
  children: React.ReactNode;
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ children, className, intensity, glow, overlay, ...buttonProps }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          neonEffectVariants({ intensity, glow, overlay }),
          className
        )}
        {...buttonProps}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </Button>
    );
  }
);

NeonButton.displayName = 'NeonButton';

export { NeonButton };
