/**
 * Submission validation schemas
 * Used for validating API requests related to code submissions
 */

import { z } from 'zod';

// Supported programming languages
export const programmingLanguageSchema = z.enum([
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
]);

// Create submission request schema
export const createSubmissionRequestSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID format'),
  code: z.string().min(1, 'Code is required').max(100000, 'Code too long'),
  language: programmingLanguageSchema,
});

// Get submissions query schema
export const getSubmissionsQuerySchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID format').optional(),
});
