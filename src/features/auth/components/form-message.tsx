'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, X, AlertCircle, Info, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { FormMessageProps } from '../types/signup-form.types';

// 🎨 CVA Variant System - Message Container
const formMessageVariants = cva(
  // Base container styles
  'flex items-start gap-3 rounded-lg border p-4 transition-all duration-300',
  {
    variants: {
      type: {
        success: 'border-green-500/20 bg-green-500/10 text-green-400',
        error: 'border-red-500/20 bg-red-500/10 text-red-400',
        warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
        info: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
      },
      variant: {
        default: '',
        gaming: 'backdrop-blur-sm border-2',
        neon: [
          'backdrop-blur-md border-2',
          'shadow-lg',
        ],
        cyber: [
          'backdrop-blur-lg border-2',
          'shadow-xl',
        ],
        minimal: 'border-none bg-transparent p-3',
      },
      size: {
        sm: 'p-3 gap-2 text-sm',
        default: 'p-4 gap-3',
        lg: 'p-5 gap-4 text-lg',
      },
      animation: {
        none: '',
        fade: 'animate-in fade-in duration-300',
        slide: 'animate-in slide-in-from-top-2 duration-300',
        scale: 'animate-in zoom-in-95 duration-300',
      },
    },
    compoundVariants: [
      // Success variants
      {
        type: 'success',
        variant: 'gaming',
        className: 'border-green-400/40 bg-green-900/25 shadow-green-500/10',
      },
      {
        type: 'success',
        variant: 'neon',
        className: 'border-green-400/50 bg-green-900/30 shadow-green-500/20',
      },
      {
        type: 'success',
        variant: 'cyber',
        className: 'border-green-400/60 bg-green-900/35 shadow-green-500/30',
      },
      // Error variants
      {
        type: 'error',
        variant: 'gaming',
        className: 'border-red-400/40 bg-red-900/25 shadow-red-500/10',
      },
      {
        type: 'error',
        variant: 'neon',
        className: 'border-red-400/50 bg-red-900/30 shadow-red-500/20',
      },
      {
        type: 'error',
        variant: 'cyber',
        className: 'border-red-400/60 bg-red-900/35 shadow-red-500/30',
      },
      // Warning variants
      {
        type: 'warning',
        variant: 'gaming',
        className: 'border-yellow-400/40 bg-yellow-900/25 shadow-yellow-500/10',
      },
      {
        type: 'warning',
        variant: 'neon',
        className: 'border-yellow-400/50 bg-yellow-900/30 shadow-yellow-500/20',
      },
      {
        type: 'warning',
        variant: 'cyber',
        className: 'border-yellow-400/60 bg-yellow-900/35 shadow-yellow-500/30',
      },
      // Info variants
      {
        type: 'info',
        variant: 'gaming',
        className: 'border-cyan-400/40 bg-cyan-900/25 shadow-cyan-500/10',
      },
      {
        type: 'info',
        variant: 'neon',
        className: 'border-cyan-400/50 bg-cyan-900/30 shadow-cyan-500/20',
      },
      {
        type: 'info',
        variant: 'cyber',
        className: 'border-cyan-400/60 bg-cyan-900/35 shadow-cyan-500/30',
      },
    ],
    defaultVariants: {
      type: 'info',
      variant: 'default',
      size: 'default',
      animation: 'fade',
    },
  }
);

// 🎨 CVA Variant System - Icon Styling
const iconVariants = cva(
  'flex-shrink-0 transition-all duration-200',
  {
    variants: {
      type: {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
      },
      variant: {
        default: '',
        gaming: 'drop-shadow-sm',
        neon: 'drop-shadow-md',
        cyber: 'drop-shadow-lg',
        minimal: '',
      },
      size: {
        sm: 'h-4 w-4 mt-0.5',
        default: 'h-5 w-5 mt-0.5',
        lg: 'h-6 w-6 mt-1',
      },
    },
    compoundVariants: [
      // Gaming theme icons
      {
        variant: 'gaming',
        type: 'success',
        className: 'drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]',
      },
      {
        variant: 'gaming',
        type: 'error',
        className: 'drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]',
      },
      // Neon theme icons
      {
        variant: 'neon',
        type: 'success',
        className: 'drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]',
      },
      {
        variant: 'neon',
        type: 'error',
        className: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]',
      },
      // Cyber theme icons
      {
        variant: 'cyber',
        type: 'success',
        className: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]',
      },
      {
        variant: 'cyber',
        type: 'error',
        className: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]',
      },
    ],
    defaultVariants: {
      type: 'info',
      variant: 'default',
      size: 'default',
    },
  }
);

// 🎨 CVA Variant System - Timer Styling
const timerVariants = cva(
  'text-sm transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'text-gray-400',
        gaming: 'text-cyan-300',
        neon: 'text-cyan-200',
        cyber: 'text-fuchsia-200',
        minimal: 'text-gray-500',
      },
      urgency: {
        low: '',
        medium: 'animate-pulse',
        high: 'animate-pulse text-orange-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      urgency: 'low',
    },
  }
);

// 🎨 CVA Variant System - Action Link Styling
const actionLinkVariants = cva(
  'inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 hover:gap-2',
  {
    variants: {
      type: {
        success: 'text-green-300 hover:text-green-200',
        error: 'text-red-300 hover:text-red-200',
        warning: 'text-yellow-300 hover:text-yellow-200',
        info: 'text-blue-300 hover:text-blue-200',
      },
      variant: {
        default: '',
        gaming: 'hover:drop-shadow-sm',
        neon: 'hover:drop-shadow-md',
        cyber: 'hover:drop-shadow-lg hover:text-shadow-sm',
        minimal: '',
      },
    },
    defaultVariants: {
      type: 'info',
      variant: 'default',
    },
  }
);

// 🧱 Enhanced Props Interface
interface EnhancedFormMessageProps 
  extends Omit<FormMessageProps, 'message'>,
    VariantProps<typeof formMessageVariants> {
  message: FormMessageProps['message'];
  variant?: VariantProps<typeof formMessageVariants>['variant'];
  size?: VariantProps<typeof formMessageVariants>['size'];
  animation?: VariantProps<typeof formMessageVariants>['animation'];
  showIcon?: boolean;
  dismissible?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// 🎯 Forward Ref Implementation
export const FormMessage = React.forwardRef<HTMLDivElement, EnhancedFormMessageProps>(
  (
    {
      message,
      redirectTimer,
      variant = 'default',
      size = 'default',
      animation = 'fade',
      showIcon = true,
      dismissible = false,
      autoHide = false,
      autoHideDelay = 5000,
      onDismiss,
      className,
      ...props
    },
    ref
  ) => {
    // 🧼 State Management
    const [isVisible, setIsVisible] = React.useState(true);

    // 🧼 Auto-hide Effect
    React.useEffect(() => {
      if (!autoHide || !isVisible) return;
      
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }, [autoHide, autoHideDelay, isVisible, handleDismiss]);

    // 🧼 Pure Logic - Icon Selection
    const getMessageIcon = React.useCallback(() => {
      const iconProps = { 
        className: iconVariants({ type: message.type, variant, size }) 
      };
      
      switch (message.type) {
        case 'success':
          return <Check {...iconProps} />;
        case 'error':
          return <X {...iconProps} />;
        case 'warning':
          return <AlertCircle {...iconProps} />;
        case 'info':
        default:
          return <Info {...iconProps} />;
      }
    }, [message.type, variant, size]);

    // 🧼 Pure Logic - Timer Urgency
    const getTimerUrgency = React.useCallback((seconds: number) => {
      if (seconds <= 3) return 'high' as const;
      if (seconds <= 10) return 'medium' as const;
      return 'low' as const;
    }, []);

    // 🧼 Event Handlers
    const handleDismiss = React.useCallback(() => {
      setIsVisible(false);
      onDismiss?.();
    }, [onDismiss]);

    // 🎨 Style Calculations
    const messageStyles = formMessageVariants({ 
      type: message.type, 
      variant, 
      size, 
      animation: isVisible ? animation : 'none' 
    });
    
    const timerStyles = timerVariants({ 
      variant, 
      urgency: redirectTimer ? getTimerUrgency(redirectTimer) : 'low' 
    });
    
    const actionStyles = actionLinkVariants({ 
      type: message.type, 
      variant 
    });

    // Don't render if not visible
    if (!isVisible) {
      return null;
    }

    return (
      <div 
        ref={ref} 
        className={cn(messageStyles, className)} 
        role="alert"
        aria-live="polite"
        {...props}
      >
        {/* Icon */}
        {showIcon && getMessageIcon()}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main Message */}
          <p className="text-sm leading-relaxed">
            {message.text}
          </p>

          {/* Details */}
          {message.details && (
            <p className={cn('mt-1 text-xs opacity-90', {
              'text-gray-300': variant === 'default',
              'text-cyan-200': variant === 'gaming',
              'text-cyan-100': variant === 'neon',
              'text-fuchsia-100': variant === 'cyber',
            })}>
              {message.details}
            </p>
          )}

          {/* Redirect Timer */}
          {redirectTimer !== null && redirectTimer !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <p className={timerStyles}>
                Redirecting in {redirectTimer} second{redirectTimer !== 1 ? 's' : ''}...
              </p>
            </div>
          )}

          {/* Action Link */}
          {message.actionLabel && message.actionHref && (
            <div className="mt-3">
              <Link 
                href={message.actionHref}
                className={actionStyles}
              >
                {message.actionLabel}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded transition-colors duration-200',
              'hover:bg-white/10 focus:bg-white/10 focus:outline-none',
              {
                'text-gray-400 hover:text-gray-300': variant === 'default',
                'text-cyan-300 hover:text-cyan-200': variant === 'gaming',
                'text-cyan-200 hover:text-cyan-100': variant === 'neon',
                'text-fuchsia-200 hover:text-fuchsia-100': variant === 'cyber',
              }
            )}
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

FormMessage.displayName = 'FormMessage';

// 🎯 Type Exports
export type { EnhancedFormMessageProps as FormMessageProps };
export { formMessageVariants, iconVariants, timerVariants, actionLinkVariants }; 