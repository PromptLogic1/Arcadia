import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-target',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground text-shadow-sm hover-glow drop-shadow-md drop-shadow-primary/20 hover:drop-shadow-lg hover:drop-shadow-primary/30',
        destructive:
          'bg-destructive text-destructive-foreground text-shadow-sm hover-glow drop-shadow-md drop-shadow-destructive/20 hover:drop-shadow-lg hover:drop-shadow-destructive/30',
        outline:
          'border border-border bg-background hover:bg-accent hover:text-accent-foreground hover-lift',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover-lift text-shadow-xs',
        ghost: 'hover:bg-accent hover:text-accent-foreground hover-glow',
        link: 'text-primary underline-offset-4 hover:underline hover-glow text-shadow-xs',
        gradient:
          'gradient-primary text-primary-foreground font-medium hover-glow text-shadow-sm drop-shadow-lg drop-shadow-primary/25',
        neon: 'bg-accent text-accent-foreground text-neon border border-accent/50 animate-glow hover:animate-glow',
        glass:
          'glass text-foreground hover:bg-accent/10 hover-glow backdrop-blur-md',
        cyber: 'cyber-button hover:scale-105 active:scale-95',
        'cyber-outline':
          'border border-cyan-500/40 bg-transparent text-cyan-200 hover:bg-cyan-500/8 hover:border-cyan-400/60 hover:text-cyan-100 backdrop-blur-sm transition-all duration-200',
        'cyber-ghost':
          'bg-transparent text-cyan-200 hover:bg-cyan-500/8 hover:text-cyan-100 transition-all duration-200',
        holographic:
          'holographic-effect bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold border-0 hover:from-purple-700 hover:to-fuchsia-700',
      },
      size: {
        default: 'h-10 px-4 py-2 pointer-coarse:h-12 pointer-coarse:px-6',
        sm: 'h-8 rounded-md px-3 text-xs pointer-coarse:h-10 pointer-coarse:px-4',
        lg: 'h-12 rounded-md px-8 text-base pointer-coarse:h-14 pointer-coarse:px-10',
        icon: 'h-10 w-10 pointer-coarse:h-12 pointer-coarse:w-12',
        xs: 'h-6 px-2 text-xs rounded pointer-coarse:h-8 pointer-coarse:px-3',
      },
      shadow: {
        none: '',
        sm: 'drop-shadow-sm',
        md: 'drop-shadow-md',
        lg: 'drop-shadow-lg',
        xl: 'drop-shadow-xl',
        colored: 'drop-shadow-lg drop-shadow-primary/25',
      },
      glow: {
        none: '',
        subtle: 'text-shadow-xs',
        normal: 'text-shadow-sm',
        intense: 'text-shadow-md',
        neon: 'text-neon',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shadow: 'none',
      glow: 'none',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, shadow, glow, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, shadow, glow, className })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
