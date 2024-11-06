/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
      {
        protocol: 'https',
        hostname: 'your-supabase-project.supabase.co',
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Webpack-Konfiguration für Windows
  webpack: (config) => {
    // Optimiere für Windows-Pfade
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    
    // Optimiere für Windows
    if (config.output) {
      config.output.hashFunction = 'xxhash64'
    }

    return config
  },
  // Performance Optimierungen
  experimental: {
    // Nur unterstützte experimentelle Features
    workerThreads: true,
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  // Cache-Optimierungen
  onDemandEntries: {
    // Längere Timeouts für Windows
    maxInactiveAge: 120 * 1000, // 2 Minuten
    pagesBufferLength: 3,
  },
}

module.exports = nextConfig 