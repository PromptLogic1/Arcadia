/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    workerThreads: true,
    scrollRestoration: true,
  },
  images: {
    domains: ['ui-avatars.com', 'avatars.githubusercontent.com'],
  },
}

module.exports = nextConfig 