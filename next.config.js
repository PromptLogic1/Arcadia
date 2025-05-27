/** @type {import('next').NextConfig} */
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
    // Removed esmExternals: 'loose' as it's not supported in Next.js 14.2.23
  },
  env: {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID,
    REVALIDATE_TOKEN: process.env.REVALIDATE_TOKEN
  },
  // Use distDir for the build output directory
  distDir: 'dist',
  // There's no 'dir' config in Next.js - removing it
}

module.exports = nextConfig 