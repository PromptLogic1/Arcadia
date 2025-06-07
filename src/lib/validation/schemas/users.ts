/**
 * User-related validation schemas for runtime type safety
 */

import { z } from 'zod';

// Visibility type enum
export const visibilityTypeSchema = z
  .enum(['public', 'friends', 'private'])
  .nullable();

// User role enum
export const userRoleSchema = z.enum(['user', 'moderator', 'admin']).nullable();

// User schema - matches database users table
export const userSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string().nullable(),
  username: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  land: z.string().nullable(),
  experience_points: z.number().int().nullable(),
  role: userRoleSchema,
  profile_visibility: visibilityTypeSchema,
  achievements_visibility: visibilityTypeSchema,
  submissions_visibility: visibilityTypeSchema,
  last_login_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// User settings schema
export const userSettingsSchema = z.object({
  user_id: z.string().uuid(),
  email_notifications: z.boolean().nullable(),
  game_reminders: z.boolean().nullable(),
  friend_requests: z.boolean().nullable(),
  marketing_emails: z.boolean().nullable(),
  sound_enabled: z.boolean().nullable(),
  auto_save: z.boolean().nullable(),
  visibility: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  notification_preferences: z.any().nullable(), // JSON type
});

// Array schemas
export const usersArraySchema = z.array(userSchema);

// Type exports
export type User = z.infer<typeof userSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
