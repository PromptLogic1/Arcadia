import { get } from '@vercel/edge-config';
import { z } from 'zod';

// Edge config runtime getter
export const getRuntimeConfig = async (key: string) => {
  return process.env.NODE_ENV === 'production'
    ? await get(key)
    : process.env[key];
};

// Runtime config for API routes
interface RuntimeApiConfig {
  revalidateToken: string;
  allowedPaths: string[];
  environment: string;
}

export function getApiRuntimeConfig(): RuntimeApiConfig {
  const revalidateToken = process.env.REVALIDATE_TOKEN;
  if (!revalidateToken) {
    throw new Error('REVALIDATE_TOKEN environment variable is required');
  }

  return {
    revalidateToken,
    allowedPaths: ['/', '/challenges', '/challenges/bingo-board'],
    environment: process.env.NODE_ENV || 'development',
  };
}

// Server environment validation
const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
});

export const validateServerEnv = () => {
  ServerEnvSchema.parse(process.env);
};
