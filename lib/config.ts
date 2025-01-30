interface RuntimeConfig {
  revalidateToken: string
  allowedPaths: string[]
  environment: string
}

export function getRuntimeConfig(): RuntimeConfig {
  // Ensure required environment variables are present
  const revalidateToken = process.env.REVALIDATE_TOKEN
  if (!revalidateToken) {
    throw new Error('REVALIDATE_TOKEN environment variable is required')
  }

  return {
    revalidateToken,
    allowedPaths: [
      '/',
      '/challenges',
      '/challenges/bingo-board'
    ],
    environment: process.env.NODE_ENV || 'development'
  }
} 