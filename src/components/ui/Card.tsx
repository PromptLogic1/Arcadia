import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-card text-card-foreground rounded-xl border shadow transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-slate-900/90 border-slate-700 shadow-sm hover:border-slate-600',
        primary:
          'bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/90 border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:border-cyan-400/60 hover:shadow-cyan-500/15',
        elevated:
          'bg-slate-800/80 backdrop-blur-md border-slate-600/50 shadow-xl hover:shadow-2xl hover:scale-[1.01] will-change-transform',
        ghost:
          'bg-transparent border-transparent shadow-none hover:bg-slate-800/50 hover:border-slate-700/50',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, className }))}
      {...props}
    />
  )
);
CardComponent.displayName = 'Card';

const CardHeaderComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 px-6 pt-6 pb-4', className)}
    {...props}
  />
));
CardHeaderComponent.displayName = 'CardHeader';

const CardTitleComponent = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('leading-none font-semibold tracking-tight', className)}
    {...props}
  />
));
CardTitleComponent.displayName = 'CardTitle';

const CardDescriptionComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
CardDescriptionComponent.displayName = 'CardDescription';

const CardContentComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 pb-6', className)} {...props} />
));
CardContentComponent.displayName = 'CardContent';

const CardFooterComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center px-6 pb-6', className)}
    {...props}
  />
));
CardFooterComponent.displayName = 'CardFooter';

// Memoize all Card components to prevent unnecessary re-renders
const Card = React.memo(CardComponent);
const CardHeader = React.memo(CardHeaderComponent);
const CardTitle = React.memo(CardTitleComponent);
const CardDescription = React.memo(CardDescriptionComponent);
const CardContent = React.memo(CardContentComponent);
const CardFooter = React.memo(CardFooterComponent);

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
