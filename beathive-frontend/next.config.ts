// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async rewrites() {
    return [
      // Proxy /api ke backend saat development
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
