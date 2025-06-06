/**
 * Discussion/Community validation schemas
 * Used for /api/discussions routes
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

// Game types enum
export const gameTypeSchema = z.enum([
  'World of Warcraft',
  'Fortnite',
  'Minecraft',
  'Elden Ring',
  'Among Us',
  'League of Legends',
  'Apex Legends',
  'Overwatch',
  'Valorant',
  'Call of Duty',
  'Other',
]);

// Challenge types enum
export const challengeTypeSchema = z.enum([
  'speedrun',
  'achievement-hunt',
  'puzzle-quest',
  'co-op',
  'competitive',
  'creative',
  'exploration',
  'survival',
  'other',
]);

// Discussion tags
export const discussionTagSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(
    /^[a-zA-Z0-9-_]+$/,
    'Tags can only contain letters, numbers, hyphens, and underscores'
  );

// POST /api/discussions - Create discussion
export const createDiscussionRequestSchema = z.object({
  title: z.string().min(3, 'Title too short').max(200, 'Title too long'),
  content: z
    .string()
    .min(10, 'Content too short')
    .max(5000, 'Content too long'),
  game: gameTypeSchema,
  challenge_type: challengeTypeSchema.optional(),
  tags: z
    .array(discussionTagSchema)
    .max(5, 'Maximum 5 tags allowed')
    .optional(),
});

export type CreateDiscussionRequest = z.infer<
  typeof createDiscussionRequestSchema
>;

// GET /api/discussions - Query params
export const getDiscussionsQuerySchema = paginationSchema.extend({
  search: z.string().min(1).max(100).optional(),
  game: gameTypeSchema.optional(),
  challenge_type: challengeTypeSchema.optional(),
  tags: z.string().optional(), // Comma-separated tags
  sort: z.enum(['recent', 'popular', 'most_commented']).optional(),
});

export type GetDiscussionsQuery = z.infer<typeof getDiscussionsQuerySchema>;

// POST /api/discussions/[id]/comments - Add comment
export const createCommentRequestSchema = z.object({
  discussionId: uuidSchema,
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment too long'),
  parentId: uuidSchema.optional(), // For nested comments
});

export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;

// POST /api/discussions/[id]/upvote - Upvote discussion
export const upvoteDiscussionRequestSchema = z.object({
  discussionId: uuidSchema,
});

export type UpvoteDiscussionRequest = z.infer<
  typeof upvoteDiscussionRequestSchema
>;

// Response schemas
export const discussionResponseSchema = z.object({
  id: z.number(),
  user_id: uuidSchema,
  title: z.string(),
  content: z.string(),
  game: z.string(),
  challenge_type: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  upvotes: z.number(),
  comment_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  author: z
    .object({
      id: uuidSchema,
      username: z.string(),
      avatar_url: z.string().nullable(),
    })
    .optional(),
});

export type DiscussionResponse = z.infer<typeof discussionResponseSchema>;

export const commentResponseSchema = z.object({
  id: z.number(),
  discussion_id: z.number(),
  user_id: uuidSchema,
  content: z.string(),
  parent_id: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  author: z
    .object({
      id: uuidSchema,
      username: z.string(),
      avatar_url: z.string().nullable(),
    })
    .optional(),
});

export type CommentResponse = z.infer<typeof commentResponseSchema>;
