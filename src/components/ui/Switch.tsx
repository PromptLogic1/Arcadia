'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
      'border border-cyan-500/30 transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-gray-700/50',
      'hover:border-cyan-500/50',
      className
    )}
    ref={ref}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full',
        'bg-white shadow-lg ring-0 transition-transform duration-200 will-change-transform',
        'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        'data-[state=unchecked]:bg-cyan-200/90'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
