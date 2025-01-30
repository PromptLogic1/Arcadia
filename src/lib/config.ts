import { get } from '@vercel/edge-config'

export const getRuntimeConfig = async (key: string) => {
  return process.env.NODE_ENV === 'production'
    ? await get(key)
    : process.env[key]
}

// Add validation schema
import { z } from 'zod'

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
})

export const validateServerEnv = () => {
  ServerEnvSchema.parse(process.env)
} 