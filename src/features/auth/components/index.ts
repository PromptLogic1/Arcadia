// 🎯 Main Component
export { SignUpForm } from './SignUpForm';
export type { SignUpFormProps } from './SignUpForm';

// 🔐 LoginForm Component and Dependencies
export { LoginForm } from './LoginForm';
export type { LoginFormProps } from './LoginForm';

// 🧼 Custom Hooks - SignUp
export { useSignUpForm } from './hooks/useSignUpForm';
export type {
  UseSignUpFormProps,
  UseSignUpFormReturn,
} from './hooks/useSignUpForm';

export { useSignUpSubmission } from './hooks/useSignUpSubmission';
export type {
  UseSignUpSubmissionProps,
  UseSignUpSubmissionReturn,
} from './hooks/useSignUpSubmission';

// 🧼 Custom Hooks - Login
export { useLoginForm } from './hooks/useLoginForm';
export type {
  UseLoginFormProps,
  UseLoginFormReturn,
  LoginFormStatus,
  LoginFormMessage,
} from './hooks/useLoginForm';

export { useLoginSubmission } from './hooks/useLoginSubmission';
export type {
  UseLoginSubmissionProps,
  UseLoginSubmissionReturn,
} from './hooks/useLoginSubmission';

// 🧩 Modular Components - SignUp
export { SignUpFormHeader } from './SignUpFormHeader';
export type { SignUpFormHeaderProps } from './SignUpFormHeader';

export { SignUpFormFields } from './SignUpFormFields';
export type { SignUpFormFieldsProps } from './SignUpFormFields';

export { SignUpOAuthSection } from './SignUpOAuthSection';
export type { SignUpOAuthSectionProps } from './SignUpOAuthSection';

export { SignUpFormFooter } from './SignUpFormFooter';
export type { SignUpFormFooterProps } from './SignUpFormFooter';

// 🧩 Modular Components - Login
export { LoginFormHeader } from './LoginFormHeader';
export type { LoginFormHeaderProps } from './LoginFormHeader';

export { LoginFormFields } from './LoginFormFields';
export type { LoginFormFieldsProps } from './LoginFormFields';

export { LoginOAuthSection } from './LoginOAuthSection';
export type { LoginOAuthSectionProps } from './LoginOAuthSection';

export { LoginFormFooter } from './LoginFormFooter';
export type { LoginFormFooterProps } from './LoginFormFooter';

// 🎨 Constants and Configuration
export {
  SIGNUP_FORM_CONFIG,
  SIGNUP_MESSAGES,
  SIGNUP_STYLES,
  SIGNUP_ANIMATIONS,
  VALIDATION_CONSTANTS,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  COMPONENT_NAMES,
  // Login constants
  LOGIN_FORM_CONFIG,
  LOGIN_MESSAGES,
  LOGIN_STYLES,
} from './constants';

// 🧱 Shared Compound Components (already exists)
export { FormField } from './form-field';
export { PasswordRequirements } from './password-requirements';
export { FormMessage } from './form-message';
