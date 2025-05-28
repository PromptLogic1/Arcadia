import type {
  FormData,
  PasswordRequirements,
  PasswordAnalysis,
  ValidationErrors,
  FieldValidator,
  ValidationScheme,
  FormConfig,
} from '../types/signup-form.types';

// 🧼 Pure Functions - Password Requirements
export const checkPasswordRequirements = (
  password: string,
  config?: FormConfig['passwordRequirements']
): PasswordRequirements => {
  const requirements = config || {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  };

  return {
    uppercase: requirements.requireUppercase ? /[A-Z]/.test(password) : true,
    lowercase: requirements.requireLowercase ? /[a-z]/.test(password) : true,
    number: requirements.requireNumber ? /\d/.test(password) : true,
    special: requirements.requireSpecial ? /[!@#$%^&*(),.?":{}|<>]/.test(password) : true,
    length: password.length >= requirements.minLength,
  };
};

// 🧼 Pure Functions - Password Strength Analysis
export const analyzePasswordStrength = (
  password: string,
  config?: FormConfig['passwordRequirements']
): PasswordAnalysis => {
  const requirements = checkPasswordRequirements(password, config);
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  const totalRequirements = Object.keys(requirements).length;
  
  const score = Math.round((metRequirements / totalRequirements) * 100);
  
  let strength: PasswordAnalysis['strength'];
  if (score >= 100) strength = 'strong';
  else if (score >= 80) strength = 'good';
  else if (score >= 60) strength = 'fair';
  else strength = 'weak';

  const suggestions: string[] = [];
  if (!requirements.uppercase) suggestions.push('Add an uppercase letter');
  if (!requirements.lowercase) suggestions.push('Add a lowercase letter');
  if (!requirements.number) suggestions.push('Add a number');
  if (!requirements.special) suggestions.push('Add a special character');
  if (!requirements.length) suggestions.push(`Use at least ${config?.minLength || 8} characters`);

  return {
    requirements,
    strength,
    score,
    suggestions,
  };
};

// 🧼 Pure Functions - Field Validators
export const validateUsername: FieldValidator = (value: string): string | undefined => {
  const trimmed = value.trim();
  
  if (!trimmed) {
    return 'Username is required';
  }
  
  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  
  if (trimmed.length > 30) {
    return 'Username must be less than 30 characters';
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  
  // Check for reserved usernames
  const reservedNames = ['admin', 'administrator', 'root', 'system', 'null', 'undefined'];
  if (reservedNames.includes(trimmed.toLowerCase())) {
    return 'This username is reserved';
  }
  
  return undefined;
};

export const validateEmail: FieldValidator = (value: string): string | undefined => {
  const trimmed = value.trim();
  
  if (!trimmed) {
    return 'Email is required';
  }
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  
  if (trimmed.length > 254) {
    return 'Email address is too long';
  }
  
  return undefined;
};

export const validatePassword: FieldValidator = (value: string, context?: Partial<FormData>): string | undefined => {
  if (!value) {
    return 'Password is required';
  }
  
  const requirements = checkPasswordRequirements(value);
  const unmetRequirements = Object.entries(requirements)
    .filter(([, met]) => !met)
    .map(([requirement]) => requirement);
    
  if (unmetRequirements.length > 0) {
    return 'Password does not meet all requirements';
  }
  
  // Check against username for security
  if (context?.username && value.toLowerCase().includes(context.username.toLowerCase())) {
    return 'Password cannot contain your username';
  }
  
  // Check for common weak patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(value)) {
      return 'Password is too predictable';
    }
  }
  
  return undefined;
};

export const validateConfirmPassword: FieldValidator = (value: string, context?: Partial<FormData>): string | undefined => {
  if (!value) {
    return 'Please confirm your password';
  }
  
  if (!context?.password) {
    return 'Original password is required';
  }
  
  if (value !== context.password) {
    return 'Passwords do not match';
  }
  
  return undefined;
};

// 🧼 Pure Functions - Form Validation
export const createValidationScheme = (
  _config?: Partial<FormConfig>
): ValidationScheme => ({
  username: validateUsername,
  email: validateEmail,
  password: (value, context) => validatePassword(value, context),
  confirmPassword: validateConfirmPassword,
});

export const validateForm = (
  formData: FormData,
  customValidation?: Partial<ValidationScheme>
): ValidationErrors => {
  const validators = {
    ...createValidationScheme(),
    ...customValidation,
  };
  
  const errors: ValidationErrors = {};
  
  // Validate each field with context
  if (validators.username) {
    errors.username = validators.username(formData.username, formData);
  }
  
  if (validators.email) {
    errors.email = validators.email(formData.email, formData);
  }
  
  if (validators.password) {
    errors.password = validators.password(formData.password, formData);
  }
  
  if (validators.confirmPassword) {
    errors.confirmPassword = validators.confirmPassword(formData.confirmPassword, formData);
  }
  
  // Remove undefined errors
  Object.keys(errors).forEach(key => {
    if (errors[key as keyof ValidationErrors] === undefined) {
      delete errors[key as keyof ValidationErrors];
    }
  });
  
  return errors;
};

// 🧼 Pure Functions - Validation Helpers
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some(error => error !== undefined);
};

export const getFirstValidationError = (errors: ValidationErrors): string | undefined => {
  const firstError = Object.values(errors).find(error => error !== undefined);
  return typeof firstError === 'string' ? firstError : undefined;
};

export const isFormValid = (formData: FormData, customValidation?: Partial<ValidationScheme>): boolean => {
  const errors = validateForm(formData, customValidation);
  return !hasValidationErrors(errors);
};

// 🧼 Pure Functions - Password Requirements Display
export const getPasswordRequirementsList = (
  requirements: PasswordRequirements,
  config?: FormConfig['passwordRequirements']
): Array<{ label: string; met: boolean }> => {
  const configRequirements = config || {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  };

  const list: Array<{ label: string; met: boolean }> = [];
  
  if (configRequirements.requireUppercase) {
    list.push({ label: 'Uppercase letter', met: requirements.uppercase });
  }
  
  if (configRequirements.requireLowercase) {
    list.push({ label: 'Lowercase letter', met: requirements.lowercase });
  }
  
  if (configRequirements.requireNumber) {
    list.push({ label: 'Number', met: requirements.number });
  }
  
  if (configRequirements.requireSpecial) {
    list.push({ label: 'Special character', met: requirements.special });
  }
  
  list.push({ 
    label: `${configRequirements.minLength} characters or more`, 
    met: requirements.length 
  });
  
  return list;
}; 