import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import type { Control, FieldError, Path, FieldValues } from 'react-hook-form';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { GENERATOR_STYLES, SPACING } from './constants';
import type { GeneratorFormData } from './hooks/useGeneratorForm';
import { cn } from '@/lib/utils';

type FormFieldProps<T extends FieldValues = GeneratorFormData> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  error?: FieldError;
  className?: string;
  isValid?: boolean;
  helpText?: string;
} & (
  | {
      type: 'input';
      inputType?: 'text' | 'number' | 'email' | 'password';
      placeholder?: string;
      min?: number;
      max?: number;
    }
  | {
      type: 'select';
      options: Array<{ value: string; label: string }>;
      placeholder?: string;
    }
  | {
      type: 'checkbox';
      description?: string;
    }
);

/**
 * Enhanced FormField Component with Tailwind v4 Features
 *
 * A unified form field component that supports different input types
 * with modern v4 styling including:
 * - User validation states (user-valid/user-invalid)
 * - Touch optimization with pointer variants
 * - Enhanced visual feedback with text shadows and colored drop shadows
 * - Better semantic color usage
 * - Improved accessibility and error states
 *
 * Supports:
 * - Text/Number/Email/Password inputs
 * - Select dropdowns
 * - Checkboxes
 *
 * All fields include automatic error display, validation states, and consistent styling.
 */
export function FormField<T extends FieldValues = GeneratorFormData>(
  props: FormFieldProps<T>
) {
  const { 
    name, 
    label, 
    control, 
    error, 
    isValid = false,
    helpText,
    className = '', 
    ...fieldProps 
  } = props;

  const getValidationClasses = (hasError: boolean, isFieldValid: boolean) => {
    return cn(
      GENERATOR_STYLES.SELECT_TRIGGER,
      {
        // Error states with enhanced visual feedback
        'user-invalid:border-destructive user-invalid:ring-destructive/20 border-destructive/50 bg-destructive/5': hasError,
        // Valid states with subtle positive feedback
        'user-valid:border-green-500 user-valid:ring-green-500/20 border-green-500/30': isFieldValid && !hasError,
        // Default state
        'border-border/30 focus:border-primary/50': !hasError && !isFieldValid,
      }
    );
  };

  const renderValidationIcon = () => {
    if (error) {
      return (
        <AlertCircle className={cn(
          "h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2",
          GENERATOR_STYLES.ERROR_ICON
        )} />
      );
    }
    if (isValid && !error) {
      return (
        <CheckCircle2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500 drop-shadow-sm drop-shadow-green-500/30" />
      );
    }
    return null;
  };

  const renderField = () => {
    switch (fieldProps.type) {
      case 'input':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type={fieldProps.inputType || 'text'}
                  placeholder={fieldProps.placeholder}
                  min={fieldProps.min}
                  max={fieldProps.max}
                  className={getValidationClasses(!!error, isValid)}
                  value={field.value || ''}
                  onChange={e => {
                    const value =
                      fieldProps.inputType === 'number'
                        ? parseFloat(e.target.value) || 0
                        : e.target.value;
                    field.onChange(value);
                  }}
                />
                {renderValidationIcon()}
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={getValidationClasses(!!error, isValid)}
                  >
                    <SelectValue placeholder={fieldProps.placeholder} />
                  </SelectTrigger>
                  <SelectContent className={GENERATOR_STYLES.SELECT_CONTENT}>
                    {fieldProps.options.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={GENERATOR_STYLES.SELECT_ITEM}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderValidationIcon()}
              </div>
            )}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-start space-x-3 group">
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <Checkbox
                  id={name}
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  className={cn(
                    "touch-target mt-0.5",
                    "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
                    "hover-lift transition-all duration-200",
                    error && "border-destructive data-[state=checked]:bg-destructive"
                  )}
                />
              )}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={name}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer select-none",
                  "group-hover:text-foreground/90 transition-colors",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                  GENERATOR_STYLES.LABEL
                )}
              >
                {label}
              </label>
              {fieldProps.description && (
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {fieldProps.description}
                </span>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderHelpText = () => {
    if (helpText && !error) {
      return (
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {helpText}
        </p>
      );
    }
    return null;
  };

  const renderErrorMessage = () => {
    if (error) {
      return (
        <div className="mt-1.5 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-destructive drop-shadow-sm drop-shadow-destructive/30 flex-shrink-0" />
          <p className={cn(
            "text-xs leading-relaxed",
            GENERATOR_STYLES.ERROR_TEXT
          )}>
            {error.message}
          </p>
        </div>
      );
    }
    return null;
  };

  // For checkbox, we use a simplified layout
  if (fieldProps.type === 'checkbox') {
    return (
      <div className={cn(SPACING.FORM_GROUP, className)}>
        {renderField()}
        {renderErrorMessage()}
        {renderHelpText()}
      </div>
    );
  }

  return (
    <div className={cn(SPACING.FORM_GROUP, className)}>
      <Label 
        htmlFor={name}
        className={cn(
          GENERATOR_STYLES.LABEL,
          "cursor-pointer transition-colors",
          error && "text-destructive"
        )}
      >
        {label}
      </Label>
      {renderField()}
      {renderErrorMessage()}
      {renderHelpText()}
    </div>
  );
}
