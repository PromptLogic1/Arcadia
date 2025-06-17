import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // CRITICAL: Enable standalone output for optimized deployment
  output: 'standalone',
  // Transpile packages to ensure modern output
  transpilePackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Target modern browsers to reduce polyfills
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Enable emotion if needed for CSS-in-JS
    // emotion: true,
  },
  // Exclude specific polyfills
  excludeDefaultMomentLocales: true,
  // Optimize module IDs for better long-term caching
  productionBrowserSourceMaps: false,
  // Configure module resolution for better tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Enhanced configuration for production
    loader: 'default',
    minimumCacheTTL: 60,
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      // Development domains
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '172.28.112.1',
      },
      // External services
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placekitten.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'placehold.it',
      },
      {
        protocol: 'https',
        hostname: 'dummyimage.com',
      },
      // Supabase - keeping your existing pattern
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    // Production optimizations
    serverMinification: true,
    serverSourceMaps: false,
    // Disable webpack build worker to fix module resolution issues
    webpackBuildWorker: false,
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'zod',
      'zustand',
      'clsx',
      'tailwind-merge',
    ],
    // Enable typed routes for better type safety
    typedRoutes: true,
    // Enable CSS chunking for better performance (default but explicit)
    cssChunking: 'strict',
    // Enable Web Vitals attribution for debugging
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'TTFB', 'INP'],
    // Disable memory optimizations to fix module loading
    webpackMemoryOptimizations: false,
    // Add turbo configuration to improve development performance
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  env: {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID,
    REVALIDATE_TOKEN: process.env.REVALIDATE_TOKEN,
  },
  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // CORS Configuration - Explicit policy for API security
          {
            key: 'Access-Control-Allow-Origin',
            value:
              process.env.NODE_ENV === 'production'
                ? 'https://your-domain.com' // Replace with actual production domain
                : '*', // Allow all origins in development
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Authorization, X-Requested-With, X-Forwarded-For, X-Real-IP',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
          // CSP is handled dynamically in middleware.ts with nonces
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      // Cache static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
      // Cache images
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Simplified webpack configuration following Next.js best practices
  webpack: (config, { isServer, dev }) => {
    // Only add essential configurations
    if (!isServer) {
      // Minimal client-side fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        worker_threads: false,
        child_process: false,
      };

      // Fix module resolution to prevent "Cannot read properties of undefined" errors
      config.resolve = {
        ...config.resolve,
        // Ensure proper extension resolution order
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        // Add specific module directories
        modules: ['node_modules', ...(config.resolve.modules || [])],
        // Add alias for proper module resolution
        alias: {
          ...config.resolve.alias,
          '@': require('path').resolve(__dirname, 'src'),
        },
      };

      // Simplified optimization for module resolution
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        // Keep module concatenation for tree shaking
        concatenateModules: true,
        // Use default runtime chunk behavior to avoid issues
        runtimeChunk: false,
      };
    }

    // Handle worker files if you actually need them
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/workers/[hash][ext][query]',
      },
    });

    // Suppress Supabase realtime-js critical dependency warning
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Essential: Always return the config
    return config;
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'prompt-logic-gmbh',
  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
