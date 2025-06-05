import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Cyberpunk variants
        cyber:
          'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-200',
        'cyber-purple':
          'border-purple-500/50 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400 hover:text-purple-200',
        'cyber-fuchsia':
          'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300 shadow-lg shadow-fuchsia-500/20 hover:bg-fuchsia-500/20 hover:border-fuchsia-400 hover:text-fuchsia-200',
        'cyber-emerald':
          'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-emerald-200',
        neon: 'border-2 border-cyan-400/60 bg-slate-900/50 text-cyan-100 shadow-lg shadow-cyan-500/30 backdrop-blur-sm hover:shadow-cyan-400/40 hover:border-cyan-300',
        holographic:
          'border border-fuchsia-500/50 bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 text-fuchsia-200 shadow-lg shadow-fuchsia-500/30 backdrop-blur-sm hover:from-purple-500/20 hover:to-fuchsia-500/20',
        glass:
          'border border-white/20 bg-white/5 text-white backdrop-blur-md shadow-lg hover:bg-white/10 hover:border-white/30',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      glow: {
        none: '',
        subtle: 'animate-glow',
        intense: 'animate-pulse',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      glow: 'none',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
