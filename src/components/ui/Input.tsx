import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { cyberpunkStyles } from '@/styles/cyberpunk.styles';

const inputVariants = cva(
  'flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        cyber: cyberpunkStyles.input,
        neon: 'border-cyan-400/50 bg-slate-900/70 text-cyan-100 placeholder:text-cyan-300/50 focus:border-cyan-300 focus:ring-cyan-300/30 focus:shadow-lg focus:shadow-cyan-500/20 backdrop-blur-sm',
        holographic:
          'holographic-effect border-fuchsia-500/40 bg-slate-900/80 text-fuchsia-100 placeholder:text-fuchsia-300/50 focus:border-fuchsia-400 focus:ring-fuchsia-400/30',
        ghost:
          'border-transparent bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20',
      },
      inputSize: {
        default: 'h-9',
        sm: 'h-8 text-xs',
        lg: 'h-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const InputComponent = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
InputComponent.displayName = 'Input';

// Memoize the Input component to prevent unnecessary re-renders
const Input = React.memo(InputComponent);

export { Input };
