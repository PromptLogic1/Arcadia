'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  Check, 
  X, 
  Info, 
  Clock, 
  ExternalLink,
  AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// 🎨 CVA Variant System - Unified Message Component
const formMessageVariants = cva(
  'flex items-start gap-3 rounded-lg border p-4 transition-all duration-300',
  {
    variants: {
      type: {
        success: 'border-green-500/20 bg-green-500/10 text-green-400',
        error: 'border-red-500/20 bg-red-500/10 text-red-400',
        warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
        info: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
        loading: 'border-gray-500/20 bg-gray-500/10 text-gray-400',
      },
      variant: {
        default: '',
        gaming: 'backdrop-blur-sm border-2',
        neon: 'backdrop-blur-md border-2 shadow-lg',
        cyber: 'backdrop-blur-lg border-2 shadow-xl',
        minimal: 'border-none bg-transparent p-3',
        inline: 'border-none bg-transparent p-0 gap-2',
      },
      size: {
        sm: 'p-3 gap-2 text-sm',
        default: 'p-4 gap-3 text-sm',
        lg: 'p-6 gap-4 text-base',
      },
    },
    defaultVariants: {
      type: 'info',
      variant: 'default',
      size: 'default',
    },
  }
);

const iconVariants = cva(
  'flex-shrink-0',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 mt-0.5',
        default: 'h-5 w-5 mt-0.5',
        lg: 'h-6 w-6 mt-1',
      },
      type: {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
        loading: 'text-gray-400 animate-spin',
      },
    },
    defaultVariants: {
      size: 'default',
      type: 'info',
    },
  }
);

const getIcon = (type: 'success' | 'error' | 'warning' | 'info' | 'loading') => {
  switch (type) {
    case 'success':
      return Check;
    case 'error':
      return X;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'loading':
      return Clock;
    default:
      return Info;
  }
};

export interface FormMessageProps extends VariantProps<typeof formMessageVariants> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }> | false;
  title?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const FormMessage = React.forwardRef<HTMLDivElement, FormMessageProps>(
  ({ 
    children,
    type = 'info',
    variant = 'default',
    size = 'default',
    className,
    icon,
    title,
    actionLabel,
    actionHref,
    onAction,
    ...props 
  }, ref) => {
    const IconComponent = icon !== false ? (icon || getIcon(type)) : null;
    
    return (
      <div
        ref={ref}
        className={cn(formMessageVariants({ type, variant, size }), className)}
        role="alert"
        {...props}
      >
        {IconComponent && (
          <IconComponent className={cn(iconVariants({ size, type }))} />
        )}
        
        <div className="flex-1 space-y-2">
          {title && (
            <p className="font-semibold leading-tight">{title}</p>
          )}
          
          <div className="leading-relaxed">
            {children}
          </div>
          
          {(actionLabel && (actionHref || onAction)) && (
            <div className="mt-3">
              {actionHref ? (
                <Link 
                  href={actionHref}
                  className="inline-flex items-center gap-1 text-sm font-medium underline hover:no-underline"
                >
                  {actionLabel}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <button
                  onClick={onAction}
                  className="inline-flex items-center gap-1 text-sm font-medium underline hover:no-underline"
                >
                  {actionLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

FormMessage.displayName = 'FormMessage';

// Convenience components for specific message types
export const SuccessMessage = React.forwardRef<HTMLDivElement, Omit<FormMessageProps, 'type'>>(
  (props, ref) => <FormMessage ref={ref} type="success" {...props} />
);

export const ErrorMessage = React.forwardRef<HTMLDivElement, Omit<FormMessageProps, 'type'>>(
  (props, ref) => <FormMessage ref={ref} type="error" {...props} />
);

export const WarningMessage = React.forwardRef<HTMLDivElement, Omit<FormMessageProps, 'type'>>(
  (props, ref) => <FormMessage ref={ref} type="warning" {...props} />
);

export const InfoMessage = React.forwardRef<HTMLDivElement, Omit<FormMessageProps, 'type'>>(
  (props, ref) => <FormMessage ref={ref} type="info" {...props} />
);

export const LoadingMessage = React.forwardRef<HTMLDivElement, Omit<FormMessageProps, 'type'>>(
  (props, ref) => <FormMessage ref={ref} type="loading" {...props} />
);

SuccessMessage.displayName = 'SuccessMessage';
ErrorMessage.displayName = 'ErrorMessage';
WarningMessage.displayName = 'WarningMessage';
InfoMessage.displayName = 'InfoMessage';
LoadingMessage.displayName = 'LoadingMessage';

// Type definitions for external use
export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type MessageVariant = 'default' | 'gaming' | 'neon' | 'cyber' | 'minimal' | 'inline';
export type MessageSize = 'sm' | 'default' | 'lg';