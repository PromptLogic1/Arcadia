import { type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import type { User, Session } from '@supabase/supabase-js';

// 🧱 Data Contracts - Core Form Types
export type SignUpStatus = 
  | 'idle' 
  | 'loading' 
  | 'success' 
  | 'error' 
  | 'verification_pending';

export type MessageType = 'success' | 'error' | 'info' | 'warning';

export type OAuthProvider = 'google' | 'github' | 'discord';

export type FormField = 'username' | 'email' | 'password' | 'confirmPassword';

// 🧱 Data Contracts - Validation System
export interface PasswordRequirements {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

export interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string | React.ReactNode;
  confirmPassword?: string;
  general?: string;
}

export interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PersistentFormData {
  username: string;
  email: string;
  // Note: passwords are never persisted
}

// 🧱 Data Contracts - Message System
export interface SignUpMessage {
  text: string;
  type: MessageType;
  details?: string;
  actionLabel?: string;
  actionHref?: string;
}

// 🧱 Data Contracts - Form Configuration
export interface FormConfig {
  enableLocalStorage: boolean;
  enableOAuth: boolean;
  redirectPath: string;
  redirectDelay: number;
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
  };
}

// 🧱 Data Contracts - Validation Functions
export type FieldValidator = (value: string, context?: Partial<FormData>) => string | undefined;

export interface ValidationScheme {
  username: FieldValidator;
  email: FieldValidator;
  password: FieldValidator;
  confirmPassword: FieldValidator;
}

// 🧱 Data Contracts - Event Handlers
export interface FormHandlers {
  onSubmit: (data: FormData) => Promise<void>;
  onOAuthSignUp: (provider: OAuthProvider) => Promise<void>;
  onFieldChange: (field: FormField, value: string) => void;
  onValidationError: (errors: ValidationErrors) => void;
  onStatusChange: (status: SignUpStatus) => void;
}

// 🧱 Data Contracts - Component Props
export interface SignUpFormProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit' | 'onError'> {
  config?: Partial<FormConfig>;
  initialData?: Partial<FormData>;
  onFormSubmit?: (data: FormData) => Promise<void>;
  onOAuthSignUp?: (provider: OAuthProvider) => Promise<void>;
  onSuccess?: (data: FormData) => void;
  onError?: (error: Error, context?: string) => void;
  onStatusChange?: (status: SignUpStatus) => void;
  customValidation?: Partial<ValidationScheme>;
  className?: string;
}

// 🧱 Data Contracts - Sub-component Props
export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

export interface PasswordRequirementsProps extends HTMLAttributes<HTMLDivElement> {
  requirements: PasswordRequirements;
  showTitle?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export interface FormMessageProps extends HTMLAttributes<HTMLDivElement> {
  message: SignUpMessage;
  redirectTimer?: number | null;
  onDismiss?: () => void;
  className?: string;
}

export interface OAuthButtonProps extends HTMLAttributes<HTMLButtonElement> {
  provider: OAuthProvider;
  loading?: boolean;
  disabled?: boolean;
  onSignUp: (provider: OAuthProvider) => Promise<void>;
  className?: string;
}

// 🧱 Data Contracts - Utility Types
export interface FormPersistence {
  save: (data: Partial<PersistentFormData>) => void;
  load: () => Partial<PersistentFormData> | null;
  clear: () => void;
}

export interface PasswordAnalysis {
  requirements: PasswordRequirements;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
  suggestions: string[];
}

// 🧱 Data Contracts - Service Interfaces
export interface AuthService {
  signUp: (data: FormData) => Promise<{ user: User | null; session: Session | null }>;
  signUpWithOAuth: (provider: OAuthProvider) => Promise<{ user: User | null; session: Session | null }>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  checkEmailAvailability: (email: string) => Promise<boolean>;
}

// Re-export commonly used types
export type { VariantProps }; 