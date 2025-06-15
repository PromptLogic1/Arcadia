import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-cyan-500 text-white hover:bg-cyan-600 active:bg-cyan-700 shadow-[0_0_15px_rgba(77,208,225,0.4)] hover:shadow-[0_0_20px_rgba(77,208,225,0.6)]',
        secondary:
          'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800 border border-slate-600',
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/20',
        ghost: 'hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700',
      },
      size: {
        sm: 'h-11 px-4 text-sm min-w-[44px]',
        md: 'h-11 px-5 py-2.5 min-w-[44px]',
        lg: 'h-12 px-8 text-base min-w-[44px]',
        icon: 'h-11 w-11 min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
ButtonComponent.displayName = 'Button';

// Memoize the Button component to prevent unnecessary re-renders
const Button = React.memo(ButtonComponent);

export { Button, buttonVariants };
