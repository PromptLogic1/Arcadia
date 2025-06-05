'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

// Tab List Variants
const tabsListVariants = cva(
  'inline-flex items-center justify-center rounded-lg p-1 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground h-9',
        cyber:
          'bg-slate-900/50 border border-cyan-500/30 backdrop-blur-sm h-10',
        neon: 'bg-slate-900/70 border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20 backdrop-blur-sm h-10',
        glass: 'bg-white/5 border border-white/20 backdrop-blur-md h-10',
        minimal: 'bg-transparent border-b border-cyan-500/30 rounded-none h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Tab Trigger Variants
const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        cyber:
          'data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200 data-[state=active]:border-cyan-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 text-cyan-300/70',
        neon: 'data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-100 data-[state=active]:border-2 data-[state=active]:border-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-400/40 hover:bg-cyan-500/10 text-cyan-300/70',
        glass:
          'data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-lg hover:bg-white/10 text-white/70',
        minimal:
          'data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none border-b-2 border-transparent hover:text-cyan-300 text-cyan-300/70',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
