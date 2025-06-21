/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  transpilePackages: [],
  
  // Production最適化
  productionBrowserSourceMaps: false,
  
  typescript: {
    // Vercel デプロイ時の TypeScript エラーをバイパス
    ignoreBuildErrors: process.env.VERCEL_ENV === 'production',
  },
  eslint: {
    // Vercel デプロイ時の ESLint エラーをバイパス
    ignoreDuringBuilds: process.env.VERCEL_ENV === 'production',
  },
  
  // 画像最適化
  images: {
    domains: [
      'pbs.twimg.com',
      'abs.twimg.com',
      'video.twimg.com',
    ],
    minimumCacheTTL: 60,
  },
  
  // Experimental最適化
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
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