/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const rawTarget = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const apiTarget = rawTarget.replace(/\/+$/, '')
    return [
      {
        source: '/health',
        destination: `${apiTarget}/health`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
