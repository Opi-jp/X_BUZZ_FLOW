/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  typescript: {
    // Vercel デプロイ時の TypeScript エラーをバイパス
    ignoreBuildErrors: process.env.VERCEL_ENV === 'production',
  },
  eslint: {
    // Vercel デプロイ時の ESLint エラーをバイパス
    ignoreDuringBuilds: process.env.VERCEL_ENV === 'production',
  },
  images: {
    domains: [
      'pbs.twimg.com',
      'abs.twimg.com',
      'video.twimg.com',
    ],
  },
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
        ],
      },
    ]
  },
}

module.exports = nextConfig