'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PasswordRequirementsProps } from '../types/signup-form.types';
import { getPasswordRequirementsList } from '../utils/validation.utils';

// 🎨 CVA Variant System - Password Requirements Container
const passwordRequirementsVariants = cva(
  // Base container styles
  'w-full rounded-lg border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-cyan-500/20 bg-gray-800/95',
        compact: 'border-gray-600/30 bg-gray-800/80',
        minimal: 'border-none bg-transparent',
        gaming: 'border-cyan-400/30 bg-gray-900/90 backdrop-blur-sm',
        neon: [
          'border-cyan-400/40 bg-gray-900/95 backdrop-blur-md',
          'shadow-lg shadow-cyan-500/10',
        ],
        cyber: [
          'border-fuchsia-400/30 bg-black/80 backdrop-blur-lg',
          'shadow-xl shadow-fuchsia-500/15',
        ],
      },
      size: {
        sm: 'p-3 space-y-1',
        default: 'p-4 space-y-2',
        lg: 'p-5 space-y-3',
      },
      state: {
        neutral: '',
        progress: 'border-yellow-500/30',
        complete: 'border-green-500/30 bg-green-900/10',
        error: 'border-red-500/30 bg-red-900/10',
      },
    },
    compoundVariants: [
      // Gaming theme states
      {
        variant: 'gaming',
        state: 'complete',
        className: 'border-green-400/40 bg-green-900/20 shadow-green-500/10',
      },
      {
        variant: 'gaming',
        state: 'error',
        className: 'border-red-400/40 bg-red-900/20 shadow-red-500/10',
      },
      // Neon theme states
      {
        variant: 'neon',
        state: 'complete',
        className: 'border-green-400/50 bg-green-900/25 shadow-green-500/20',
      },
      {
        variant: 'neon',
        state: 'progress',
        className: 'border-yellow-400/50 bg-yellow-900/15 shadow-yellow-500/10',
      },
      // Cyber theme states
      {
        variant: 'cyber',
        state: 'complete',
        className: 'border-green-400/60 bg-green-900/30 shadow-green-500/25',
      },
      {
        variant: 'cyber',
        state: 'error',
        className: 'border-red-400/60 bg-red-900/30 shadow-red-500/25',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'neutral',
    },
  }
);

// 🎨 CVA Variant System - Title Styling
const titleVariants = cva('font-medium transition-colors duration-200', {
  variants: {
    variant: {
      default: 'text-gray-300',
      compact: 'text-gray-400 text-sm',
      minimal: 'text-gray-400 text-sm',
      gaming: 'text-cyan-300',
      neon: 'text-cyan-200',
      cyber: 'text-fuchsia-200',
    },
    size: {
      sm: 'text-sm mb-2',
      default: 'text-sm mb-3',
      lg: 'text-base mb-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

// 🎨 CVA Variant System - Requirement Item Styling
const requirementItemVariants = cva(
  'flex items-center gap-2 transition-all duration-200',
  {
    variants: {
      variant: {
        default: '',
        compact: 'gap-1.5',
        minimal: 'gap-1',
        gaming: 'hover:translate-x-1',
        neon: 'hover:translate-x-1 hover:shadow-sm',
        cyber: 'hover:translate-x-2 hover:glow-sm',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
      state: {
        met: '',
        unmet: '',
      },
    },
    compoundVariants: [
      // Met requirements styling by variant
      {
        variant: 'gaming',
        state: 'met',
        className: 'text-green-400',
      },
      {
        variant: 'neon',
        state: 'met',
        className: 'text-green-300',
      },
      {
        variant: 'cyber',
        state: 'met',
        className: 'text-green-200',
      },
      // Unmet requirements styling by variant
      {
        variant: 'gaming',
        state: 'unmet',
        className: 'text-gray-400',
      },
      {
        variant: 'neon',
        state: 'unmet',
        className: 'text-gray-300',
      },
      {
        variant: 'cyber',
        state: 'unmet',
        className: 'text-gray-200',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'unmet',
    },
  }
);

// 🎨 CVA Variant System - Icon Styling
const iconVariants = cva('flex-shrink-0 transition-all duration-200', {
  variants: {
    variant: {
      default: '',
      compact: '',
      minimal: '',
      gaming: 'drop-shadow-sm',
      neon: 'drop-shadow-md',
      cyber: 'drop-shadow-lg',
    },
    size: {
      sm: 'h-3 w-3',
      default: 'h-4 w-4',
      lg: 'h-5 w-5',
    },
    state: {
      met: '',
      unmet: '',
    },
  },
  compoundVariants: [
    // Met state icons
    {
      state: 'met',
      className: 'text-green-400',
    },
    // Gaming theme met icons
    {
      variant: 'gaming',
      state: 'met',
      className: 'text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]',
    },
    // Neon theme met icons
    {
      variant: 'neon',
      state: 'met',
      className: 'text-green-300 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]',
    },
    // Cyber theme met icons
    {
      variant: 'cyber',
      state: 'met',
      className: 'text-green-200 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'default',
    state: 'unmet',
  },
});

// 🧱 Enhanced Props Interface
interface EnhancedPasswordRequirementsProps
  extends Omit<PasswordRequirementsProps, 'variant'>,
    VariantProps<typeof passwordRequirementsVariants> {
  variant?: VariantProps<typeof passwordRequirementsVariants>['variant'];
  size?: VariantProps<typeof passwordRequirementsVariants>['size'];
  state?: VariantProps<typeof passwordRequirementsVariants>['state'];
  showProgress?: boolean;
  hideCompleted?: boolean;
  customTitle?: string;
  iconSet?: 'default' | 'checkmark' | 'gaming';
}

// 🎯 Forward Ref Implementation
export const PasswordRequirements = React.forwardRef<
  HTMLDivElement,
  EnhancedPasswordRequirementsProps
>(
  (
    {
      requirements,
      showTitle = true,
      variant = 'default',
      size = 'default',
      state: propState,
      showProgress = false,
      hideCompleted = false,
      customTitle,
      iconSet = 'default',
      className,
      ...props
    },
    ref
  ) => {
    // 🧼 Pure Logic - Requirements Processing
    const requirementsList = React.useMemo(
      () => getPasswordRequirementsList(requirements),
      [requirements]
    );

    const progressStats = React.useMemo(() => {
      const completed = requirementsList.filter(item => item.met).length;
      const total = requirementsList.length;
      const percentage = Math.round((completed / total) * 100);

      return { completed, total, percentage };
    }, [requirementsList]);

    // 🧼 Pure Logic - State Derivation
    const derivedState = React.useMemo(() => {
      if (propState) return propState;
      if (progressStats.percentage === 100) return 'complete' as const;
      if (progressStats.percentage > 0) return 'progress' as const;
      return 'neutral' as const;
    }, [propState, progressStats.percentage]);

    // 🧼 Pure Logic - Icon Selection
    const getIcon = React.useCallback(
      (met: boolean) => {
        const iconProps = {
          className: iconVariants({
            variant,
            size,
            state: met ? 'met' : 'unmet',
          }),
        };

        if (met) {
          return <Check {...iconProps} />;
        }

        switch (iconSet) {
          case 'gaming':
            return <Info {...iconProps} />;
          default:
            return <X {...iconProps} />;
        }
      },
      [variant, size, iconSet]
    );

    // 🎨 Style Calculations
    const containerStyles = passwordRequirementsVariants({
      variant,
      size,
      state: derivedState,
    });
    const titleStyles = titleVariants({ variant, size });

    // Filter requirements if hideCompleted is enabled
    const displayedRequirements = React.useMemo(() => {
      return hideCompleted
        ? requirementsList.filter(item => !item.met)
        : requirementsList;
    }, [requirementsList, hideCompleted]);

    // Don't render if all requirements are hidden
    if (hideCompleted && displayedRequirements.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className={cn(containerStyles, className)} {...props}>
        {/* Title with optional progress */}
        {showTitle && (
          <div className="flex items-center justify-between">
            <p className={titleStyles}>
              {customTitle || 'Password Requirements:'}
            </p>
            {showProgress && (
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-200',
                  {
                    'text-gray-400': variant === 'default',
                    'text-cyan-300': variant === 'gaming',
                    'text-cyan-200': variant === 'neon',
                    'text-fuchsia-200': variant === 'cyber',
                    'text-green-400': derivedState === 'complete',
                  }
                )}
              >
                {progressStats.completed}/{progressStats.total}
              </span>
            )}
          </div>
        )}

        {/* Progress bar for certain variants */}
        {showProgress && (variant === 'neon' || variant === 'cyber') && (
          <div
            className={cn('h-1 w-full overflow-hidden rounded-full', {
              'bg-gray-700': variant === 'neon',
              'bg-gray-800': variant === 'cyber',
            })}
          >
            <div
              className={cn('h-full transition-all duration-500 ease-out', {
                'bg-gradient-to-r from-cyan-500 to-blue-500':
                  variant === 'neon',
                'bg-gradient-to-r from-fuchsia-500 to-purple-500':
                  variant === 'cyber',
                'from-green-500 to-emerald-500': derivedState === 'complete',
              })}
              style={{ width: `${progressStats.percentage}%` }}
            />
          </div>
        )}

        {/* Requirements List */}
        <div
          className={cn('space-y-1', {
            'space-y-0.5': size === 'sm',
            'space-y-2': size === 'lg',
          })}
        >
          {displayedRequirements.map(({ label, met }) => (
            <div
              key={label}
              className={requirementItemVariants({
                variant,
                size,
                state: met ? 'met' : 'unmet',
              })}
            >
              {getIcon(met)}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PasswordRequirements.displayName = 'PasswordRequirements';

// 🎯 Type Exports
export type { EnhancedPasswordRequirementsProps as PasswordRequirementsProps };
export {
  passwordRequirementsVariants,
  titleVariants,
  requirementItemVariants,
  iconVariants,
};
