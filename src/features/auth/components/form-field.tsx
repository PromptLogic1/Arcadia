'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FormFieldProps } from '../types/signup-form.types';

// 🎨 CVA Variant System - Form Field Styling
const formFieldVariants = cva(
  // Base styles for the field container
  'space-y-2',
  {
    variants: {
      variant: {
        default: '',
        gaming: 'relative',
        neon: 'relative',
        cyber: 'relative group',
      },
      size: {
        sm: '',
        default: '',
        lg: 'space-y-3',
      },
      state: {
        default: '',
        error: '',
        success: '',
        loading: 'opacity-75',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

const inputVariants = cva(
  // Base input styles
  'border-cyan-500/50 bg-gray-800/50 transition-all duration-200 focus:border-fuchsia-500',
  {
    variants: {
      variant: {
        default: '',
        gaming: 'border-2 bg-gray-900/80 backdrop-blur-sm',
        neon: [
          'border-2 bg-gray-900/90 backdrop-blur-sm',
          'focus:shadow-lg focus:shadow-cyan-500/20',
          'hover:border-cyan-400/70',
        ],
        cyber: [
          'border-2 bg-black/60 backdrop-blur-md',
          'focus:shadow-xl focus:shadow-fuchsia-500/30',
          'hover:border-fuchsia-400/70',
          'group-hover:bg-gray-900/70',
        ],
      },
      state: {
        default: '',
        error: 'border-red-500/50 focus:border-red-500 bg-red-500/5',
        success: 'border-green-500/50 focus:border-green-500 bg-green-500/5',
        loading: 'cursor-not-allowed',
      },
      size: {
        sm: 'h-9 text-sm',
        default: 'h-10',
        lg: 'h-12 text-lg',
      },
    },
    compoundVariants: [
      // Gaming theme with error state
      {
        variant: 'gaming',
        state: 'error',
        className: 'border-red-400/70 bg-red-900/20 focus:shadow-red-500/20',
      },
      // Neon theme with success state
      {
        variant: 'neon',
        state: 'success',
        className: 'border-green-400/70 bg-green-900/20 focus:shadow-green-500/20',
      },
      // Cyber theme combinations
      {
        variant: 'cyber',
        state: 'error',
        className: 'border-red-400/80 bg-red-900/30 focus:shadow-red-500/40',
      },
      {
        variant: 'cyber',
        state: 'success',
        className: 'border-green-400/80 bg-green-900/30 focus:shadow-green-500/40',
      },
    ],
    defaultVariants: {
      variant: 'default',
      state: 'default',
      size: 'default',
    },
  }
);

const labelVariants = cva(
  // Base label styles
  'font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'text-gray-200',
        gaming: 'text-cyan-300',
        neon: 'text-cyan-200',
        cyber: 'text-fuchsia-200',
      },
      state: {
        default: '',
        error: 'text-red-400',
        success: 'text-green-400',
        loading: 'text-gray-400',
      },
      size: {
        sm: 'text-sm',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    compoundVariants: [
      // Required field indicator
      {
        variant: 'gaming',
        className: 'after:content-["*"] after:text-cyan-400 after:ml-1',
      },
      {
        variant: 'neon',
        className: 'after:content-["*"] after:text-cyan-300 after:ml-1',
      },
      {
        variant: 'cyber',
        className: 'after:content-["*"] after:text-fuchsia-300 after:ml-1',
      },
    ],
    defaultVariants: {
      variant: 'default',
      state: 'default',
      size: 'default',
    },
  }
);

const errorMessageVariants = cva(
  'mt-1 text-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'text-red-400',
        gaming: 'text-red-300',
        neon: 'text-red-300',
        cyber: 'text-red-200',
      },
      show: {
        true: 'opacity-100 translate-y-0',
        false: 'opacity-0 -translate-y-1 pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      show: true,
    },
  }
);

// 🧱 Props Interface with CVA Integration
interface EnhancedFormFieldProps 
  extends Omit<FormFieldProps, 'className'>,
    VariantProps<typeof formFieldVariants> {
  variant?: VariantProps<typeof formFieldVariants>['variant'];
  size?: VariantProps<typeof formFieldVariants>['size'];
  state?: VariantProps<typeof formFieldVariants>['state'];
  showRequiredIndicator?: boolean;
  helpText?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
}

// 🎯 Forward Ref Implementation
export const FormField = React.forwardRef<HTMLInputElement, EnhancedFormFieldProps>(
  (
    {
      label,
      type = 'text',
      placeholder,
      value,
      error,
      disabled = false,
      required = false,
      variant = 'default',
      size = 'default',
      state: propState,
      showRequiredIndicator = required,
      helpText,
      onChange,
      onBlur,
      className,
      inputClassName,
      labelClassName,
      errorClassName,
      ...props
    },
    ref
  ) => {
    // 🧼 Pure Logic - State Derivation
    const derivedState = React.useMemo(() => {
      if (propState) return propState;
      if (error) return 'error' as const;
      if (disabled) return 'loading' as const;
      return 'default' as const;
    }, [propState, error, disabled]);

    const fieldId = React.useMemo(
      () => props.id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`,
      [props.id, label]
    );

    // 🎨 Style Calculations
    const fieldStyles = formFieldVariants({ variant, size, state: derivedState });
    const inputStyles = inputVariants({ variant, size, state: derivedState });
    const labelStyles = labelVariants({ 
      variant, 
      size, 
      state: derivedState,
    });
    const errorStyles = errorMessageVariants({ 
      variant, 
      show: !!error,
    });

    return (
      <div className={cn(fieldStyles, className)} {...props}>
        {/* Field Label */}
        <Label 
          htmlFor={fieldId}
          className={cn(
            labelStyles,
            showRequiredIndicator && required && 'after:content-["*"] after:ml-1',
            labelClassName
          )}
        >
          {label}
        </Label>

        {/* Input Field */}
        <Input
          ref={ref}
          id={fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined}
          className={cn(inputStyles, inputClassName)}
        />

        {/* Help Text */}
        {helpText && !error && (
          <p 
            id={`${fieldId}-help`}
            className={cn(
              'mt-1 text-sm text-gray-400 transition-colors duration-200',
              {
                'text-cyan-300': variant === 'gaming',
                'text-cyan-200': variant === 'neon',
                'text-fuchsia-200': variant === 'cyber',
              }
            )}
          >
            {helpText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p 
            id={`${fieldId}-error`}
            role="alert"
            className={cn(errorStyles, errorClassName)}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// 🎯 Type Exports
export type { EnhancedFormFieldProps as FormFieldProps };
export { formFieldVariants, inputVariants, labelVariants, errorMessageVariants }; 