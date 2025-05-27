import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Using remotePatterns instead of domains for better security
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    // Enable typed routes for better type safety
    typedRoutes: true,
  },
  env: {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID,
    REVALIDATE_TOKEN: process.env.REVALIDATE_TOKEN,
  },
  // Use distDir for the build output directory
  distDir: 'dist',
  // Enable webpack bundle analyzer in development
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }
    return config
  },
}

export default nextConfig 