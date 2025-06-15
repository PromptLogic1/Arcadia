'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// 🎨 CVA Variant System - Unified Form Field
const formFieldVariants = cva('space-y-2', {
  variants: {
    variant: {
      default: '',
      gaming: 'relative',
      neon: 'relative',
      cyber: 'relative group',
      ghost: 'relative',
      holographic: 'relative group',
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
});

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: '',
        gaming: 'text-cyan-400',
        neon: 'text-blue-400 font-semibold',
        cyber: 'text-green-400 font-bold uppercase tracking-wide',
        ghost: 'text-muted-foreground',
        holographic: 'text-fuchsia-400 font-semibold',
      },
      state: {
        default: '',
        error: 'text-red-400',
        success: 'text-green-400',
        loading: 'text-gray-400',
      },
      required: {
        true: "after:content-['*'] after:ml-0.5 after:text-red-500",
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      state: 'default',
      required: false,
    },
  }
);

const inputVariants = cva(
  '', // Base styles come from Input component
  {
    variants: {
      variant: {
        default: '',
        gaming:
          'border-cyan-500/20 bg-slate-800/50 text-cyan-100 placeholder:text-cyan-300/50',
        neon: 'border-blue-500/30 bg-blue-950/20 text-blue-100 placeholder:text-blue-300/50 shadow-blue-500/20',
        cyber:
          'border-green-500/30 bg-black/30 text-green-100 placeholder:text-green-300/50 font-mono',
        ghost: '',
        holographic: '',
      },
      state: {
        default: '',
        error: 'border-red-500/50 bg-red-950/10 text-red-100',
        success: 'border-green-500/50 bg-green-950/10 text-green-100',
        loading: 'cursor-not-allowed opacity-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      state: 'default',
    },
  }
);

export interface FormFieldProps extends VariantProps<typeof formFieldVariants> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  loading?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  fieldType?: 'input' | 'textarea';
  children?: React.ReactNode;
}

export interface UnifiedInputProps
  extends Omit<InputProps, 'size' | 'type' | 'variant'>,
    Omit<FormFieldProps, 'fieldType'> {
  type?: React.HTMLInputTypeAttribute;
  inputVariant?: InputProps['variant'];
}

export interface UnifiedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    Omit<FormFieldProps, 'fieldType'> {}

// Unified Form Field Component
export const FormField = React.forwardRef<
  HTMLDivElement,
  FormFieldProps & { children: React.ReactNode }
>(
  (
    {
      label,
      description,
      error,
      required = false,
      loading = false,
      variant = 'default',
      size = 'default',
      state = 'default',
      className,
      labelClassName,
      children,
      ...props
    },
    ref
  ) => {
    const fieldState = error ? 'error' : loading ? 'loading' : state;

    return (
      <div
        ref={ref}
        className={cn(
          formFieldVariants({ variant, size, state: fieldState }),
          className
        )}
        {...props}
      >
        {label && (
          <Label
            className={cn(
              labelVariants({ variant, state: fieldState, required }),
              labelClassName
            )}
          >
            {label}
          </Label>
        )}
        {children}
        {description && !error && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// Unified Input Component
export const UnifiedInput = React.forwardRef<
  HTMLInputElement,
  UnifiedInputProps
>(
  (
    {
      label,
      description,
      error,
      required = false,
      loading = false,
      variant = 'default',
      size = 'default',
      state = 'default',
      className,
      labelClassName,
      inputClassName,
      inputVariant = 'default',
      ...props
    },
    ref
  ) => {
    const fieldState = error ? 'error' : loading ? 'loading' : state;

    return (
      <FormField
        label={label}
        description={description}
        error={error}
        required={required}
        loading={loading}
        variant={variant}
        size={size}
        state={fieldState}
        className={className}
        labelClassName={labelClassName}
      >
        <Input
          ref={ref}
          variant={inputVariant}
          className={cn(
            inputVariants({ variant, state: fieldState }),
            inputClassName
          )}
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={
            error ? 'error-message' : description ? 'description' : undefined
          }
          {...props}
        />
      </FormField>
    );
  }
);

UnifiedInput.displayName = 'UnifiedInput';

// Unified Textarea Component
export const UnifiedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  UnifiedTextareaProps
>(
  (
    {
      label,
      description,
      error,
      required = false,
      loading = false,
      variant = 'default',
      size = 'default',
      state = 'default',
      className,
      labelClassName,
      inputClassName,
      ...props
    },
    ref
  ) => {
    const fieldState = error ? 'error' : loading ? 'loading' : state;

    return (
      <FormField
        label={label}
        description={description}
        error={error}
        required={required}
        loading={loading}
        variant={variant}
        size={size}
        state={fieldState}
        className={className}
        labelClassName={labelClassName}
      >
        <Textarea
          ref={ref}
          className={cn(
            inputVariants({ variant, state: fieldState }),
            inputClassName
          )}
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={
            error ? 'error-message' : description ? 'description' : undefined
          }
          {...props}
        />
      </FormField>
    );
  }
);

UnifiedTextarea.displayName = 'UnifiedTextarea';

// Export for backward compatibility
export { FormField as UnifiedFormField };
