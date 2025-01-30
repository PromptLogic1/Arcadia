/** @type {import('next').NextConfig} */
const withVercelAnalytics = require('@vercel/analytics/next')

const nextConfig = {
  images: {
    domains: ['ui-avatars.com'], // Add any other domains you need
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    esmExternals: false,
    incrementalCacheHandlerPath: './cache-handler.js',
    isrMemoryCacheSize: 512
  },
  env: {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID
  }
}

module.exports = withVercelAnalytics(nextConfig) 