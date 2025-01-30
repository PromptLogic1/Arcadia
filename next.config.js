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
    esmExternals: 'loose'
  },
  env: {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID,
    REVALIDATE_TOKEN: process.env.REVALIDATE_TOKEN
  }
}

module.exports = nextConfig 