import { z } from 'zod';

// 🧱 Data Contracts - Authentication Schemas

// Common password requirements schema
export const passwordRequirementsSchema = z.object({
  minLength: z.number().min(6).max(128).default(8),
  requireUppercase: z.boolean().default(true),
  requireLowercase: z.boolean().default(true),
  requireNumber: z.boolean().default(true),
  requireSpecial: z.boolean().default(true),
});

// Base password validation with dynamic requirements
export const createPasswordSchema = (
  requirements = passwordRequirementsSchema.parse({})
) => {
  let schema = z
    .string()
    .min(
      requirements.minLength,
      `Password must be at least ${requirements.minLength} characters`
    );

  if (requirements.requireUppercase) {
    schema = schema.regex(
      /[A-Z]/,
      'Password must contain at least one uppercase letter'
    );
  }

  if (requirements.requireLowercase) {
    schema = schema.regex(
      /[a-z]/,
      'Password must contain at least one lowercase letter'
    );
  }

  if (requirements.requireNumber) {
    schema = schema.regex(/\d/, 'Password must contain at least one number');
  }

  if (requirements.requireSpecial) {
    schema = schema.regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    );
  }

  return schema;
};

// Login form schema
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Signup form schema
export const signupFormSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be less than 20 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens'
      ),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: createPasswordSchema(),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Forgot password form schema
export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

// Reset password form schema
export const resetPasswordFormSchema = z
  .object({
    password: createPasswordSchema(),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// OAuth provider schema
export const oauthProviderSchema = z.enum(['google', 'github', 'discord']);

// 🧱 Data Contracts - Inferred Types
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type PasswordRequirements = z.infer<typeof passwordRequirementsSchema>;

// 🧱 Data Contracts - API Response Schemas
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  auth_username: z.string().nullable(),
  provider: z.string(),
  userRole: z.enum(['user', 'admin', 'moderator']),
});

export const authErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;
